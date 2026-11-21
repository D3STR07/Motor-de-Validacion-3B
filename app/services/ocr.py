import fitz
import cv2
import numpy as np
import pytesseract
import json

from pathlib import Path
from pytesseract import Output


# ==================================================
# 1. CONFIGURACIÓN
# ==================================================

BASE_DIR = Path(__file__).resolve().parent.parent

CARPETA_DOCUMENTOS = (
    BASE_DIR / "documentos_originales"
)

CARPETA_SALIDA = BASE_DIR / "resultados"

pytesseract.pytesseract.tesseract_cmd = (
    r"C:\Program Files\Tesseract-OCR\tesseract.exe"
)

IDIOMA_OCR = "spa"


# ==================================================
# 2. IDENTIFICAR TIPO DE DOCUMENTO
# ==================================================

def obtener_tipo_documento(ruta_pdf):

    ruta_relativa = ruta_pdf.relative_to(
        CARPETA_DOCUMENTOS
    )

    if len(ruta_relativa.parts) > 1:
        return ruta_relativa.parts[0]

    return "no_clasificado"


# ==================================================
# 3. CONVERTIR PÁGINA PDF A IMAGEN
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

    return imagen


# ==================================================
# 4. ANALIZAR CALIDAD VISUAL
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
# 5. EXTRAER TEXTO DIGITAL DEL PDF
# ==================================================

def extraer_texto_nativo(pagina):

    texto = pagina.get_text("text")

    return texto.strip()


# ==================================================
# 6. EXTRAER TEXTO MEDIANTE OCR
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
# 7. SELECCIONAR MÉTODO DE EXTRACCIÓN
# ==================================================

def extraer_texto(pagina, imagen_gris):

    texto_nativo = extraer_texto_nativo(pagina)

    # Si existe suficiente texto digital,
    # se utiliza directamente PyMuPDF.

    if len(texto_nativo.strip()) >= 30:

        return (
            texto_nativo,
            None,
            "TEXTO_DIGITAL"
        )

    # Si no existe texto digital utilizable,
    # se recurre al reconocimiento OCR.

    texto_ocr, confianza = extraer_texto_ocr(
        imagen_gris
    )

    return (
        texto_ocr,
        confianza,
        "OCR"
    )


# ==================================================
# 8. CLASIFICAR LEGIBILIDAD
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
            "Se reconoció poco texto; la extracción puede estar incompleta."
        )

    elif metodo == "OCR" and confianza is not None and confianza < 45:

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
# 9. PROCESAR TODAS LAS PÁGINAS DE UN PDF
# ==================================================

def procesar_pdf(ruta_pdf):

    paginas_resultado = []

    with fitz.open(ruta_pdf) as documento:

        print("\nProcesando:", ruta_pdf.name)
        print("Total de páginas:", len(documento))

        for numero, pagina in enumerate(
            documento,
            start=1
        ):

            print(f"  Analizando página {numero}...")

            # Convertir página a imagen
            imagen = convertir_a_imagen(pagina)

            # Analizar calidad visual
            contraste, proporcion, gris = analizar_calidad(
                imagen
            )

            # Extraer texto digital u OCR
            texto, confianza, metodo = extraer_texto(
                pagina,
                gris
            )

            # Clasificar legibilidad
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

            print(
                f"  Resultado: {clasificacion} | "
                f"Método: {metodo} | "
                f"Caracteres: {len(texto)}"
            )

    return paginas_resultado


# ==================================================
# 10. GENERAR JSON DE CADA PDF
# ==================================================

def guardar_json(ruta_pdf, paginas):

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

    tipo_documento = obtener_tipo_documento(
        ruta_pdf
    )

    datos = {

        "documento_id": ruta_pdf.stem,

        "archivo_original": ruta_pdf.name,

        "tipo_documento": tipo_documento,

        "clasificacion_documento": clasificacion_general,

        "total_paginas": len(paginas),

        "resumen_legibilidad": resumen,

        "paginas": paginas
    }

    # Crear carpeta principal de resultados
    CARPETA_SALIDA.mkdir(
        parents=True,
        exist_ok=True
    )

    # Crear carpeta según categoría de origen
    carpeta_tipo = CARPETA_SALIDA / tipo_documento

    carpeta_tipo.mkdir(
        parents=True,
        exist_ok=True
    )

    ruta_json = carpeta_tipo / (
        ruta_pdf.stem + ".json"
    )

    with open(
        ruta_json,
        "w",
        encoding="utf-8"
    ) as archivo:

        json.dump(
            datos,
            archivo,
            ensure_ascii=False,
            indent=4
        )

    return datos, ruta_json


# ==================================================
# 11. MOSTRAR TEXTO COMPLETO
# ==================================================

def mostrar_texto_completo(datos):

    print("\n========================================")
    print("TEXTO COMPLETO EXTRAÍDO")
    print("========================================")

    for pagina in datos["paginas"]:

        print(
            f"\n========== PÁGINA "
            f"{pagina['numero_pagina']} ==========\n"
        )

        print(pagina["texto_original"])


# ==================================================
# 12. PROCESAR TODOS LOS PDF
# ==================================================

def main():

    if not CARPETA_DOCUMENTOS.exists():

        print("ERROR: No existe la carpeta de documentos.")
        print(CARPETA_DOCUMENTOS)
        return

    archivos_pdf = sorted(
        archivo
        for archivo in CARPETA_DOCUMENTOS.rglob("*")
        if archivo.is_file()
        and archivo.suffix.lower() == ".pdf"
    )

    if not archivos_pdf:

        print("No se encontraron archivos PDF.")
        return

    print("\nPDF encontrados:", len(archivos_pdf))

    exitosos = 0
    errores = 0

    for indice, ruta_pdf in enumerate(
        archivos_pdf,
        start=1
    ):

        print("\n----------------------------------------")
        print(f"DOCUMENTO {indice} DE {len(archivos_pdf)}")
        print("----------------------------------------")

        try:

            paginas = procesar_pdf(ruta_pdf)

            datos, ruta_json = guardar_json(
                ruta_pdf,
                paginas
            )

            exitosos += 1

            print("\nJSON generado:")
            print(ruta_json)

            print(
                "Tipo de documento:",
                datos["tipo_documento"]
            )

            print(
                "Clasificación:",
                datos["clasificacion_documento"]
            )

            mostrar_texto_completo(datos)

        except Exception as error:

            errores += 1

            print("\nERROR AL PROCESAR:", ruta_pdf.name)
            print(error)

    print("\n========================================")
    print("RESUMEN FINAL")
    print("========================================")

    print("PDF encontrados:", len(archivos_pdf))
    print("Procesados correctamente:", exitosos)
    print("Con errores:", errores)

    print("\nCarpeta de resultados:")
    print(CARPETA_SALIDA)


# ==================================================
# 13. EJECUTAR PROGRAMA
# ==================================================

if __name__ == "__main__":
    main()