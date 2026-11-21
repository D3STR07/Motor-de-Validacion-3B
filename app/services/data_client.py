
import os

import httpx
from dotenv import load_dotenv

load_dotenv()

AGENTS_URL = os.getenv(
    "AGENTS_API_URL",
    "http://localhost:8001/api/agentes/analizar"
)


async def ejecutar_agentes(expediente: dict):
    async with httpx.AsyncClient(timeout=300) as client:
        response = await client.post(
            AGENTS_URL,
            json=expediente
        )

        response.raise_for_status()
        return response.json()
