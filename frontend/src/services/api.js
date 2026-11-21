
const API_URL = "http://127.0.0.1:8000/api";

const TIPOS_DOCUMENTALES = [
  {
    claveFrontend: "escrituras",
    tipoBackend: "ESCRITURAS",
    etiqueta: "Escrituras del Inmueble",
  },
  {
    claveFrontend: "predial",
    tipoBackend: "PREDIAL",
    etiqueta: "Boleta Predial",
  },
  {
    claveFrontend: "alineamiento",
    tipoBackend: "ALINEAMIENTO",
    etiqueta: "Alineamiento y Número Oficial",
  },
  {
    claveFrontend: "usoSuelo",
    tipoBackend: "USO_DE_SUELO",
    etiqueta: "Certificado de Uso de Suelo",
  },
];

const ETIQUETAS = {
  ESCRITURAS: "Escrituras del Inmueble",
  PREDIAL: "Boleta Predial",
  ALINEAMIENTO: "Alineamiento y Número Oficial",
  USO_DE_SUELO: "Certificado de Uso de Suelo",
  OTRO: "Otro documento",
};

async function request(url, options = {}) {
  let response;

  try {
    response = await fetch(`${API_URL}${url}`, options);
  } catch {
    throw new Error(
      "No se pudo conectar con FastAPI. Verifica que el backend esté ejecutándose en el puerto 8000."
    );
  }

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(
      data.detail ||
        data.mensaje ||
        `Error HTTP ${response.status} al comunicarse con el servidor.`
    );
  }

  return data;
}

function normalizarEstado(estado) {
  return String(estado || "").toUpperCase();
}

function normalizarDictamen(dictamen, estado) {
  const estadoNormalizado = normalizarEstado(estado);
  const texto = String(dictamen || "").toLowerCase();

  if (texto.includes("no cumple") || texto.includes("rechaz")) {
    return "No cumple";
  }

  if (
    estadoNormalizado === "REQUIERE_REVISION" ||
    estadoNormalizado === "INCOMPLETO" ||
    estadoNormalizado === "ERROR" ||
    texto.includes("revisi") ||
    texto.includes("discrepan")
  ) {
    return "Requiere revisión";
  }

  if (
    texto.includes("cumple") ||
    texto.includes("aprob") ||
    texto.includes("viable")
  ) {
    return "Cumple";
  }

  return "Requiere revisión";
}

function formatearFecha(fecha) {
  if (!fecha) return "Fecha no disponible";

  const date = new Date(fecha);

  if (Number.isNaN(date.getTime())) {
    return "Fecha no disponible";
  }

  return date.toLocaleString("es-MX", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function obtenerResumen(resultado, estado, dictamen) {
  if (!resultado) {
    return `Estado del procesamiento: ${estado || "PENDIENTE"}.`;
  }

  return (
    resultado.resumenEjecutivo ||
    resultado.resumen ||
    resultado.conclusion ||
    resultado.mensaje ||
    resultado.resultado_auditoria?.conclusion ||
    resultado.resultado_auditoria?.resumen ||
    `Análisis finalizado. Dictamen: ${dictamen || estado || "Pendiente"}.`
  );
}

function obtenerHallazgos(resultado, tipoDocumento) {
  if (!resultado) return [];

  const agentes = resultado.resultados_agentes || [];

  const agente = agentes.find(
    (item) =>
      String(item.tipo_documento || item.agente || "")
        .toUpperCase()
        .includes(tipoDocumento)
  );

  const hallazgos =
    agente?.hallazgos ||
    agente?.observaciones ||
    agente?.validaciones ||
    [];

  if (!Array.isArray(hallazgos)) return [];

  return hallazgos.map((item) => ({
    regla: item.regla || item.campo || item.titulo || "Hallazgo",
    detalle:
      item.detalle ||
      item.descripcion ||
      item.mensaje ||
      String(item.resultado || ""),
    evidencia:
      item.evidencia ||
      item.texto_evidencia ||
      item.fuente ||
      "Sin evidencia textual disponible.",
  }));
}

function mapearDocumento(documento, resultado) {
  const tipo = normalizarEstado(documento.tipo_documento);
  const tipoEtiqueta = ETIQUETAS[tipo] || tipo || "Documento";

  const estadoOCR = normalizarEstado(
    documento.estado_lectura || documento.estado_procesamiento
  );

  let estatus = "Pendiente";

  if (estadoOCR === "LEGIBLE" || estadoOCR === "COMPLETADO") {
    estatus = "Procesado";
  } else if (
    estadoOCR === "PARCIALMENTE_LEGIBLE" ||
    estadoOCR === "REQUIERE_REVISION"
  ) {
    estatus = "Requiere revisión";
  } else if (estadoOCR === "ILEGIBLE") {
    estatus = "Documento ilegible";
  } else if (estadoOCR === "ERROR") {
    estatus = "Error de procesamiento";
  } else if (documento.estado_procesamiento === "COMPLETADO") {
    estatus = "Procesado";
  }

  return {
    id: documento.id,
    tipo: tipoEtiqueta,
    tipoDocumento: tipo,
    nombreArchivo:
      documento.nombre_archivo ||
      documento.archivo_original ||
      "Documento PDF",
    estatus,
    hallazgos: obtenerHallazgos(resultado, tipo),
    rutaArchivo: documento.ruta_archivo || null,
  };
}

function mapearExpediente(expediente, documentos, analisis) {
  const estado = normalizarEstado(
    analisis?.estado || expediente.estado || "CREADO"
  );

  const resultado = analisis?.resultado || analisis?.resultado_json || {};
  const dictamen = analisis?.dictamen || resultado.dictamen || null;

  let progreso = 0;
  let etapaActual = "Esperando procesamiento";

  if (estado === "CREADO") {
    progreso = 0;
    etapaActual = "Expediente creado";
  } else if (estado === "EN_COLA" || estado === "PENDIENTE") {
    progreso = 10;
    etapaActual = "En espera de procesamiento";
  } else if (estado === "EXTRAYENDO") {
    progreso = 35;
    etapaActual = "Extrayendo texto con OCR...";
  } else if (estado === "ANALIZANDO") {
    progreso = 75;
    etapaActual = "Validando documentos con agentes IA...";
  } else if (estado === "COMPLETADO") {
    progreso = 100;
    etapaActual = "Dictamen generado";
  } else if (estado === "REQUIERE_REVISION") {
    progreso = 100;
    etapaActual = "Requiere revisión manual";
  } else if (estado === "INCOMPLETO") {
    progreso = 100;
    etapaActual = "Expediente incompleto";
  } else if (estado === "ERROR") {
    progreso = 100;
    etapaActual = "Error durante el procesamiento";
  }

  const documentosMapeados = (documentos || []).map((doc) =>
    mapearDocumento(doc, resultado)
  );

  const documentosFaltantes = resultado.documentos_faltantes || [];

  const documentosFinales = [...documentosMapeados];

  for (const tipo of TIPOS_DOCUMENTALES) {
    const existe = documentosMapeados.some(
      (doc) => doc.tipoDocumento === tipo.tipoBackend
    );

    if (!existe) {
      documentosFinales.push({
        tipo: tipo.etiqueta,
        tipoDocumento: tipo.tipoBackend,
        nombreArchivo: "Documento pendiente",
        estatus: documentosFaltantes.length
          ? "Faltante"
          : "No cargado",
        hallazgos: [],
        rutaArchivo: null,
      });
    }
  }

  const observaciones = resultado.observaciones || [];

  return {
    id: `EXP-2026-${String(expediente.id).padStart(3, "0")}`,
    backendId: expediente.id,
    creadoEn: expediente.created_at || expediente.fecha_creacion || null,
    inmueble: expediente.nombre || `Expediente ${expediente.id}`,
    cliente: expediente.descripcion || "Sin remitente registrado",
    fechaSubida: formatearFecha(
      expediente.created_at || expediente.fecha_creacion
    ),
    progreso,
    etapaActual,
    recomendacion: normalizarDictamen(dictamen, estado),
    resumenEjecutivo: obtenerResumen(resultado, estado, dictamen),
    validacionCruzada: Array.isArray(resultado.validacionCruzada)
      ? resultado.validacionCruzada
      : Array.isArray(resultado.validacion_cruzada)
        ? resultado.validacion_cruzada
        : [],
    documentos: documentosFinales,
    estadoBackend: estado,
    dictamenOriginal: dictamen,
    observaciones,
    resultadoOriginal: resultado,
  };
}

export async function obtenerExpedientes() {
  const expedientes = await request("/expedientes/");

  if (!Array.isArray(expedientes)) {
    throw new Error("El servidor devolvió una lista de expedientes inválida.");
  }

  const resultados = await Promise.all(
    expedientes.map(async (expediente) => {
      const [documentos, analisis] = await Promise.all([
        request(`/expedientes/${expediente.id}/documentos`).catch(() => []),
        request(`/expedientes/${expediente.id}/analisis`).catch(() => null),
      ]);

      return mapearExpediente(
        expediente,
        Array.isArray(documentos) ? documentos : [],
        analisis
      );
    })
  );

  return resultados.sort(
    (a, b) => new Date(b.creadoEn || 0) - new Date(a.creadoEn || 0)
  );
}

async function esperarAnalisis(expedienteId, onProgreso) {
  const maxIntentos = 180;

  for (let intento = 0; intento < maxIntentos; intento++) {
    await new Promise((resolve) => setTimeout(resolve, 2000));

    const analisis = await request(
      `/expedientes/${expedienteId}/analisis`
    );

    const estado = normalizarEstado(analisis.estado);

    if (estado === "EXTRAYENDO") {
      onProgreso?.(45, "Extrayendo texto con OCR...");
      continue;
    }

    if (estado === "ANALIZANDO") {
      onProgreso?.(80, "Ejecutando agentes de validación...");
      continue;
    }

    if (
      [
        "COMPLETADO",
        "REQUIERE_REVISION",
        "INCOMPLETO",
        "ERROR",
      ].includes(estado)
    ) {
      if (estado === "ERROR") {
        throw new Error(
          analisis.resultado?.error ||
            analisis.resultado_json?.error ||
            "El backend reportó un error durante el análisis."
        );
      }

      onProgreso?.(100, "Procesamiento finalizado");
      return analisis;
    }

    onProgreso?.(25, "Esperando procesamiento...");
  }

  throw new Error(
    "El procesamiento sigue en curso. El expediente quedó guardado en el servidor; puedes consultar su estado desde la bandeja."
  );
}

export async function enviarExpedienteCompleto({
  inmueble,
  cliente,
  archivos,
  onProgreso,
}) {
  if (!inmueble?.trim()) {
    throw new Error("Debes indicar el nombre o dirección del inmueble.");
  }

  for (const tipo of TIPOS_DOCUMENTALES) {
    if (!archivos?.[tipo.claveFrontend]) {
      throw new Error(`Falta cargar: ${tipo.etiqueta}.`);
    }
  }

  onProgreso?.(10, "Creando expediente en el servidor...");

  const expediente = await request("/expedientes/", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      nombre: inmueble,
      descripcion: cliente || "",
    }),
  });

  const expedienteId = expediente.id;

  if (!expedienteId) {
    throw new Error("El servidor no devolvió el ID del expediente.");
  }

  for (let i = 0; i < TIPOS_DOCUMENTALES.length; i++) {
    const tipo = TIPOS_DOCUMENTALES[i];
    const archivo = archivos[tipo.claveFrontend];

    if (!(archivo instanceof File)) {
      throw new Error(`${tipo.etiqueta} no es un archivo válido.`);
    }

    if (archivo.type !== "application/pdf") {
      throw new Error(`${tipo.etiqueta} debe ser un archivo PDF.`);
    }

    onProgreso?.(
      15 + (i + 1) * 10,
      `Subiendo ${tipo.etiqueta}...`
    );

    const formData = new FormData();
    formData.append("archivo", archivo);
    formData.append("tipo_documento", tipo.tipoBackend);

    await request(`/expedientes/${expedienteId}/documentos`, {
      method: "POST",
      body: formData,
    });
  }

  onProgreso?.(65, "Iniciando análisis del expediente...");

  await request(`/expedientes/${expedienteId}/analizar`, {
    method: "POST",
  });

  onProgreso?.(70, "Los agentes están analizando los documentos...");

  const analisisFinal = await esperarAnalisis(
    expedienteId,
    onProgreso
  );

  const [documentos, analisis] = await Promise.all([
    request(`/expedientes/${expedienteId}/documentos`),
    request(`/expedientes/${expedienteId}/analisis`).catch(
      () => analisisFinal
    ),
  ]);

  const expedienteCompleto = mapearExpediente(
    expediente,
    documentos,
    analisis
  );

  onProgreso?.(100, "Expediente procesado");

  return expedienteCompleto;
}
