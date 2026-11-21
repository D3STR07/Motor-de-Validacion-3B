from fastapi import APIRouter, Depends, BackgroundTasks, HTTPException
from sqlalchemy.orm import Session

from app.database.connection import get_db
from app.database.models import Expediente, Analisis
from app.services.pipeline import procesar_expediente

router = APIRouter(
    prefix="/api/expedientes",
    tags=["Análisis"]
)


@router.post("/{expediente_id}/analizar")
async def iniciar_analisis(
    expediente_id: int,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):

    expediente = db.query(Expediente).filter(
        Expediente.id == expediente_id
    ).first()

    if not expediente:
        raise HTTPException(404, "Expediente no encontrado")

    background_tasks.add_task(
        procesar_expediente,
        expediente_id
    )

    return {
        "mensaje": "Análisis iniciado",
        "expediente_id": expediente_id,
        "estado": "EN_COLA"
    }


@router.get("/{expediente_id}/analisis")
def consultar_analisis(
    expediente_id: int,
    db: Session = Depends(get_db)
):

    analisis = db.query(Analisis).filter(
        Analisis.expediente_id == expediente_id
    ).order_by(Analisis.id.desc()).first()

    if not analisis:
        raise HTTPException(404, "No hay análisis registrado")

    return {
        "analisis_id": analisis.id,
        "expediente_id": analisis.expediente_id,
        "estado": analisis.estado,
        "dictamen": analisis.dictamen,
        "resultado": analisis.resultado_json
    }