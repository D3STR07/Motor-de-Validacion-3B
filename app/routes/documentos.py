
from fastapi import (
    APIRouter,
    Depends,
    UploadFile,
    File,
    Form,
    HTTPException
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


# =====================================================
# VALIDACIONES COMPARTIDAS
# =====================================================

def validar_expediente(expediente_id: int, db: Session):
    expediente = db.query(Expediente).filter(
        Expediente.id == expediente_id
    ).first()

    if not expediente:
        raise HTTPException(
            status_code=404,
            detail="Expediente no encontrado"
        )

    return expediente


def validar_tipo(tipo_documento: str):
    tipo_documento = tipo_documento.upper().strip()

    if tipo_documento not in TIPOS_VALIDOS:
        raise HTTPException(
            status_code=400,
            detail="Tipo documental inválido"
        )

    return tipo_documento


def validar_archivo(archivo: UploadFile):
    if not archivo.filename:
        raise HTTPException(
            status_code=400,
            detail="El archivo no tiene nombre"
        )

    if archivo.content_type != "application/pdf":
        raise HTTPException(
            status_code=400,
            detail=f"El archivo {archivo.filename} no es un PDF válido"
        )


# =====================================================
# 1. SUBIR UN DOCUMENTO
# =====================================================

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
    validar_expediente(expediente_id, db)

    tipo_documento = validar_tipo(tipo_documento)
    validar_archivo(archivo)

    try:
        ruta, tamanio = await guardar_pdf(archivo)

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

    except ValueError as error:
        db.rollback()
        raise HTTPException(400, str(error))

    except Exception:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail="Error al guardar el documento"
        )


# =====================================================
# 2. SUBIR MULTIPLES DOCUMENTOS
# =====================================================

@router.post(
    "/{expediente_id}/documentos/multiples",
    response_model=list[DocumentoResponse]
)
async def subir_documentos_multiples(
    expediente_id: int,
    archivos: list[UploadFile] = File(...),
    tipo_documento: str = Form(...),
    db: Session = Depends(get_db)
):
    validar_expediente(expediente_id, db)

    tipo_documento = validar_tipo(tipo_documento)

    if not archivos:
        raise HTTPException(
            status_code=400,
            detail="Debes enviar al menos un archivo"
        )

    # Validar todos los archivos antes de comenzar
    for archivo in archivos:
        validar_archivo(archivo)

    documentos_creados = []

    try:
        for archivo in archivos:

            ruta, tamanio = await guardar_pdf(archivo)

            documento = Documento(
                expediente_id=expediente_id,
                nombre_archivo=Path(archivo.filename).name,
                tipo_documento=tipo_documento,
                ruta_archivo=ruta
            )

            db.add(documento)
            documentos_creados.append(documento)

        # Una sola transacción para los registros
        db.commit()

        for documento in documentos_creados:
            db.refresh(documento)

        return documentos_creados

    except ValueError as error:
        db.rollback()
        raise HTTPException(400, str(error))

    except Exception:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail="Error al procesar los documentos"
        )


# =====================================================
# 3. LISTAR DOCUMENTOS DEL EXPEDIENTE
# =====================================================

@router.get(
    "/{expediente_id}/documentos",
    response_model=list[DocumentoResponse]
)
def listar_documentos(
    expediente_id: int,
    db: Session = Depends(get_db)
):
    validar_expediente(expediente_id, db)

    return db.query(Documento).filter(
        Documento.expediente_id == expediente_id
    ).all()
