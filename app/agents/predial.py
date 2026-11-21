
import json
from pathlib import Path

from app.services.llm import get_llm

from app.schemas.expediente import (
    Documento,
    TipoDocumento,
    Legibilidad
)

from app.schemas.resultado import (
    ResultadoAgente,
    EstadoHallazgo
)


PROMPT_PATH = (
    Path(__file__).resolve().parents[1]
    / "prompts"
    / "predial.txt"
)


def cargar_prompt():
    return PROMPT_PATH.read_text(encoding="utf-8")


def analizar_predial(documento: Documento) -> ResultadoAgente:

    # 1. Validar tipo documental
    if documento.tipo_documento != TipoDocumento.PREDIAL:
        raise ValueError(
            "El agente recibió un documento que no es un predial."
        )

    # 2. Validar legibilidad
    if documento.legibilidad == Legibilidad.ILEGIBLE:
        raise ValueError(
            "No se puede analizar un predial declarado ilegible."
        )

    if not documento.texto_ocr.strip():
        raise ValueError(
            "El documento no contiene texto OCR."
        )

    # 3. Obtener modelo
    llm = get_llm()

    llm_json = llm.bind(
        response_format={"type": "json_object"}
    )

    # 4. Cargar prompt
    prompt_sistema = cargar_prompt()

    contenido = f"""
    Analiza el siguiente documento predial.

    ID INTERNO:
    {documento.documento_id}

    ID OCR:
    {documento.documento_id_ocr}

    LEGIBILIDAD:
    {documento.legibilidad.value}

    TEXTO OCR ORIGINAL:
    {documento.texto_ocr}

    DATOS CORREGIDOS MANUALMENTE:
    {documento.datos_corregidos or "No existen datos corregidos."}

    IMPORTANTE:
    - Identifica la fuente de cada evidencia.
    - Las correcciones manuales no son evidencia documental original.
    - Si una corrección contradice el OCR, registra la inconsistencia.
    - No inventes páginas ni fragmentos.
    - Distingue contribuyente de propietario.
    - Distingue cuenta predial de clave catastral.
    - No confundas importe del impuesto con valor catastral.
    - No asumas que el recibo está pagado sin evidencia.
    - Registra los datos faltantes como NO_ENCONTRADO o NO_VERIFICABLE.
    - Incluye hallazgos adicionales relevantes.
    """

    instrucciones_json = """
    RESPONDE EXCLUSIVAMENTE CON JSON VÁLIDO.

    ESTRUCTURA:

    {
        "agente": "PREDIAL",
        "documento_id": 1001,
        "documento_id_ocr": null,
        "hallazgos": [],
        "hallazgos_adicionales": [],
        "observaciones": [],
        "requiere_revision": false
    }

    Cada hallazgo debe contener:

    {
        "campo": "cuenta_predial",
        "valor": "123456789",
        "estado": "ENCONTRADO",
        "evidencia": [
            {
                "fragmento": "Texto exacto del documento",
                "pagina": 1,
                "fuente": "OCR"
            }
        ],
        "observaciones": [],
        "confianza": 0.95
    }

    REGLAS:

    1. evidencia siempre es una lista.
    2. observaciones siempre es una lista de textos.
    3. confianza es un número entre 0 y 1.
    4. pagina es un entero o null.
    5. fragmento es un texto o null.
    6. valor es un texto o null.
    7. documento_id debe ser el ID interno recibido.
    8. documento_id_ocr debe ser el identificador OCR recibido.
    9. No inventes información, páginas ni fragmentos.
    10. Utiliza hallazgos_adicionales para datos relevantes
        que no encajen en los campos principales.

    ESTADOS PERMITIDOS:
    ENCONTRADO
    NO_ENCONTRADO
    INCONSISTENTE
    NO_VERIFICABLE
    """

    # 5. Ejecutar análisis
    respuesta = llm_json.invoke([
        ("system", prompt_sistema + instrucciones_json),
        ("human", contenido)
    ])

    datos = json.loads(respuesta.content)

    # 6. Validar resultado con Pydantic
    resultado = ResultadoAgente.model_validate(datos)

    # 7. Obtener todos los hallazgos
    todos_los_hallazgos = (
        resultado.hallazgos +
        resultado.hallazgos_adicionales
    )

    # 8. Determinar necesidad de revisión
    requiere_revision = (
        resultado.requiere_revision

        or documento.legibilidad in [
            Legibilidad.REQUIERE_APOYO,
            Legibilidad.PARCIALMENTE_LEGIBLE
        ]

        or any(
            hallazgo.estado in [
                EstadoHallazgo.INCONSISTENTE,
                EstadoHallazgo.NO_VERIFICABLE
            ]
            for hallazgo in todos_los_hallazgos
        )

        or any(
            hallazgo.estado == EstadoHallazgo.NO_ENCONTRADO
            for hallazgo in resultado.hallazgos
        )
    )

    # 9. Construir resultado definitivo
    return ResultadoAgente(
        agente="PREDIAL",
        documento_id=documento.documento_id,
        documento_id_ocr=documento.documento_id_ocr,
        hallazgos=resultado.hallazgos,
        hallazgos_adicionales=resultado.hallazgos_adicionales,
        observaciones=resultado.observaciones,
        requiere_revision=requiere_revision
    )
