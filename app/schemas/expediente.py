
from pydantic import BaseModel, ConfigDict
from datetime import datetime


class ExpedienteCreate(BaseModel):
    nombre: str
    descripcion: str | None = None


class ExpedienteResponse(BaseModel):
    id: int
    nombre: str
    descripcion: str | None
    estado: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
