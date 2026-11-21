
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routes import analisis, expedientes, documentos
from app.database.connection import Base, engine

Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="3B - Sistema de Expedientes",
    description="API de gestión documental inmobiliaria",
    version="1.0.0"
)

# Configuración para desarrollo del frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(expedientes.router)
app.include_router(documentos.router)
app.include_router(analisis.router)


@app.get("/api/health")
def health():
    return {
        "status": "online",
        "service": "3B Backend"
    }
