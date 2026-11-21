
from typing import TypedDict, Annotated, Optional
from operator import add

from app.schemas.expediente import Expediente
from app.schemas.resultado import ResultadoAgente


class EstadoMotor(TypedDict):

    # Expediente completo recibido desde Backend
    expediente: Expediente

    # Resultados acumulados de los agentes especialistas
    resultados_agentes: Annotated[
        list[ResultadoAgente],
        add
    ]

    # Resultado del auditor
    resultado_auditoria: Optional[dict]

    # Dictamen general del expediente
    dictamen: Optional[str]

    # Observaciones generales del procesamiento
    observaciones: Annotated[
        list[str],
        add
    ]

    # Estado actual del procesamiento
    estado: Optional[str]
