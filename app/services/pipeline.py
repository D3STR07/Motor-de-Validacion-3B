
from datetime import datetime, timezone

from app.database.connection import SessionLocal
from app.database.models import Documento, Extraccion, Analisis
from app.schemas.ocr import DocumentoOCR
from app.services.data_client import (
    extraer_documento,
    ejecutar_agentes
)


# Normalización de los tipos documentales de Data
TIPOS_DOCUMENTALES = {
    "escrituras": "ESCRITURAS",
    "predial": "PREDIAL",
    "alineamiento": "ALINEAMIENTO",
    "uso_suelo": "USO_DE_SUELO",
    "uso_de_suelo": "USO_DE_SUELO"
}

TIPOS_REQUERIDOS = {
    "ESCRITURAS",
    "PREDIAL",
    "ALINEAMIENTO",
    "USO_DE_SUELO"
}


def normalizar_tipo_documento(tipo: str) -> str:
    tipo_normalizado = tipo.strip().lower()
    return TIPOS_DOCUMENTALES.get(tipo_normalizado, tipo)


def construir_texto_ocr(paginas: list) -> str:
    partes = []

    for pagina in paginas:
        numero = pagina["numero_pagina"]
        texto = pagina.get("texto_original", "")

        partes.append(
            f"\n--- PÁGINA {numero} ---\n{texto}"
        )

    return "\n".join(partes)


async def procesar_expediente(expediente_id: int):

    db = SessionLocal()
    analisis = None

    try:
        # 1. Obtener documentos del expediente
        documentos = (
            db.query(Documento)
            .filter(Documento.expediente_id == expediente_id)
            .all()
        )

        # 2. Crear registro del análisis
        analisis = Analisis(
            expediente_id=expediente_id,
            estado="EXTRAYENDO",
            fecha_inicio=datetime.now(timezone.utc)
        )

        db.add(analisis)
        db.commit()
        db.refresh(analisis)

        # 3. Procesar documentos mediante OCR
        for documento in documentos:

            resultado = await extraer_documento(
                documento.ruta_archivo,
                documento.id
            )

            # Validar el JSON recibido con nuestro contrato OCR
            documento_ocr = DocumentoOCR.model_validate(resultado)

            # Convertir a JSON conservando los campos adicionales
            ocr_original = documento_ocr.model_dump(mode="json")

            tipo_original = documento_ocr.tipo_documento
            tipo_normalizado = normalizar_tipo_documento(
                tipo_original
            )

            clasificacion = documento_ocr.clasificacion_documento

            # Extraer motivos de las páginas
            observaciones = []

            for pagina in documento_ocr.paginas:
                observaciones.extend(pagina.motivos)

            # Guardar la extracción completa
            extraccion = Extraccion(
                documento_id=documento.id,
                tipo_documento=tipo_normalizado,
                estado_lectura=clasificacion,
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

            documento.tipo_documento = tipo_normalizado
            documento.estado_procesamiento = "COMPLETADO"

            db.commit()

        # 4. Recuperar las extracciones del expediente
        extracciones = (
            db.query(Extraccion)
            .join(Documento)
            .filter(Documento.expediente_id == expediente_id)
            .all()
        )

        # 5. Construir los documentos para los agentes
        documentos_consolidados = []
        tipos_recibidos = set()
        documentos_pendientes_revision = []

        for extraccion in extracciones:

            ocr = extraccion.datos_extraidos

            if not isinstance(ocr, dict):
                continue

            tipo = extraccion.tipo_documento

            if tipo in TIPOS_REQUERIDOS:
                tipos_recibidos.add(tipo)

            paginas = ocr.get("paginas", [])

            texto_ocr = construir_texto_ocr(paginas)

            # Contrato provisional del motor de agentes
            documento_consolidado = {
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
            }

            documentos_consolidados.append(
                documento_consolidado
            )

            if ocr.get("clasificacion_documento") != "LEGIBLE":
                documentos_pendientes_revision.append(
                    extraccion.documento_id
                )

        # 6. Detectar documentos faltantes
        faltantes = sorted(
            TIPOS_REQUERIDOS - tipos_recibidos
        )

        expediente_consolidado = {
            "expediente_id": expediente_id,
            "documentos": documentos_consolidados,
            "documentos_faltantes": faltantes
        }

        # 7. Evitar analizar expedientes incompletos
        if faltantes:
            analisis.estado = "INCOMPLETO"
            analisis.resultado_json = {
                "mensaje": "Faltan documentos requeridos.",
                "documentos_faltantes": faltantes
            }

            analisis.fecha_fin = datetime.now(timezone.utc)
            db.commit()
            return

        # 8. Esperar revisión de documentos no legibles
        if documentos_pendientes_revision:
            analisis.estado = "REQUIERE_REVISION"
            analisis.resultado_json = {
                "mensaje": "Existen documentos que requieren revisión manual.",
                "documentos_pendientes_revision": (
                    documentos_pendientes_revision
                )
            }

            analisis.fecha_fin = datetime.now(timezone.utc)
            db.commit()
            return

        # 9. Enviar expediente completo al motor de agentes
        analisis.estado = "ANALIZANDO"
        db.commit()

        resultado_final = await ejecutar_agentes(
            expediente_consolidado
        )

        # 10. Guardar dictamen
        analisis.estado = "COMPLETADO"
        analisis.dictamen = resultado_final.get("dictamen")
        analisis.resultado_json = resultado_final
        analisis.fecha_fin = datetime.now(timezone.utc)

        db.commit()

    except Exception as error:
        db.rollback()

        if analisis:
            analisis = db.merge(analisis)
            analisis.estado = "ERROR"
            analisis.resultado_json = {
                "error": str(error)
            }
            analisis.fecha_fin = datetime.now(timezone.utc)

            db.commit()

    finally:
        db.close()
