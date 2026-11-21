
import os
from dotenv import load_dotenv
from langchain_openai import ChatOpenAI

load_dotenv()


def get_llm():
    api_key = os.getenv("LLM_API_KEY")

    if not api_key:
        raise ValueError("No se encontró LLM_API_KEY en el archivo .env")

    return ChatOpenAI(
        model=os.getenv("LLM_MODEL", "deepseek-flash"),
        api_key=api_key,
        base_url=os.getenv(
            "LLM_BASE_URL",
            "https://api.deepseek.com"
        ),
        temperature=float(os.getenv("TEMPERATURE", "0")),
        max_tokens=int(os.getenv("MAX_TOKENS", "512"))
    )
