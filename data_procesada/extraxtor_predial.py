
from pathlib import Path
import fitz
import cv2
import numpy as np
import json

# ==========================================
# 1. CONFIGURACIÓN
# ==========================================

BASE_DIR = Path(__file__).resolve().parent.parent

CARPETA_ENTRADA = BASE_DIR / "documentos_originales" / "predial"
CARPETA_SALIDA = BASE_DIR / "resultados" / "predial"

CARPETA_SALIDA.mkdir(parents=True, exist_ok=True)


# ==========================================
# 2. CONVERTIR PDF A IMAGEN
# ==========================================

def convertir_a_imagen(pagina):

    pix = pagina.get_pixmap(
        matrix=fitz.Matrix(2, 2),
        colorspace=fitz.csGRAY,
        alpha=False
    )

    imagen = np.frombuffer(
        pix.samples,
        dtype=np.uint8
    )

    imagen = imagen.reshape(
        pix.height,
        pix.width
    )

    return imagen


# ==========================================
# 3. ANALIZAR CALIDAD CON OPENCV
# ==========================================

def analizar_calidad(imagen):

    # Indicador 1: desenfoque
    laplaciano = cv2.Laplacian(
        imagen,
        cv2.CV_64F
    )

    nivel_enfoque = laplaciano.var()

    # Indicador 2: contraste
    contraste = imagen.std()

    # Indicador 3: proporción de píxeles oscuros
    pixeles_oscuros = np.sum(imagen < 200)

    total_pixeles = imagen.size

    proporcion_tinta = (
        pixeles_oscuros / total_pixeles
    )

    # Indicador 4: distribución local de contenido
    alto, ancho = imagen.shape

    regiones_con_contenido = 0
    total_regiones = 0

    filas = 4
    columnas = 4

    for i in range(filas):

        for j in range(columnas):

            y1 = i * alto // filas
            y2 = (i + 1) * alto // filas

            x1 = j * ancho // columnas
            x2 = (j + 1) * ancho // columnas

            region = imagen[y1:y2, x1:x2]

            proporcion_oscura = np.mean(region < 200)

            if proporcion_oscura > 0.005:
                regiones_con_contenido += 1

            total_regiones += 1

    cobertura_visual = (
        regiones_con_contenido / total_regiones
    )

    return {
        "nivel_enfoque": round(float(nivel_enfoque), 2),
        "contraste": round(float(contraste), 2),
        "proporcion_tinta": round(float(proporcion_tinta), 4),
        "cobertura_visual": round(float(cobertura_visual), 2)
    }


# ==========================================
# 4. CLASIFICAR LEGIBILIDAD
# ==========================================



def clasificar_legibilidad(imagen, pagina):

    metricas = analizar_calidad(imagen)

    texto = pagina.get_text("text", sort=True).strip()

    enfoque = metricas["nivel_enfoque"]
    contraste = metricas["contraste"]
    tinta = metricas["proporcion_tinta"]

    motivos = []

    # Comprobar si existe contenido visual
    if tinta < 0.001:

        clasificacion = "ILEGIBLE"

        motivos.append("No se detecta contenido visual suficiente.")

    # Evaluar nitidez
    elif enfoque < 20:

        clasificacion = "ILEGIBLE"

        motivos.append(
            "Desenfoque severo: los detalles de la imagen "
            "no presentan suficiente nitidez."
        )

    elif enfoque < 80:

        clasificacion = "PARCIALMENTE LEGIBLE"

        motivos.append(
            "La imagen presenta una nitidez reducida."
        )

    else:

        clasificacion = "LEGIBLE"

        motivos.append(
            "La imagen presenta una nitidez aparentemente adecuada."
        )

    # El contraste se registra, pero no determina
    # por sí solo la clasificación.
    if contraste < 15:

        motivos.append(
            "Advertencia: contraste muy bajo."
        )

    elif contraste < 30:

        motivos.append(
            "Advertencia: contraste moderado."
        )

    # Información sobre texto digital
    if len(texto) == 0:

        motivos.append(
            "No se extrajo texto digital. "
            "Se requiere OCR para evaluar el reconocimiento."
        )

    return {
        "clasificacion": clasificacion,
        "caracteres_extraidos": len(texto),
        "metricas_visuales": metricas,
        "motivos": motivos,
        "texto_original": texto
    }

# ==========================================
# 5. PROCESAR CADA PDF
# ==========================================


def procesar_pdf(ruta_pdf):

    paginas = []

    with fitz.open(ruta_pdf) as documento:

        for numero, pagina in enumerate(documento, start=1):

            imagen = convertir_a_imagen(pagina)

            resultado = clasificar_legibilidad(
                imagen,
                pagina
            )

            resultado["numero_pagina"] = numero

            paginas.append(resultado)

    # RESUMEN DE CLASIFICACIONES

    conteo = {
        "LEGIBLE": 0,
        "PARCIALMENTE LEGIBLE": 0,
        "ILEGIBLE": 0
    }

    for pagina in paginas:

        conteo[pagina["clasificacion"]] += 1

    # CLASIFICACIÓN GENERAL DEL DOCUMENTO

    if conteo["ILEGIBLE"] > 0:

        clasificacion_documento = "ILEGIBLE"

    elif conteo["PARCIALMENTE LEGIBLE"] > 0:

        clasificacion_documento = "PARCIALMENTE LEGIBLE"

    else:

        clasificacion_documento = "LEGIBLE"

    resultado_documento = {

        "documento_id": ruta_pdf.stem,

        "archivo_original": ruta_pdf.name,

        "tipo_documento": "predial",

        "clasificacion_documento": clasificacion_documento,

        "total_paginas": len(paginas),

        "resumen_legibilidad": conteo,

        "paginas": paginas
    }

    return resultado_documento


# ==========================================
# 6. GUARDAR JSON
# ==========================================

def guardar_json(resultado, ruta_pdf):

    ruta_json = (
        CARPETA_SALIDA / f"{ruta_pdf.stem}.json"
    )

    with open(
        ruta_json,
        "w",
        encoding="utf-8"
    ) as archivo:

        json.dump(
            resultado,
            archivo,
            ensure_ascii=False,
            indent=4
        )

    return ruta_json


# ==========================================
# 7. EJECUCIÓN PRINCIPAL
# ==========================================

def main():

    archivos_pdf = list(
        CARPETA_ENTRADA.glob("*.pdf")
    )

    if not archivos_pdf:

        print("No se encontraron archivos PDF.")

        return

    print("\nREPORTE DE LEGIBILIDAD")
    print("=" * 50)

    for ruta_pdf in archivos_pdf:

        resultado = procesar_pdf(ruta_pdf)

        print(f"\nDocumento: {ruta_pdf.name}")

        for pagina in resultado["paginas"]:

            print(
                f"\n  Página {pagina['numero_pagina']}: "
                f"{pagina['clasificacion']}"
            )

            for motivo in pagina["motivos"]:

                print(f"    - {motivo}")

        print(
            "\n  Clasificación general:",
            resultado["clasificacion_documento"]
        )

        guardar_json(resultado, ruta_pdf)

    print("\n" + "=" * 50)

    print("PROCESAMIENTO TERMINADO")

    print(
        f"Resultados guardados en: {CARPETA_SALIDA}"
    )


if __name__ == "__main__":

    main()
