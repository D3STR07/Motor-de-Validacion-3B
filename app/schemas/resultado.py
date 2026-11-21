
from typing import Optional
from pydantic import BaseModel, Field
from enum import Enum


class EstadoHallazgo(str, Enum):
    ENCONTRADO = "ENCONTRADO"
    NO_ENCONTRADO = "NO_ENCONTRADO"
    INCONSISTENTE = "INCONSISTENTE"
    NO_VERIFICABLE = "NO_VERIFICABLE"


class Evidencia(BaseModel):
    fragmento: Optional[str] = None
    pagina: Optional[int] = None
    fuente: str = "OCR"


class Hallazgo(BaseModel):
    campo: str
    valor: Optional[str] = None
    estado: EstadoHallazgo

    evidencia: list[Evidencia] = Field(
        default_factory=list
    )

    observaciones: list[str] = Field(
        default_factory=list
    )

    confianza: float = Field(ge=0, le=1)


class ResultadoAgente(BaseModel):
    agente: str
    documento_id: int
    documento_id_ocr: Optional[str] = None

    hallazgos: list[Hallazgo] = Field(
        default_factory=list
    )

    hallazgos_adicionales: list[Hallazgo] = Field(
        default_factory=list
    )

    observaciones: list[str] = Field(
        default_factory=list
    )

    requiere_revision: bool = False
