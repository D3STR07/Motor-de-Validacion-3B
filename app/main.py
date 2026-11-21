
from fastapi import FastAPI
from app.routes import analisis
from app.database.connection import Base, engine
from app.routes import expedientes, documentos

Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="3B - Sistema de Expedientes",
    description="API de gestión documental inmobiliaria",
    version="1.0.0"
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
