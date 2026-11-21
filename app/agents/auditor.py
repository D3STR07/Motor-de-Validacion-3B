
import json

from app.services.llm import get_llm


def auditar_resultados(
    resultados_agentes: list,
    documentos_faltantes: list = None
) -> dict:

    # 1. Verificar que existan resultados
    if not resultados_agentes:
        return {
            "agente": "AUDITOR",
            "dictamen": "REQUIERE_REVISION",
            "resumen": "No existen resultados de los agentes especialistas.",
            "inconsistencias": [],
            "coincidencias": [],
            "documentos_evaluados": [],
            "observaciones": [
                "No fue posible realizar la auditoría."
            ],
            "requiere_revision": True
        }

    # 2. Convertir resultados Pydantic a JSON
    resultados_json = []

    for resultado in resultados_agentes:

        if hasattr(resultado, "model_dump"):
            resultados_json.append(
                resultado.model_dump(mode="json")
            )
        else:
            resultados_json.append(resultado)

    # 3. Obtener modelo
    llm = get_llm()

    llm_json = llm.bind(
        response_format={"type": "json_object"}
    )

    # 4. Preparar información
    contenido = f"""
    RESULTADOS DE LOS AGENTES ESPECIALISTAS:

    {json.dumps(resultados_json, ensure_ascii=False, indent=2)}

    DOCUMENTOS FALTANTES:

    {json.dumps(documentos_faltantes or [], ensure_ascii=False)}

    INSTRUCCIONES:

    - Analiza los resultados de los cuatro especialistas.
    - Compara los datos de identificación del inmueble.
    - Identifica coincidencias y contradicciones.
    - Evalúa la gravedad de cada inconsistencia.
    - Identifica si los documentos podrían pertenecer a inmuebles diferentes.
    - No inventes información.
    - Utiliza las evidencias proporcionadas por los especialistas.
    - No confundas falta de información con una contradicción.
    - No declares propiedad jurídica definitiva.
    - Si falta un documento obligatorio, no emitas CUMPLE.
    """

    instrucciones_json = """
    RESPONDE EXCLUSIVAMENTE CON JSON VÁLIDO.

    ESTRUCTURA OBLIGATORIA:

    {
        "agente": "AUDITOR",
        "dictamen": "REQUIERE_REVISION",
        "resumen": "Resumen general de la auditoría.",
        "inconsistencias": [
            {
                "campo": "direccion",
                "gravedad": "ALTA",
                "documentos_involucrados": [
                    "ESCRITURAS",
                    "PREDIAL"
                ],
                "valores_encontrados": [
                    "Dirección encontrada en escrituras",
                    "Dirección encontrada en predial"
                ],
                "explicacion": "Descripción de la diferencia.",
                "evidencias": []
            }
        ],
        "coincidencias": [
            {
                "campo": "municipio",
                "valor": "Municipio identificado",
                "documentos_involucrados": [
                    "ESCRITURAS",
                    "PREDIAL"
                ]
            }
        ],
        "documentos_evaluados": [
            "ESCRITURAS",
            "PREDIAL"
        ],
        "observaciones": [],
        "requiere_revision": true
    }

    DICTÁMENES PERMITIDOS:

    CUMPLE
    REQUIERE_REVISION
    NO_CUMPLE

    GRAVEDADES PERMITIDAS:

    CRITICA
    ALTA
    MEDIA
    BAJA

    REGLAS:

    1. No inventes coincidencias ni inconsistencias.
    2. Cada inconsistencia debe tener una explicación.
    3. documentos_involucrados debe contener los agentes relacionados.
    4. valores_encontrados debe conservar los valores originales.
    5. evidencias debe contener exclusivamente evidencias proporcionadas
       por los especialistas.
    6. coincidencias debe incluir únicamente datos respaldados.
    7. documentos_evaluados debe identificar los agentes que aportaron
       resultados.
    8. observaciones siempre debe ser una lista.
    9. Si faltan documentos obligatorios, no emitas CUMPLE.
    10. Si existen inconsistencias críticas sin resolver, utiliza
        NO_CUMPLE.
    11. Si existe incertidumbre relevante, utiliza REQUIERE_REVISION.
    12. requiere_revision debe ser true cuando el dictamen no sea CUMPLE.

    No agregues texto fuera del JSON.
    """

    # 5. Ejecutar auditoría
    respuesta = llm_json.invoke([
        (
            "system",
            instrucciones_json
        ),
        (
            "human",
            contenido
        )
    ])

    datos = json.loads(respuesta.content)

    # 6. Validar estructura básica
    dictamenes_validos = [
        "CUMPLE",
        "REQUIERE_REVISION",
        "NO_CUMPLE"
    ]

    if datos.get("dictamen") not in dictamenes_validos:
        raise ValueError("El auditor devolvió un dictamen inválido.")

    if not isinstance(datos.get("inconsistencias"), list):
        raise ValueError("Las inconsistencias deben ser una lista.")

    if not isinstance(datos.get("coincidencias"), list):
        raise ValueError("Las coincidencias deben ser una lista.")

    if not isinstance(datos.get("observaciones"), list):
        raise ValueError("Las observaciones deben ser una lista.")

    # 7. Forzar revisión si faltan documentos
    if documentos_faltantes:

        if datos["dictamen"] == "CUMPLE":
            datos["dictamen"] = "REQUIERE_REVISION"

        datos["requiere_revision"] = True

        datos["observaciones"].append(
            "El expediente contiene documentos obligatorios faltantes."
        )

    # 8. Asegurar consistencia del dictamen
    if datos["dictamen"] != "CUMPLE":
        datos["requiere_revision"] = True

    # 9. Devolver resultado
    return datos
