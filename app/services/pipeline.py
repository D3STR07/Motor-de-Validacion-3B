from datetime import datetime, timezone

from app.database.connection import SessionLocal
from app.database.models import Documento, Extraccion, Analisis
from app.services.data_client import (
    extraer_documento,
    ejecutar_agentes
)


async def procesar_expediente(expediente_id: int):

    db = SessionLocal()

    try:
        # 1. Obtener documentos del expediente
        documentos = db.query(Documento).filter(
            Documento.expediente_id == expediente_id
        ).all()

        # 2. Crear registro del análisis
        analisis = Analisis(
            expediente_id=expediente_id,
            estado="EXTRAYENDO",
            fecha_inicio=datetime.now(timezone.utc)
        )

        db.add(analisis)
        db.commit()
        db.refresh(analisis)

        # 3. Primera etapa: extraer información
        for documento in documentos:

            resultado = await extraer_documento(
                documento.ruta_archivo,
                documento.id
            )

            # Guardar JSON de extracción
            extraccion = Extraccion(
                documento_id=documento.id,
                tipo_documento=resultado.get("tipo_documento"),
                estado_lectura=resultado.get("estado_lectura"),
                datos_extraidos=resultado.get("datos_extraidos"),
                evidencias=resultado.get("evidencias", []),
                observaciones=resultado.get("observaciones", [])
            )

            db.add(extraccion)

            documento.tipo_documento = resultado.get(
                "tipo_documento"
            )

            documento.estado_procesamiento = "COMPLETADO"

            db.commit()

        # 4. Recuperar todas las extracciones del expediente
        extracciones = (
            db.query(Extraccion)
            .join(Documento)
            .filter(Documento.expediente_id == expediente_id)
            .all()
        )

        # 5. Construir expediente consolidado
        documentos_consolidados = []

        tipos_requeridos = {
            "ESCRITURAS",
            "PREDIAL",
            "ALINEAMIENTO",
            "USO_DE_SUELO"
        }

        tipos_recibidos = set()

        for extraccion in extracciones:

            if extraccion.tipo_documento:
                tipos_recibidos.add(extraccion.tipo_documento)

            documentos_consolidados.append({
                "documento_id": extraccion.documento_id,
                "tipo_documento": extraccion.tipo_documento,
                "estado_lectura": extraccion.estado_lectura,
                "datos_extraidos": extraccion.datos_extraidos,
                "evidencias": extraccion.evidencias,
                "observaciones": extraccion.observaciones
            })

        faltantes = list(tipos_requeridos - tipos_recibidos)

        expediente_consolidado = {
            "expediente_id": expediente_id,
            "documentos": documentos_consolidados,
            "documentos_faltantes": faltantes
        }

        # 6. Segunda etapa: enviar información a los agentes
        analisis.estado = "ANALIZANDO"
        db.commit()

        resultado_final = await ejecutar_agentes(
            expediente_consolidado
        )

        # 7. Guardar dictamen
        analisis.estado = "COMPLETADO"
        analisis.dictamen = resultado_final.get("dictamen")
        analisis.resultado_json = resultado_final
        analisis.fecha_fin = datetime.now(timezone.utc)

        db.commit()

    except Exception as error:
        db.rollback()

        registro = db.query(Analisis).filter(
            Analisis.expediente_id == expediente_id
        ).order_by(Analisis.id.desc()).first()

        if registro:
            registro.estado = "ERROR"
            registro.resultado_json = {"error": str(error)}
            registro.fecha_fin = datetime.now(timezone.utc)
            db.commit()

    finally:
        db.close()