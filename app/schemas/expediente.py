
from typing import Optional
from pydantic import BaseModel, Field
from enum import Enum


class TipoDocumento(str, Enum):
    ESCRITURAS = "ESCRITURAS"
    PREDIAL = "PREDIAL"
    ALINEAMIENTO = "ALINEAMIENTO"
    USO_DE_SUELO = "USO_DE_SUELO"


class Legibilidad(str, Enum):
    LEGIBLE = "LEGIBLE"
    PARCIALMENTE_LEGIBLE = "PARCIALMENTE_LEGIBLE"
    REQUIERE_APOYO = "REQUIERE_APOYO"
    ILEGIBLE = "ILEGIBLE"


class Documento(BaseModel):
    documento_id: int
    documento_id_ocr: Optional[str] = None

    tipo_documento: TipoDocumento
    legibilidad: Legibilidad

    texto_ocr: str = ""

    paginas: list[dict] = Field(default_factory=list)

    ocr_original: dict = Field(default_factory=dict)

    datos_corregidos: Optional[dict] = None


class Expediente(BaseModel):
    expediente_id: int

    documentos: list[Documento] = Field(
        default_factory=list
    )

    documentos_faltantes: list[str] = Field(
        default_factory=list
    )
