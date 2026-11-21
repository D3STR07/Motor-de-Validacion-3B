
from pydantic import BaseModel, ConfigDict
from datetime import datetime


class DocumentoResponse(BaseModel):
    id: int
    expediente_id: int
    nombre_archivo: str
    tipo_documento: str
    estado_procesamiento: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
