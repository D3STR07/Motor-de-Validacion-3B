
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field


class PaginaOCR(BaseModel):
    model_config = ConfigDict(extra="allow")

    clasificacion: str
    caracteres_extraidos: int = 0
    confianza_ocr: Optional[float] = None
    contraste: Optional[float] = None
    proporcion_contenido: Optional[float] = None
    motivos: list[str] = Field(default_factory=list)
    texto_original: str = ""
    numero_pagina: int


class ResumenLegibilidad(BaseModel):
    model_config = ConfigDict(extra="allow")

    LEGIBLE: int = 0
    PARCIALMENTE_LEGIBLE: int = 0
    ILEGIBLE: int = 0


class DocumentoOCR(BaseModel):
    model_config = ConfigDict(extra="allow")

    documento_id: str
    archivo_original: str
    tipo_documento: str
    clasificacion_documento: str
    total_paginas: int
    resumen_legibilidad: ResumenLegibilidad
    paginas: list[PaginaOCR] = Field(default_factory=list)
