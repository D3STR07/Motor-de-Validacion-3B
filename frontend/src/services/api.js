const API_URL = "http://127.0.0.1:8000/api";

const MAPA_TIPOS_BACKEND = [
  { claveFrontend: "escrituras", tipoBackend: "ESCRITURAS", etiqueta: "Escrituras del Inmueble" },
  { claveFrontend: "predial", tipoBackend: "PREDIAL", etiqueta: "Boleta Predial" },
  { claveFrontend: "alineamiento", tipoBackend: "ALINEAMIENTO", etiqueta: "Alineamiento y Número Oficial" },
  { claveFrontend: "usoSuelo", tipoBackend: "USO_DE_SUELO", etiqueta: "Certificado de Uso de Suelo" },
];

const normalizarDictamen = (dictamenRaw, estadoRaw) => {
  const est = String(estadoRaw || "").toUpperCase();
  if (est === "REQUIERE_REVISION" || est === "INCOMPLETO") return "Requiere revisión";

  const txt = String(dictamenRaw || "").toLowerCase();
  if (txt.includes("no cumple") || txt.includes("rechaz")) return "No cumple";
  if (txt.includes("revisi") || txt.includes("condicion") || txt.includes("discrepan")) {
    return "Requiere revisión";
  }
  if (txt.includes("cumple") || txt.includes("aprob") || txt.includes("viabl")) {
    return "Cumple";
  }
  return "Requiere revisión";
};

const esperarAnalisis = async (expedienteId, onProgreso) => {
  for (let intento = 1; intento <= 45; intento++) {
    await new Promise((r) => setTimeout(r, 2000));

    const res = await fetch(`${API_URL}/expedientes/${expedienteId}/analisis`);
    if (!res.ok) continue;

    const data = await res.json();
    const estado = String(data.estado || "").toUpperCase();

    if (estado === "EXTRAYENDO") {
      if (onProgreso) onProgreso(72, "Extrayendo texto con OCR...");
      continue;
    }
    if (estado === "ANALIZANDO") {
      if (onProgreso) onProgreso(88, "Validando datos con agentes IA...");
      continue;
    }
    if (estado === "COMPLETADO" || estado === "REQUIERE_REVISION" || estado === "INCOMPLETO") {
      if (onProgreso) onProgreso(100, "Dictamen generado");
      return data;
    }
    if (estado === "ERROR") {
      throw new Error(data.resultado?.error || "Error al procesar los archivos en el servidor.");
    }
  }
  throw new Error("El análisis tardó más de lo esperado. Revisa la bandeja en unos momentos.");
};

export async function enviarExpedienteCompleto({ inmueble, cliente, archivos, onProgreso }) {
  // 1. Crear expediente
  if (onProgreso) onProgreso(15, "Creando expediente en el servidor...");
  const resExp = await fetch(`${API_URL}/expedientes/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ nombre: inmueble, descripcion: cliente }),
  });

  if (!resExp.ok) {
    const err = await resExp.json().catch(() => ({}));
    throw new Error(err.detail || "No se pudo crear el expediente en el servidor.");
  }

  const { id: expedienteId } = await resExp.json();

  // 2. Subir los 4 archivos (PDF o imagen)
  for (let i = 0; i < MAPA_TIPOS_BACKEND.length; i++) {
    const { claveFrontend, tipoBackend, etiqueta } = MAPA_TIPOS_BACKEND[i];
    if (onProgreso) onProgreso(20 + (i + 1) * 10, `Subiendo ${etiqueta}...`);

    const formData = new FormData();
    formData.append("archivo", archivos[claveFrontend]);
    formData.append("tipo_documento", tipoBackend);

    const resDoc = await fetch(`${API_URL}/expedientes/${expedienteId}/documentos`, {
      method: "POST",
      body: formData,
    });

    if (!resDoc.ok) {
      const err = await resDoc.json().catch(() => ({}));
      throw new Error(err.detail || `Error al subir ${etiqueta}.`);
    }
  }

  // 3. Iniciar análisis
  if (onProgreso) onProgreso(65, "Iniciando análisis de documentos...");
  const resAnalizar = await fetch(`${API_URL}/expedientes/${expedienteId}/analizar`, {
    method: "POST",
  });

  if (!resAnalizar.ok) {
    throw new Error("No se pudo iniciar el análisis del expediente.");
  }

  // 4. Esperar resultado
  const analisisFinal = await esperarAnalisis(expedienteId, onProgreso);
  const resultado = analisisFinal.resultado || {};

  const ahora = new Date();
  const fechaFormateada = `${String(ahora.getDate()).padStart(2, "0")}/${String(
    ahora.getMonth() + 1
  ).padStart(2, "0")}/${ahora.getFullYear()}, ${String(ahora.getHours()).padStart(
    2,
    "0"
  )}:${String(ahora.getMinutes()).padStart(2, "0")}`;

  return {
    id: `EXP-2026-${String(expedienteId).padStart(3, "0")}`,
    backendId: expedienteId,
    creadoEn: Date.now(),
    inmueble,
    cliente,
    fechaSubida: fechaFormateada,
    progreso: 100,
    etapaActual: "Dictamen generado",
    recomendacion: normalizarDictamen(
      analisisFinal.dictamen || resultado.recomendacion,
      analisisFinal.estado
    ),
    resumenEjecutivo:
      resultado.resumenEjecutivo ||
      resultado.resumen ||
      resultado.mensaje ||
      `Análisis completado con dictamen: ${analisisFinal.dictamen || analisisFinal.estado}.`,
    validacionCruzada: Array.isArray(resultado.validacionCruzada) ? resultado.validacionCruzada : [],
    documentos: Array.isArray(resultado.documentos)
      ? resultado.documentos
      : MAPA_TIPOS_BACKEND.map(({ claveFrontend, etiqueta }) => ({
          tipo: etiqueta,
          nombreArchivo: archivos[claveFrontend]?.name || "documento",
          estatus: analisisFinal.estado === "REQUIERE_REVISION" ? "Requiere revisión" : "Válido",
          hallazgos: [],
        })),
  };
}