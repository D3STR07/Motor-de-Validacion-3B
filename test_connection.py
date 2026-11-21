
from app.services.llm import get_llm

def main():
    llm = get_llm()

    response = llm.invoke(
        "Responde únicamente con la palabra OK."
    )

    print("Respuesta del modelo:")
    print(response.content)


if __name__ == "__main__":
    main()
