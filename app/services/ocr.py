
import os
import shutil
from pathlib import Path

import fitz
import cv2
import numpy as np
import pytesseract

from pytesseract import Output


# ==================================================
# 1. CONFIGURACIÓN
# ==================================================

IDIOMA_OCR = "spa"

RUTA_TESSERACT_WINDOWS = (
    r"C:\Program Files\Tesseract-OCR\tesseract.exe"
)

TESSERACT_CMD = os.getenv("TESSERACT_CMD")

if TESSERACT_CMD:
    pytesseract.pytesseract.tesseract_cmd = TESSERACT_CMD

elif os.name == "nt":
    pytesseract.pytesseract.tesseract_cmd = (
        RUTA_TESSERACT_WINDOWS
    )

else:
    pytesseract.pytesseract.tesseract_cmd = (
        shutil.which("tesseract") or "tesseract"
    )


# ==================================================
# 2. CONVERTIR PÁGINA PDF A IMAGEN
# ==================================================

def convertir_a_imagen(pagina):

    pix = pagina.get_pixmap(
        matrix=fitz.Matrix(3, 3),
        alpha=False
    )

    imagen_bytes = pix.tobytes("png")

    imagen_array = np.frombuffer(
        imagen_bytes,
        dtype=np.uint8
    )

    imagen = cv2.imdecode(
        imagen_array,
        cv2.IMREAD_COLOR
    )

    if imagen is None:
        raise ValueError(
            "No fue posible convertir la página PDF a imagen."
        )

    return imagen


# ==================================================
# 3. ANALIZAR CALIDAD VISUAL
# ==================================================

def analizar_calidad(imagen):

    gris = cv2.cvtColor(
        imagen,
        cv2.COLOR_BGR2GRAY
    )

    contraste = float(np.std(gris))

    _, binaria = cv2.threshold(
        gris,
        0,
        255,
        cv2.THRESH_BINARY_INV + cv2.THRESH_OTSU
    )

    proporcion_contenido = float(
        np.count_nonzero(binaria) / binaria.size
    )

    return contraste, proporcion_contenido, gris


# ==================================================
# 4. EXTRAER TEXTO DIGITAL DEL PDF
# ==================================================

def extraer_texto_nativo(pagina):

    texto = pagina.get_text("text")

    return texto.strip()


# ==================================================
# 5. EXTRAER TEXTO MEDIANTE OCR
# ==================================================

def extraer_texto_ocr(imagen_gris):

    configuracion = "--oem 3 --psm 3"

    texto = pytesseract.image_to_string(
        imagen_gris,
        lang=IDIOMA_OCR,
        config=configuracion
    )

    datos_ocr = pytesseract.image_to_data(
        imagen_gris,
        lang=IDIOMA_OCR,
        config=configuracion,
        output_type=Output.DICT
    )

    confianzas = []

    for valor in datos_ocr["conf"]:

        try:
            confianza = float(valor)

            if confianza >= 0:
                confianzas.append(confianza)

        except (ValueError, TypeError):
            continue

    confianza_promedio = (
        sum(confianzas) / len(confianzas)
        if confianzas else 0
    )

    return texto.strip(), confianza_promedio


# ==================================================
# 6. SELECCIONAR MÉTODO DE EXTRACCIÓN
# ==================================================

def extraer_texto(pagina, imagen_gris):

    texto_nativo = extraer_texto_nativo(pagina)

    if len(texto_nativo.strip()) >= 30:

        return (
            texto_nativo,
            None,
            "TEXTO_DIGITAL"
        )

    texto_ocr, confianza = extraer_texto_ocr(
        imagen_gris
    )

    return (
        texto_ocr,
        confianza,
        "OCR"
    )


# ==================================================
# 7. CLASIFICAR LEGIBILIDAD
# ==================================================

def clasificar_legibilidad(
    texto,
    confianza,
    contraste,
    proporcion_contenido,
    metodo
):

    caracteres = len(texto.strip())
    motivos = []

    if caracteres == 0:

        clasificacion = "ILEGIBLE"

        motivos.append(
            "No se pudo extraer texto de la página."
        )

    elif caracteres < 100:

        clasificacion = "PARCIALMENTE_LEGIBLE"

        motivos.append(
            "Se reconoció poco texto; "
            "la extracción puede estar incompleta."
        )

    elif (
        metodo == "OCR"
        and confianza is not None
        and confianza < 45
    ):

        clasificacion = "PARCIALMENTE_LEGIBLE"

        motivos.append(
            "La confianza promedio del reconocimiento OCR es baja."
        )

    else:

        clasificacion = "LEGIBLE"

        motivos.append(
            "Se extrajo texto suficiente de la página."
        )

    if contraste < 35:

        motivos.append(
            "La página presenta contraste visual bajo."
        )

    if proporcion_contenido < 0.02:

        motivos.append(
            "La página presenta poca proporción de contenido visual."
        )

    return clasificacion, motivos


# ==================================================
# 8. PROCESAR TODAS LAS PÁGINAS DE UN PDF
# ==================================================

def procesar_pdf(ruta_pdf):

    ruta_pdf = Path(ruta_pdf)

    if not ruta_pdf.exists():
        raise FileNotFoundError(
            f"No existe el PDF: {ruta_pdf}"
        )

    if ruta_pdf.suffix.lower() != ".pdf":
        raise ValueError(
            "El archivo proporcionado no es un PDF."
        )

    paginas_resultado = []

    with fitz.open(str(ruta_pdf)) as documento:

        if len(documento) == 0:
            raise ValueError(
                "El PDF no contiene páginas."
            )

        for numero, pagina in enumerate(
            documento,
            start=1
        ):

            imagen = convertir_a_imagen(pagina)

            contraste, proporcion, gris = analizar_calidad(
                imagen
            )

            texto, confianza, metodo = extraer_texto(
                pagina,
                gris
            )

            clasificacion, motivos = clasificar_legibilidad(
                texto,
                confianza,
                contraste,
                proporcion,
                metodo
            )

            resultado_pagina = {

                "clasificacion": clasificacion,

                "caracteres_extraidos": len(texto),

                "confianza_ocr": (
                    round(confianza, 2)
                    if confianza is not None
                    else None
                ),

                "contraste": round(contraste, 2),

                "proporcion_contenido": round(
                    proporcion,
                    4
                ),

                "motivos": motivos,

                "texto_original": texto,

                "numero_pagina": numero,

                "metodo_extraccion": metodo
            }

            paginas_resultado.append(
                resultado_pagina
            )

    return paginas_resultado


# ==================================================
# 9. CONSTRUIR JSON DEL DOCUMENTO
# ==================================================

def construir_resultado(
    ruta_pdf,
    tipo_documento,
    documento_id=None,
    archivo_original=None
):

    ruta_pdf = Path(ruta_pdf)

    paginas = procesar_pdf(ruta_pdf)

    resumen = {
        "LEGIBLE": 0,
        "PARCIALMENTE_LEGIBLE": 0,
        "ILEGIBLE": 0
    }

    for pagina in paginas:

        resumen[pagina["clasificacion"]] += 1

    if resumen["ILEGIBLE"] > 0:

        clasificacion_general = "ILEGIBLE"

    elif resumen["PARCIALMENTE_LEGIBLE"] > 0:

        clasificacion_general = "PARCIALMENTE_LEGIBLE"

    else:

        clasificacion_general = "LEGIBLE"

    datos = {

        "documento_id": (
            str(documento_id)
            if documento_id is not None
            else ruta_pdf.stem
        ),

        "archivo_original": (
            archivo_original
            if archivo_original is not None
            else ruta_pdf.name
        ),

        "tipo_documento": tipo_documento,

        "clasificacion_documento": clasificacion_general,

        "total_paginas": len(paginas),

        "resumen_legibilidad": resumen,

        "paginas": paginas
    }

    return datos


# ==================================================
# 10. FUNCIÓN PRINCIPAL PARA EL BACKEND
# ==================================================

def analizar_documento(
    ruta_pdf,
    tipo_documento,
    documento_id=None,
    archivo_original=None
):

    return construir_resultado(
        ruta_pdf=ruta_pdf,
        tipo_documento=tipo_documento,
        documento_id=documento_id,
        archivo_original=archivo_original
    )
