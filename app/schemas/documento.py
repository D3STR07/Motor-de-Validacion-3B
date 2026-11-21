
from typing import Optional
from pydantic import BaseModel, Field
from enum import Enum


class TipoDocumento(str, Enum):
    ESCRITURAS = "escrituras"
    PREDIAL = "predial"
    ALINEAMIENTO = "alineamiento"
    USO_DE_SUELO = "uso_suelo"


class ClasificacionLegibilidad(str, Enum):
    LEGIBLE = "LEGIBLE"
    PARCIALMENTE_LEGIBLE = "PARCIALMENTE_LEGIBLE"
    ILEGIBLE = "ILEGIBLE"


class PaginaOCR(BaseModel):
    clasificacion: ClasificacionLegibilidad
    caracteres_extraidos: int = 0
    confianza_ocr: Optional[float] = None
    contraste: Optional[float] = None
    proporcion_contenido: Optional[float] = None
    motivos: list[str] = Field(default_factory=list)
    texto_original: str = ""
    numero_pagina: int


class ResumenLegibilidad(BaseModel):
    LEGIBLE: int = 0
    PARCIALMENTE_LEGIBLE: int = 0
    ILEGIBLE: int = 0


class DocumentoOCR(BaseModel):
    documento_id: str
    archivo_original: str
    tipo_documento: str
    clasificacion_documento: ClasificacionLegibilidad
    total_paginas: int
    resumen_legibilidad: ResumenLegibilidad
    paginas: list[PaginaOCR] = Field(default_factory=list)
