
from app.graph.state import EstadoMotor
from app.schemas.expediente import TipoDocumento

from app.agents.escrituras import analizar_escrituras
from app.agents.predial import analizar_predial
from app.agents.alineamiento import analizar_alineamiento
from app.agents.uso_suelo import analizar_uso_suelo
from app.agents.auditor import auditar_resultados


# =====================================================
# UTILIDAD: BUSCAR DOCUMENTO
# =====================================================

def obtener_documento(estado: EstadoMotor, tipo: TipoDocumento):

    expediente = estado["expediente"]

    for documento in expediente.documentos:
        if documento.tipo_documento == tipo:
            return documento

    return None


# =====================================================
# NODO: ESCRITURAS
# =====================================================

def nodo_escrituras(estado: EstadoMotor):

    documento = obtener_documento(
        estado,
        TipoDocumento.ESCRITURAS
    )

    if documento is None:
        return {
            "observaciones": [
                "No se encontró un documento de escrituras."
            ]
        }

    try:
        resultado = analizar_escrituras(documento)

        return {
            "resultados_agentes": [resultado]
        }

    except Exception as error:
        return {
            "observaciones": [
                f"Error en agente de escrituras: {str(error)}"
            ]
        }


# =====================================================
# NODO: PREDIAL
# =====================================================

def nodo_predial(estado: EstadoMotor):

    documento = obtener_documento(
        estado,
        TipoDocumento.PREDIAL
    )

    if documento is None:
        return {
            "observaciones": [
                "No se encontró un documento predial."
            ]
        }

    try:
        resultado = analizar_predial(documento)

        return {
            "resultados_agentes": [resultado]
        }

    except Exception as error:
        return {
            "observaciones": [
                f"Error en agente predial: {str(error)}"
            ]
        }


# =====================================================
# NODO: ALINEAMIENTO
# =====================================================

def nodo_alineamiento(estado: EstadoMotor):

    documento = obtener_documento(
        estado,
        TipoDocumento.ALINEAMIENTO
    )

    if documento is None:
        return {
            "observaciones": [
                "No se encontró un documento de alineamiento."
            ]
        }

    try:
        resultado = analizar_alineamiento(documento)

        return {
            "resultados_agentes": [resultado]
        }

    except Exception as error:
        return {
            "observaciones": [
                f"Error en agente de alineamiento: {str(error)}"
            ]
        }


# =====================================================
# NODO: USO DE SUELO
# =====================================================

def nodo_uso_suelo(estado: EstadoMotor):

    documento = obtener_documento(
        estado,
        TipoDocumento.USO_DE_SUELO
    )

    if documento is None:
        return {
            "observaciones": [
                "No se encontró un documento de uso de suelo."
            ]
        }

    try:
        resultado = analizar_uso_suelo(documento)

        return {
            "resultados_agentes": [resultado]
        }

    except Exception as error:
        return {
            "observaciones": [
                f"Error en agente de uso de suelo: {str(error)}"
            ]
        }


# =====================================================
# NODO: AUDITOR
# =====================================================


def nodo_auditor(estado: EstadoMotor):

    resultados = estado["resultados_agentes"]

    agentes_esperados = [
        "ESCRITURAS",
        "PREDIAL",
        "ALINEAMIENTO",
        "USO_DE_SUELO"
    ]

    agentes_ejecutados = [
        resultado.agente
        for resultado in resultados
    ]

    agentes_faltantes = [
        agente
        for agente in agentes_esperados
        if agente not in agentes_ejecutados
    ]

    # Unificar documentos faltantes y evitar duplicados
    documentos_faltantes = []
    vistos = set()

    faltantes_originales = (
        estado["expediente"].documentos_faltantes
        + agentes_faltantes
    )

    for documento in faltantes_originales:
        clave = documento.strip().upper()

        if clave not in vistos:
            documentos_faltantes.append(documento)
            vistos.add(clave)

    try:
        resultado = auditar_resultados(
            resultados_agentes=resultados,
            documentos_faltantes=documentos_faltantes
        )

        return {
            "resultado_auditoria": resultado,
            "dictamen": resultado["dictamen"],
            "estado": "FINALIZADO",
            "observaciones": resultado.get("observaciones", [])
        }

    except Exception as error:

        return {
            "resultado_auditoria": {
                "agente": "AUDITOR",
                "dictamen": "REQUIERE_REVISION",
                "resumen": "No fue posible completar la auditoría.",
                "inconsistencias": [],
                "coincidencias": [],
                "documentos_evaluados": agentes_ejecutados,
                "observaciones": [
                    f"Error durante la auditoría: {str(error)}"
                ],
                "requiere_revision": True
            },
            "dictamen": "REQUIERE_REVISION",
            "estado": "ERROR_AUDITORIA",
            "observaciones": [
                f"Error durante la auditoría: {str(error)}"
            ]
        }
