
from datetime import datetime, timezone

from app.database.connection import SessionLocal
from app.database.models import Documento, Extraccion, Analisis
from app.schemas.ocr import DocumentoOCR
from app.services.ocr import analizar_documento
from app.services.data_client import ejecutar_agentes


TIPOS_DOCUMENTALES = {
    "escrituras": "ESCRITURAS",
    "escritura": "ESCRITURAS",
    "predial": "PREDIAL",
    "alineamiento": "ALINEAMIENTO",
    "uso_suelo": "USO_DE_SUELO",
    "uso_de_suelo": "USO_DE_SUELO",
    "uso_del_suelo": "USO_DE_SUELO",
}

TIPOS_REQUERIDOS = {
    "ESCRITURAS",
    "PREDIAL",
    "ALINEAMIENTO",
    "USO_DE_SUELO",
}


def normalizar_tipo_documento(tipo: str) -> str:
    clave = tipo.strip().lower().replace(" ", "_")

    if clave not in TIPOS_DOCUMENTALES:
        raise ValueError(f"Tipo de documento no reconocido: {tipo}")

    return TIPOS_DOCUMENTALES[clave]


def construir_texto_ocr(paginas: list) -> str:
    partes = []

    for pagina in paginas:
        numero = pagina.get("numero_pagina", "?")
        texto = pagina.get("texto_original", "")

        partes.append(
            f"\n--- PÁGINA {numero} ---\n{texto}"
        )

    return "\n".join(partes)


async def procesar_expediente(expediente_id: int):

    db = SessionLocal()
    analisis_id = None

    try:
        # 1. Obtener documentos actuales
        documentos = (
            db.query(Documento)
            .filter(Documento.expediente_id == expediente_id)
            .all()
        )

        # 2. Crear análisis
        analisis = Analisis(
            expediente_id=expediente_id,
            estado="EXTRAYENDO",
            fecha_inicio=datetime.now(timezone.utc)
        )

        db.add(analisis)
        db.commit()
        db.refresh(analisis)

        analisis_id = analisis.id

        # 3. Procesar cada PDF con OCR local
        extracciones_actuales = []

        for documento in documentos:

            tipo = normalizar_tipo_documento(
                documento.tipo_documento
            )

            resultado = analizar_documento(
                ruta_pdf=documento.ruta_archivo,
                tipo_documento=tipo.lower(),
                documento_id=documento.id,
                archivo_original=documento.nombre_archivo
            )

            documento_ocr = DocumentoOCR.model_validate(resultado)
            ocr_original = documento_ocr.model_dump(mode="json")

            observaciones = []

            for pagina in documento_ocr.paginas:
                observaciones.extend(pagina.motivos)

            extraccion = Extraccion(
                documento_id=documento.id,
                tipo_documento=tipo,
                estado_lectura=documento_ocr.clasificacion_documento,
                datos_extraidos=ocr_original,
                evidencias=[
                    {
                        "numero_pagina": pagina.numero_pagina,
                        "clasificacion": pagina.clasificacion,
                        "confianza_ocr": pagina.confianza_ocr,
                        "motivos": pagina.motivos
                    }
                    for pagina in documento_ocr.paginas
                ],
                observaciones=observaciones
            )

            db.add(extraccion)

            documento.tipo_documento = tipo
            documento.estado_procesamiento = "COMPLETADO"

            db.commit()
            db.refresh(extraccion)

            extracciones_actuales.append(extraccion)

        # 4. Consolidar únicamente las extracciones recién generadas
        documentos_consolidados = []
        tipos_recibidos = set()
        documentos_pendientes_revision = []

        for extraccion in extracciones_actuales:

            ocr = extraccion.datos_extraidos
            tipo = extraccion.tipo_documento

            tipos_recibidos.add(tipo)

            paginas = ocr.get("paginas", [])
            texto_ocr = construir_texto_ocr(paginas)

            documentos_consolidados.append({
                "documento_id": extraccion.documento_id,
                "documento_id_ocr": ocr.get("documento_id"),
                "tipo_documento": tipo,
                "legibilidad": ocr.get(
                    "clasificacion_documento"
                ),
                "texto_ocr": texto_ocr,
                "paginas": paginas,
                "ocr_original": ocr,
                "datos_corregidos": None
            })

            if ocr.get("clasificacion_documento") != "LEGIBLE":
                documentos_pendientes_revision.append(
                    extraccion.documento_id
                )

        # 5. Detectar documentos faltantes
        faltantes = sorted(
            TIPOS_REQUERIDOS - tipos_recibidos
        )

        expediente_consolidado = {
            "expediente_id": expediente_id,
            "documentos": documentos_consolidados,
            "documentos_faltantes": faltantes
        }

        # 6. No analizar expedientes incompletos
        if faltantes:
            analisis.estado = "INCOMPLETO"
            analisis.resultado_json = {
                "mensaje": "Faltan documentos requeridos.",
                "documentos_faltantes": faltantes
            }

            analisis.fecha_fin = datetime.now(timezone.utc)
            db.commit()

            return analisis.resultado_json

        # 7. Esperar revisión de documentos no legibles
        if documentos_pendientes_revision:
            analisis.estado = "REQUIERE_REVISION"
            analisis.resultado_json = {
                "mensaje": (
                    "Existen documentos que requieren revisión manual."
                ),
                "documentos_pendientes_revision": (
                    documentos_pendientes_revision
                )
            }

            analisis.fecha_fin = datetime.now(timezone.utc)
            db.commit()

            return analisis.resultado_json

        # 8. Ejecutar motor multiagente
        analisis.estado = "ANALIZANDO"
        db.commit()

        resultado_final = await ejecutar_agentes(
            expediente_consolidado
        )

        # 9. Guardar dictamen y resultados
        analisis.estado = "COMPLETADO"
        analisis.dictamen = resultado_final.get("dictamen")
        analisis.resultado_json = resultado_final
        analisis.fecha_fin = datetime.now(timezone.utc)

        db.commit()

        return resultado_final

    except Exception as error:
        db.rollback()

        if analisis_id is not None:
            analisis = (
                db.query(Analisis)
                .filter(Analisis.id == analisis_id)
                .first()
            )

            if analisis:
                analisis.estado = "ERROR"
                analisis.resultado_json = {
                    "error": str(error)
                }
                analisis.fecha_fin = datetime.now(timezone.utc)
                db.commit()

        return {
            "estado": "ERROR",
            "error": str(error)
        }

    finally:
        db.close()
