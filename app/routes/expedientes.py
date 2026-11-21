
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database.connection import get_db
from app.database.models import Expediente
from app.schemas.expediente import (
    ExpedienteCreate,
    ExpedienteResponse
)

router = APIRouter(
    prefix="/api/expedientes",
    tags=["Expedientes"]
)


@router.post("/", response_model=ExpedienteResponse)
def crear_expediente(
    datos: ExpedienteCreate,
    db: Session = Depends(get_db)
):
    expediente = Expediente(
        nombre=datos.nombre,
        descripcion=datos.descripcion
    )

    db.add(expediente)
    db.commit()
    db.refresh(expediente)

    return expediente


@router.get("/", response_model=list[ExpedienteResponse])
def listar_expedientes(
    db: Session = Depends(get_db)
):
    return db.query(Expediente).all()


@router.get("/{expediente_id}")
def obtener_expediente(
    expediente_id: int,
    db: Session = Depends(get_db)
):
    expediente = db.query(Expediente).filter(
        Expediente.id == expediente_id
    ).first()

    if not expediente:
        raise HTTPException(
            status_code=404,
            detail="Expediente no encontrado"
        )

    return expediente


@router.delete("/{expediente_id}")
def eliminar_expediente(
    expediente_id: int,
    db: Session = Depends(get_db)
):
    expediente = db.query(Expediente).filter(
        Expediente.id == expediente_id
    ).first()

    if not expediente:
        raise HTTPException(
            status_code=404,
            detail="Expediente no encontrado"
        )

    db.delete(expediente)
    db.commit()

    return {"mensaje": "Expediente eliminado"}
