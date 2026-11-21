
from app.schemas.expediente import (
    Documento,
    TipoDocumento,
    Legibilidad
)

from app.agents.escrituras import analizar_escrituras

documento = Documento(
    documento_id=1001,
    documento_id_ocr="TEST-ESCRITURA-001",
    tipo_documento=TipoDocumento.ESCRITURAS,
    legibilidad=Legibilidad.LEGIBLE,
    texto_ocr="""
    [PÁGINA 1]

    ESCRITURA PUBLICA NUMERO 1250.

    En la ciudad de Pachuca de Soto, Hidalgo,
    a los quince dias del mes de marzo de 2022,
    ante el Licenciado Roberto Martinez,
    Notario Publico numero 5 del Estado de Hidalgo.

    Por una parte, Juan Carlos Perez Garcia,
    quien manifiesta ser propietario del inmueble.

    Por otra parte, Maria Fernanda Lopez Ruiz,
    quien adquiere el inmueble mediante compraventa.

    Ubicado en Calle Morelos numero 25,
    Colonia Centro, Municipio de Pachuca de Soto,
    Estado de Hidalgo.

    Superficie del terreno: 250 metros cuadrados.

    Registro Publico de la Propiedad:
    Inscripcion numero 45678.
    Fecha de inscripcion: 20 de marzo de 2022.
    Folio real: 123456.
    """,
    paginas=[
        {
            "numero_pagina": 1,
            "clasificacion": "LEGIBLE",
            "texto_original": "Contenido de prueba de la página 1"
        }
    ]
)

resultado = analizar_escrituras(documento)

print("\n========== RESULTADO DEL AGENTE ==========\n")

print(resultado.model_dump_json(indent=2))
