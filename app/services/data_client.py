import os
import httpx
from dotenv import load_dotenv
import os

load_dotenv()

DATA_URL = os.getenv("DATA_API_URL", "http://localhost:9000")


async def extraer_documento(archivo_path: str, documento_id: int):
    url = f"{DATA_URL}/extraccion"

    async with httpx.AsyncClient(timeout=180) as client:
        with open(archivo_path, "rb") as archivo:
            response = await client.post(
                url,
                data={"documento_id": documento_id},
                files={
                    "archivo": (
                        os.path.basename(archivo_path),
                        archivo,
                        "application/pdf"
                    )
                }
            )

        response.raise_for_status()
        return response.json()


async def ejecutar_agentes(expediente: dict):
    url = f"{DATA_URL}/agentes"

    async with httpx.AsyncClient(timeout=300) as client:
        response = await client.post(url, json=expediente)

        response.raise_for_status()
        return response.json()