
from pathlib import Path
from uuid import uuid4

STORAGE_DIR = Path("storage/documentos")
STORAGE_DIR.mkdir(parents=True, exist_ok=True)


async def guardar_pdf(archivo):
    extension = Path(archivo.filename).suffix.lower()

    if extension != ".pdf":
        raise ValueError("Solamente se permiten archivos PDF")

    nombre_unico = f"{uuid4().hex}.pdf"

    ruta = STORAGE_DIR / nombre_unico

    contenido = await archivo.read()

    if not contenido.startswith(b"%PDF-"):
        raise ValueError("El archivo no parece ser un PDF válido")

    if len(contenido) > 25 * 1024 * 1024:
        raise ValueError("El PDF supera el límite de 25 MB")

    ruta.write_bytes(contenido)

    return str(ruta), len(contenido)
