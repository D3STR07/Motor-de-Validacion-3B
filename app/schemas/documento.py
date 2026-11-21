
from typing import Optional
from datetime import datetime

from pydantic import BaseModel, Field, ConfigDict
from enum import Enum


# =====================================================
# TIPOS DE DOCUMENTO
# =====================================================

class TipoDocumento(str, Enum):
    ESCRITURAS = "escrituras"
    PREDIAL = "predial"
    ALINEAMIENTO = "alineamiento"
    USO_DE_SUELO = "uso_suelo"


# =====================================================
# LEGIBILIDAD OCR
# =====================================================

class ClasificacionLegibilidad(str, Enum):
    LEGIBLE = "LEGIBLE"
    PARCIALMENTE_LEGIBLE = "PARCIALMENTE_LEGIBLE"
    ILEGIBLE = "ILEGIBLE"


# =====================================================
# MODELOS OCR
# =====================================================

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


# =====================================================
# RESPUESTA DEL BACKEND
# =====================================================

class DocumentoResponse(BaseModel):
    id: int
    expediente_id: int
    nombre_archivo: str
    tipo_documento: str
    estado_procesamiento: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
