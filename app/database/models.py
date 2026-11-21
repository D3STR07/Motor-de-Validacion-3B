
from sqlalchemy import (
    Column, Integer, String, DateTime,
    ForeignKey, Text, JSON
)
from sqlalchemy.orm import relationship
from datetime import datetime, timezone

from app.database.connection import Base



class Expediente(Base):
    __tablename__ = "expedientes"

    id = Column(Integer, primary_key=True, index=True)

    nombre = Column(String(150), nullable=False)

    descripcion = Column(Text, nullable=True)

    estado = Column(
        String(50),
        default="CREADO",
        nullable=False
    )

    created_at = Column(
        DateTime,
        default=datetime.utcnow
    )

    documentos = relationship(
        "Documento",
        back_populates="expediente",
        cascade="all, delete-orphan"
    )


class Documento(Base):
    __tablename__ = "documentos"

    id = Column(Integer, primary_key=True, index=True)

    expediente_id = Column(
        Integer,
        ForeignKey("expedientes.id"),
        nullable=False
    )

    nombre_archivo = Column(String(255), nullable=False)

    tipo_documento = Column(String(50), nullable=False)

    ruta_archivo = Column(String(500), nullable=False)

    estado_procesamiento = Column(
        String(50),
        default="PENDIENTE"
    )

    created_at = Column(
        DateTime,
        default=datetime.utcnow
    )

    expediente = relationship(
        "Expediente",
        back_populates="documentos"
    )


class Extraccion(Base):
    __tablename__ = "extracciones"

    id = Column(Integer, primary_key=True, index=True)
    documento_id = Column(Integer, ForeignKey("documentos.id"), nullable=False)
    tipo_documento = Column(String, nullable=True)
    estado_lectura = Column(String, default="PENDIENTE")
    datos_extraidos = Column(JSON, nullable=True)
    evidencias = Column(JSON, nullable=True)
    observaciones = Column(JSON, nullable=True)
    fecha = Column(DateTime, default=lambda: datetime.now(timezone.utc))


class Analisis(Base):
    __tablename__ = "analisis"

    id = Column(Integer, primary_key=True, index=True)
    expediente_id = Column(Integer, ForeignKey("expedientes.id"), nullable=False)
    estado = Column(String, default="PENDIENTE")
    dictamen = Column(String, nullable=True)
    resultado_json = Column(JSON, nullable=True)
    fecha_inicio = Column(DateTime, nullable=True)
    fecha_fin = Column(DateTime, nullable=True)