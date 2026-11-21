
from fastapi import (
    APIRouter, Depends, UploadFile,
    File, Form, HTTPException
)
from sqlalchemy.orm import Session
from pathlib import Path

from app.database.connection import get_db
from app.database.models import Expediente, Documento
from app.schemas.documento import DocumentoResponse
from app.services.storage import guardar_pdf

router = APIRouter(
    prefix="/api/expedientes",
    tags=["Documentos"]
)

TIPOS_VALIDOS = {
    "ESCRITURAS",
    "PREDIAL",
    "ALINEAMIENTO",
    "USO_DE_SUELO",
    "OTRO"
}


@router.post(
    "/{expediente_id}/documentos",
    response_model=DocumentoResponse
)
async def subir_documento(
    expediente_id: int,
    archivo: UploadFile = File(...),
    tipo_documento: str = Form(...),
    db: Session = Depends(get_db)
):
    expediente = db.query(Expediente).filter(
        Expediente.id == expediente_id
    ).first()

    if not expediente:
        raise HTTPException(404, "Expediente no encontrado")

    tipo_documento = tipo_documento.upper()

    if tipo_documento not in TIPOS_VALIDOS:
        raise HTTPException(400, "Tipo documental inválido")

    if archivo.content_type != "application/pdf":
        raise HTTPException(400, "Se requiere un archivo PDF")

    try:
        ruta, tamanio = await guardar_pdf(archivo)
    except ValueError as error:
        raise HTTPException(400, str(error))

    documento = Documento(
        expediente_id=expediente_id,
        nombre_archivo=Path(archivo.filename).name,
        tipo_documento=tipo_documento,
        ruta_archivo=ruta
    )

    db.add(documento)
    db.commit()
    db.refresh(documento)

    return documento


@router.get(
    "/{expediente_id}/documentos",
    response_model=list[DocumentoResponse]
)
def listar_documentos(
    expediente_id: int,
    db: Session = Depends(get_db)
):
    expediente = db.query(Expediente).filter(
        Expediente.id == expediente_id
    ).first()

    if not expediente:
        raise HTTPException(404, "Expediente no encontrado")

    return db.query(Documento).filter(
        Documento.expediente_id == expediente_id
    ).all()
