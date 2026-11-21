
from fastapi import FastAPI, HTTPException

from app.schemas.expediente import Expediente
from app.graph.workflow import workflow


app = FastAPI(
    title="3B - Motor de Validación",
    description="Motor multiagente para análisis de expedientes inmobiliarios",
    version="1.0.0"
)


@app.get("/api/health")
def health():
    return {
        "status": "online",
        "service": "3B Agents Engine"
    }


@app.post("/api/agentes/analizar")
def analizar_expediente(expediente: Expediente):

    try:
        # Inicializar estado del motor
        estado_inicial = {
            "expediente": expediente,
            "resultados_agentes": [],
            "resultado_auditoria": None,
            "dictamen": None,
            "observaciones": [],
            "estado": "PROCESANDO"
        }

        # Ejecutar workflow multiagente
        resultado = workflow.invoke(estado_inicial)

        # Serializar resultados
        resultados_agentes = [
            agente.model_dump(mode="json")
            for agente in resultado["resultados_agentes"]
        ]

        return {
            "expediente_id": expediente.expediente_id,
            "estado": resultado.get("estado"),
            "resultados_agentes": resultados_agentes,
            "resultado_auditoria": resultado.get("resultado_auditoria"),
            "dictamen": resultado.get("dictamen"),
            "observaciones": resultado.get("observaciones", [])
        }

    except Exception as error:
        raise HTTPException(
            status_code=500,
            detail=f"Error ejecutando el motor de agentes: {str(error)}"
        )


