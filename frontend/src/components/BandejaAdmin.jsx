import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Clock,
  FileText,
  AlertTriangle,
  CheckCircle2,
  Eye,
  ArrowLeft,
  Sparkles,
  Download,
  Search,
  Inbox,
  Loader2,
  ListChecks,
  X,
  Quote,
  Building2,
  Layers,
  FileSearch,
  GitCompare,
  Gavel,
  Check,
  Calendar,
} from "lucide-react";

const DISPLAY =
  "font-['Bricolage_Grotesque',ui-sans-serif,system-ui,sans-serif]";

const PANEL_BASE =
  "rounded-3xl border backdrop-blur-2xl shadow-[0_20px_50px_-24px_rgba(90,40,40,0.28),inset_0_1px_0_rgba(255,255,255,0.9)]";
const PANEL = `${PANEL_BASE} border-slate-900/[0.07] bg-white/70`;

/* ------------------------------------------------------------------ */
/* Utilidades                                                          */
/* ------------------------------------------------------------------ */

const getBadgeRecomendacion = (rec) => {
  switch (rec) {
    case "Cumple":
      return "bg-emerald-500/10 text-emerald-700 border-emerald-500/30";
    case "Requiere revisión":
      return "bg-amber-500/15 text-amber-700 border-amber-500/30";
    case "No cumple":
      return "bg-red-500/10 text-red-600 border-red-500/30";
    default:
      return "bg-sky-500/10 text-sky-700 border-sky-500/30";
  }
};

const getEstado = (exp) => {
  if (exp.recomendacion === "Cumple") return "aprobado";
  if (
    exp.recomendacion === "Requiere revisión" ||
    exp.recomendacion === "No cumple"
  )
    return "revision";
  return "analisis";
};

const FILTROS = [
  { id: "todos", label: "Todos" },
  { id: "aprobado", label: "Aprobados" },
  { id: "revision", label: "Requieren revisión" },
  { id: "analisis", label: "En análisis" },
];

const FILTROS_FECHA_RAPIDOS = [
  { id: "todos", label: "Todos" },
  { id: "hoy", label: "Hoy" },
  { id: "7dias", label: "Últimos 7 días" },
  { id: "mes", label: "Este mes" },
];

const obtenerFechaExpediente = (exp) => {
  if (exp.creadoEn) {
    const d = new Date(exp.creadoEn);
    return new Date(d.getFullYear(), d.getMonth(), d.getDate());
  }
  if (exp.fechaSubida) {
    const soloFecha = exp.fechaSubida.split(",")[0].trim();
    const partes = soloFecha.split("/");
    if (partes.length === 3) {
      const [dia, mes, anio] = partes.map(Number);
      if (!Number.isNaN(dia) && !Number.isNaN(mes) && !Number.isNaN(anio)) {
        return new Date(anio, mes - 1, dia);
      }
    }
  }
  return null;
};

const parsearInputFecha = (str) => {
  if (!str) return null;
  const [anio, mes, dia] = str.split("-").map(Number);
  return new Date(anio, mes - 1, dia);
};

const AGENTES = [
  {
    id: "clasificador",
    nombre: "Clasificador",
    descripcion: "Identifica cada documento",
    Icono: Layers,
  },
  {
    id: "extractor",
    nombre: "Extractor",
    descripcion: "Lee campos y textos clave",
    Icono: FileSearch,
  },
  {
    id: "cruzado",
    nombre: "Validador cruzado",
    descripcion: "Compara las 4 fuentes",
    Icono: GitCompare,
  },
  {
    id: "dictaminador",
    nombre: "Dictaminador",
    descripcion: "Emite la recomendación",
    Icono: Gavel,
  },
];

const CAMPOS_MATRIZ = ["escrituras", "predial", "alineamiento", "usoSuelo"];

const normalizar = (v) => {
  const s = String(v ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
  if (/^[\d.,\s]+(m2|m²|mts2|mts|m)?$/.test(s)) {
    const n = parseFloat(s.replace(/[,\s]/g, ""));
    if (!Number.isNaN(n)) return `n:${n}`;
  }
  return s.replace(/[^a-z0-9]/g, "");
};

const celdasDiscrepantes = (fila) => {
  if (fila.estado === "coincide") return [];
  const valores = CAMPOS_MATRIZ.map((campo) => ({
    campo,
    norm: normalizar(fila[campo]),
  })).filter((v) => v.norm !== "");
  if (valores.length === 0) return [];

  const frecuencia = {};
  valores.forEach((v) => (frecuencia[v.norm] = (frecuencia[v.norm] || 0) + 1));
  const max = Math.max(...Object.values(frecuencia));
  const candidatos = Object.keys(frecuencia).filter(
    (k) => frecuencia[k] === max,
  );

  const normEscrituras = normalizar(fila.escrituras);
  const referencia = candidatos.includes(normEscrituras)
    ? normEscrituras
    : candidatos[0];

  return valores.filter((v) => v.norm !== referencia).map((v) => v.campo);
};

const getEstadoAgente = (progreso, indice) => {
  if (progreso >= (indice + 1) * 25) return "completo";
  if (progreso >= indice * 25) return "activo";
  return "pendiente";
};

/* ------------------------------------------------------------------ */
/* Piezas                                                              */
/* ------------------------------------------------------------------ */

function BadgeDictamen({ recomendacion, className = "" }) {
  return (
    <span
      className={`inline-flex items-center whitespace-nowrap rounded-full border px-3 py-1 text-xs font-medium ${getBadgeRecomendacion(
        recomendacion,
      )} ${className}`}
    >
      {recomendacion}
    </span>
  );
}

function BarraProgreso({ exp }) {
  const completo = exp.progreso === 100;

  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between gap-2 text-xs">
        <span className="flex items-center gap-1.5 truncate font-medium text-slate-700">
          {!completo && (
            <span className="relative flex h-2 w-2 shrink-0">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#e81c24] opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-[#e81c24]" />
            </span>
          )}
          <span className="truncate">{exp.etapaActual}</span>
        </span>
        <span
          className={`font-bold tabular-nums ${
            completo ? "text-emerald-700" : "text-slate-900"
          }`}
        >
          {exp.progreso}%
        </span>
      </div>

      <div className="grid grid-cols-4 gap-1.5">
        {[0, 1, 2, 3].map((paso) => {
          const umbralInicio = paso * 25;
          const umbralFin = (paso + 1) * 25;
          const llenado = Math.min(
            100,
            Math.max(
              0,
              ((exp.progreso - umbralInicio) / (umbralFin - umbralInicio)) *
                100,
            ),
          );
          const activo =
            exp.progreso > umbralInicio && exp.progreso < umbralFin;

          return (
            <div
              key={paso}
              className="h-2 overflow-hidden rounded-full bg-slate-900/[0.08]"
              title={`Agente ${paso + 1}: ${AGENTES[paso]?.nombre}`}
            >
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  completo
                    ? "bg-emerald-500"
                    : activo
                      ? "animate-pulse bg-gradient-to-r from-[#e81c24] to-amber-500"
                      : "bg-[#e81c24]"
                }`}
                style={{ width: `${llenado}%` }}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ItemKpi({ Icono, etiqueta, valor, total, tono, barra }) {
  return (
    <div className="p-5">
      <div className="flex items-center gap-2 text-sm text-slate-600">
        <span
          className={`flex h-6 w-6 items-center justify-center rounded-full ${tono}`}
        >
          <Icono className="h-3.5 w-3.5" />
        </span>
        {etiqueta}
      </div>
      <p
        className={`${DISPLAY} mt-3 text-4xl font-bold leading-none tabular-nums text-slate-900`}
      >
        {valor}
      </p>
      <div className="mt-4 h-1 overflow-hidden rounded-full bg-slate-900/[0.06]">
        <div
          className={`h-full rounded-full transition-all duration-500 ${barra}`}
          style={{ width: total ? `${(valor / total) * 100}%` : "0%" }}
        />
      </div>
    </div>
  );
}

function AnilloMini({ valor }) {
  const r = 26;
  const c = 2 * Math.PI * r;
  return (
    <div className="relative h-16 w-16 shrink-0">
      <svg viewBox="0 0 64 64" className="h-full w-full -rotate-90">
        <circle
          cx="32"
          cy="32"
          r={r}
          fill="none"
          stroke="rgba(15,23,42,0.08)"
          strokeWidth="6"
        />
        <circle
          cx="32"
          cy="32"
          r={r}
          fill="none"
          stroke={valor === 100 ? "#10b981" : "#e81c24"}
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - valor / 100)}
          className="transition-all duration-700"
        />
      </svg>
      <span
        className={`${DISPLAY} absolute inset-0 flex items-center justify-center text-sm font-bold tabular-nums text-slate-900`}
      >
        {valor}%
      </span>
    </div>
  );
}

function Stepper({ progreso }) {
  return (
    <div className={`${PANEL} p-5 sm:p-6`}>
      <h3 className={`${DISPLAY} mb-5 text-base font-bold text-slate-900`}>
        Avance de los agentes
      </h3>
      <ol className="flex flex-col gap-5 md:flex-row md:gap-0">
        {AGENTES.map((agente, i) => {
          const estado = getEstadoAgente(progreso, i);
          const Icono = agente.Icono;
          return (
            <li key={agente.id} className="flex gap-3.5 md:block md:flex-1">
              <div className="flex items-center md:mb-3">
                <span
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition-colors ${
                    estado === "completo"
                      ? "bg-emerald-500 text-white"
                      : estado === "activo"
                        ? "bg-[#e81c24] text-white shadow-[0_0_0_6px_rgba(232,28,36,0.22)]"
                        : "bg-slate-900/[0.06] text-slate-500"
                  }`}
                >
                  {estado === "completo" ? (
                    <Check className="h-5 w-5" strokeWidth={3} />
                  ) : (
                    <Icono
                      className={`h-5 w-5 ${estado === "activo" ? "animate-pulse" : ""}`}
                    />
                  )}
                </span>
                {i < AGENTES.length - 1 && (
                  <span
                    className={`mx-3 hidden h-px flex-1 md:block ${
                      estado === "completo"
                        ? "bg-emerald-400"
                        : "bg-slate-900/10"
                    }`}
                  />
                )}
              </div>
              <div className="min-w-0 pr-2">
                <p className="text-sm font-semibold text-slate-900">
                  {agente.nombre}
                </p>
                <p
                  className={`text-xs ${
                    estado === "completo"
                      ? "text-emerald-700"
                      : estado === "activo"
                        ? "text-red-600"
                        : "text-slate-500"
                  }`}
                >
                  {estado === "completo"
                    ? "Completado"
                    : estado === "activo"
                      ? "Trabajando ahora"
                      : "En espera"}
                </p>
                <p className="mt-0.5 text-xs text-slate-500">
                  {agente.descripcion}
                </p>
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

function CeldaValor({ valor, discrepante }) {
  if (!discrepante) return <span className="text-slate-700">{valor}</span>;
  return (
    <span className="inline-flex items-center gap-1.5 rounded-lg bg-amber-500/15 px-2 py-1 font-medium text-amber-700 ring-1 ring-inset ring-amber-500/40">
      {valor}
      <AlertTriangle
        className="h-3.5 w-3.5 shrink-0 text-amber-500"
        aria-label="Valor discrepante"
      />
    </span>
  );
}

function ModalEvidencia({ doc, onClose }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const raf = requestAnimationFrame(() => setVisible(true));
    const onKey = (e) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    const previo = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      cancelAnimationFrame(raf);
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previo;
    };
  }, [onClose]);

  const analizando = /analiz/i.test(doc.estatus);

  return (
    <div
      className={`fixed inset-0 z-50 flex items-end justify-center bg-slate-900/40 backdrop-blur-md transition-opacity duration-200 sm:items-center sm:p-6 ${
        visible ? "opacity-100" : "opacity-0"
      }`}
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`Vista previa de ${doc.tipo}`}
        className={`flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-t-3xl border border-slate-900/[0.07] bg-white/95 text-slate-900 shadow-2xl transition-all duration-300 sm:rounded-3xl ${
          visible ? "translate-y-0 scale-100" : "translate-y-4 scale-[0.98]"
        }`}
      >
        <div className="flex items-start justify-between gap-4 border-b border-slate-900/[0.07] px-5 py-4">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <FileText className="h-4 w-4 shrink-0 text-[#e81c24]" />
              <h3 className={`${DISPLAY} truncate text-lg font-bold`}>
                {doc.tipo}
              </h3>
              <span
                className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                  analizando
                    ? "bg-sky-500/10 text-sky-700"
                    : "bg-slate-900/[0.06] text-slate-700"
                }`}
              >
                {doc.estatus}
              </span>
            </div>
            <p className="mt-0.5 truncate text-xs text-slate-500">
              {doc.nombreArchivo}
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Cerrar vista previa"
            className="cursor-pointer rounded-full p-2 text-slate-500 transition hover:bg-slate-900/[0.06] hover:text-slate-900 focus-visible:outline-2 focus-visible:outline-[#e81c24]"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="grid flex-1 grid-cols-1 overflow-y-auto md:grid-cols-5 md:overflow-hidden">
          <div className="bg-slate-900/[0.04] p-4 md:col-span-3 md:overflow-y-auto md:p-6">
            <div className="mx-auto max-w-md space-y-3 rounded-lg bg-[#fffdfb] p-6 shadow-lg">
              <div className="h-3 w-2/5 rounded bg-[#15100f]/20" />
              <div className="h-2 w-full rounded bg-[#15100f]/10" />
              <div className="h-2 w-11/12 rounded bg-[#15100f]/10" />
              {doc.hallazgos.length > 0 ? (
                doc.hallazgos.map((h, i) => (
                  <div key={i} className="space-y-3">
                    <div className="rounded border-l-4 border-[#e81c24] bg-[#e81c24]/10 px-3 py-2 text-xs leading-relaxed text-slate-900">
                      {h.evidencia}
                    </div>
                    <div className="h-2 w-10/12 rounded bg-[#15100f]/10" />
                    <div className="h-2 w-full rounded bg-[#15100f]/10" />
                  </div>
                ))
              ) : (
                <>
                  <div className="h-2 w-10/12 rounded bg-[#15100f]/10" />
                  <div className="h-2 w-full rounded bg-[#15100f]/10" />
                  <div className="h-2 w-9/12 rounded bg-[#15100f]/10" />
                </>
              )}
              <div className="h-2 w-3/4 rounded bg-[#15100f]/10" />
            </div>
            <p className="mt-3 text-center text-xs text-slate-400">
              Representación del documento con los fragmentos que leyó el agente
            </p>
          </div>

          <div className="border-t border-slate-900/[0.07] p-5 md:col-span-2 md:overflow-y-auto md:border-l md:border-t-0">
            <h4 className="mb-4 flex items-center gap-2 text-sm font-semibold">
              <ListChecks className="h-4 w-4 text-slate-500" />
              Evidencia extraída
            </h4>
            {doc.hallazgos.length > 0 ? (
              <ul className="space-y-5">
                {doc.hallazgos.map((h, i) => (
                  <li key={i}>
                    <p className="text-sm font-semibold">{h.regla}</p>
                    <p className="mt-0.5 text-sm text-slate-600">{h.detalle}</p>
                    <p className="mt-2 flex gap-2 rounded-2xl bg-slate-900/[0.04] p-3 text-xs italic leading-relaxed text-slate-500">
                      <Quote className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400" />
                      {h.evidencia}
                    </p>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="rounded-2xl border border-dashed border-slate-300 p-5 text-center">
                <Loader2 className="mx-auto mb-2 h-5 w-5 animate-spin text-slate-500" />
                <p className="text-sm text-slate-500">
                  El agente todavía no extrae hallazgos de este documento.
                </p>
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-end border-t border-slate-900/[0.07] px-5 py-3">
          <button
            onClick={onClose}
            className="cursor-pointer rounded-full bg-slate-900 px-5 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#e81c24]"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Componente principal                                                */
/* ------------------------------------------------------------------ */

export default function BandejaAdmin({ expedientes }) {
  const [seleccionado, setSeleccionado] = useState(null);
  const [filtro, setFiltro] = useState("todos");
  const [busqueda, setBusqueda] = useState("");
  const [filtroFechaRapido, setFiltroFechaRapido] = useState("todos");
  const [fechaDesde, setFechaDesde] = useState("");
  const [fechaHasta, setFechaHasta] = useState("");
  const [docVista, setDocVista] = useState(null);
  const cerrarVista = useCallback(() => setDocVista(null), []);

  const hayFiltroFechaActivo =
    filtroFechaRapido !== "todos" || fechaDesde !== "" || fechaHasta !== "";

  const limpiarFechas = () => {
    setFiltroFechaRapido("todos");
    setFechaDesde("");
    setFechaHasta("");
  };

  const handleSeleccionFechaRapida = (id) => {
    setFiltroFechaRapido(id);
    setFechaDesde("");
    setFechaHasta("");
  };

  const handleCambioRango = (tipo, valor) => {
    setFiltroFechaRapido("rango");
    if (tipo === "desde") setFechaDesde(valor);
    if (tipo === "hasta") setFechaHasta(valor);
    if (
      (tipo === "desde" && valor === "" && fechaHasta === "") ||
      (tipo === "hasta" && valor === "" && fechaDesde === "")
    ) {
      setFiltroFechaRapido("todos");
    }
  };

  const conteos = useMemo(() => {
    const c = {
      todos: expedientes.length,
      aprobado: 0,
      revision: 0,
      analisis: 0,
    };
    expedientes.forEach((e) => (c[getEstado(e)] += 1));
    return c;
  }, [expedientes]);

  const filtrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    const hoy = new Date();
    const inicioHoy = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());

    return expedientes.filter((e) => {
      const okFiltro = filtro === "todos" || getEstado(e) === filtro;
      const okBusqueda =
        q === "" ||
        [e.id, e.inmueble, e.cliente].some((x) =>
          String(x).toLowerCase().includes(q),
        );

      if (!okFiltro || !okBusqueda) return false;

      // Filtro por fechas
      const fechaExp = obtenerFechaExpediente(e);
      if (!fechaExp) return true;

      if (filtroFechaRapido === "hoy") {
        return fechaExp.getTime() === inicioHoy.getTime();
      }
      if (filtroFechaRapido === "7dias") {
        const hace7Dias = new Date(inicioHoy);
        hace7Dias.setDate(inicioHoy.getDate() - 7);
        return fechaExp >= hace7Dias && fechaExp <= inicioHoy;
      }
      if (filtroFechaRapido === "mes") {
        return (
          fechaExp.getMonth() === inicioHoy.getMonth() &&
          fechaExp.getFullYear() === inicioHoy.getFullYear()
        );
      }
      if (fechaDesde || fechaHasta) {
        const dDesde = parsearInputFecha(fechaDesde);
        const dHasta = parsearInputFecha(fechaHasta);
        if (dDesde && fechaExp < dDesde) return false;
        if (dHasta && fechaExp > dHasta) return false;
      }

      return true;
    });
  }, [
    expedientes,
    filtro,
    busqueda,
    filtroFechaRapido,
    fechaDesde,
    fechaHasta,
  ]);

  /* ---------- Vista detalle ---------- */
  if (seleccionado) {
    const exp =
      expedientes.find((e) => e.id === seleccionado.id) || seleccionado;
    const matriz = exp.validacionCruzada || [];
    const discrepancias = matriz.filter((f) => f.estado !== "coincide").length;
    const correctos = matriz.length - discrepancias;

    return (
      <div className="relative z-10 mx-auto max-w-5xl space-y-5 px-4 py-6 text-slate-900 sm:px-6 sm:py-8">
        <button
          type="button"
          onClick={() => setSeleccionado(null)}
          className="inline-flex cursor-pointer items-center gap-2 rounded-full bg-[#e81c24] px-5 py-2.5 text-sm font-semibold text-white shadow-[0_10px_30px_-8px_rgba(232,28,36,0.75)] transition hover:bg-[#f0262e] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#e81c24]"
        >
          <ArrowLeft className="h-4 w-4" /> Volver a la bandeja
        </button>

        {/* Encabezado del dictamen */}
        <div
          className={`${PANEL} flex flex-col justify-between gap-5 p-5 sm:p-7 md:flex-row md:items-center`}
        >
          <div className="min-w-0">
            <div className="mb-2.5 flex flex-wrap items-center gap-3">
              <span className="rounded-full bg-slate-900/[0.06] px-2.5 py-0.5 font-mono text-xs text-slate-700">
                {exp.id}
              </span>
              <span className="flex items-center gap-1.5 text-xs text-slate-500">
                <Clock className="h-3.5 w-3.5" /> Subido: {exp.fechaSubida}
              </span>
            </div>
            <h2
              className={`${DISPLAY} text-2xl font-bold leading-tight sm:text-3xl`}
            >
              {exp.inmueble}
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Remitente: {exp.cliente}
            </p>
          </div>

          <div className="flex items-center justify-between gap-4 md:justify-end">
            <div className="md:text-right">
              <p className="mb-1.5 text-xs text-slate-500">Dictamen IA</p>
              <BadgeDictamen
                recomendacion={exp.recomendacion}
                className="px-4 py-1.5 text-sm"
              />
            </div>
            <AnilloMini valor={exp.progreso} />
          </div>
        </div>

        <Stepper progreso={exp.progreso} />

        {/* Conclusión del agente dictaminador */}
        <div
          className={`${PANEL_BASE} border-slate-900/[0.07] bg-gradient-to-br from-[#e81c24]/15 via-white/60 to-amber-300/20 p-5 sm:p-6`}
        >
          <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-amber-700">
            <Sparkles className="h-4 w-4" /> Conclusión del agente dictaminador
          </div>
          <p className="text-sm leading-relaxed text-slate-700">
            {exp.resumenEjecutivo}
          </p>
        </div>

        {/* Matriz de validación cruzada */}
        {matriz.length > 0 && (
          <div className={`${PANEL} overflow-hidden`}>
            <div className="flex flex-col justify-between gap-3 border-b border-slate-900/[0.07] px-5 py-4 sm:flex-row sm:items-center sm:px-6">
              <div>
                <h3 className={`${DISPLAY} text-base font-bold`}>
                  Matriz de validación cruzada entre documentos
                </h3>
                <p className="mt-0.5 text-xs text-slate-500">
                  Comparación automática de titularidad, superficies, catastro y
                  ubicación entre las 4 fuentes.
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2 text-xs font-medium">
                <span className="rounded-full bg-emerald-500/10 px-3 py-1 text-emerald-700">
                  {correctos} correctos
                </span>
                <span className="rounded-full bg-amber-500/15 px-3 py-1 text-amber-700">
                  {discrepancias} discrepancias
                </span>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[780px] text-left text-sm">
                <thead className="bg-slate-900/[0.03] text-sm font-bold text-slate-800">
                  <tr>
                    <th className="px-5 py-3.5 font-bold">Campo evaluado</th>
                    <th className="px-4 py-3.5 font-bold">Escrituras</th>
                    <th className="px-4 py-3.5 font-bold">Predial</th>
                    <th className="px-4 py-3.5 font-bold">Alineamiento</th>
                    <th className="px-4 py-3.5 font-bold">Uso de suelo</th>
                    <th className="px-4 py-3.5 font-bold">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-900/[0.07]">
                  {matriz.map((fila, idx) => {
                    const malas = celdasDiscrepantes(fila);
                    return (
                      <tr key={idx}>
                        <td className="px-5 py-3.5 font-medium text-slate-900">
                          {fila.campo}
                        </td>
                        {CAMPOS_MATRIZ.map((campo) => (
                          <td key={campo} className="px-4 py-3.5">
                            <CeldaValor
                              valor={fila[campo]}
                              discrepante={malas.includes(campo)}
                            />
                          </td>
                        ))}
                        <td className="px-4 py-3.5">
                          {fila.estado === "coincide" ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-1 text-xs font-medium text-emerald-700">
                              <CheckCircle2 className="h-3.5 w-3.5" /> Coincide
                            </span>
                          ) : (
                            <div>
                              <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-2.5 py-1 text-xs font-medium text-amber-700">
                                <AlertTriangle className="h-3.5 w-3.5" />{" "}
                                Discrepancia
                              </span>
                              <p className="mt-1 max-w-[230px] text-xs text-amber-700">
                                {fila.alerta}
                              </p>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Documentos y evidencias */}
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          {exp.documentos.map((doc, idx) => {
            const tieneDiscrepancia =
              /inconsistencia|condicionante|rechaz/i.test(doc.estatus);

            return (
              <div
                key={idx}
                className={`${PANEL_BASE} p-5 ${
                  tieneDiscrepancia
                    ? "border-amber-400/70 bg-amber-50/30"
                    : "border-slate-900/[0.07] bg-white/70"
                }`}
              >
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <span
                      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl ${
                        tieneDiscrepancia
                          ? "bg-amber-500/20 text-amber-700"
                          : "bg-[#e81c24]/20 text-[#e81c24]"
                      }`}
                    >
                      {tieneDiscrepancia ? (
                        <AlertTriangle className="h-5 w-5" />
                      ) : (
                        <FileText className="h-5 w-5" />
                      )}
                    </span>
                    <h4 className={`${DISPLAY} truncate text-base font-bold`}>
                      {doc.tipo}
                    </h4>
                  </div>
                  <span
                    className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${
                      tieneDiscrepancia
                        ? "border border-amber-500/40 bg-amber-500/15 text-amber-800"
                        : "bg-slate-900/[0.06] text-slate-700"
                    }`}
                  >
                    {tieneDiscrepancia && (
                      <AlertTriangle className="h-3.5 w-3.5 text-amber-600" />
                    )}
                    {doc.estatus}
                  </span>
                </div>

                <div className="mb-4 flex items-center justify-between gap-2 rounded-2xl bg-slate-900/[0.04] px-3.5 py-2.5 text-xs">
                  <span className="truncate text-slate-500">
                    {doc.nombreArchivo}
                  </span>
                  <button
                    onClick={() => setDocVista(doc)}
                    className="ml-2 flex shrink-0 cursor-pointer items-center gap-1.5 rounded-full bg-slate-900 px-3 py-1.5 font-semibold text-white transition hover:bg-slate-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#e81c24]"
                  >
                    <Download className="h-3.5 w-3.5" /> Ver PDF
                  </button>
                </div>

                {doc.hallazgos.length > 0 ? (
                  <div className="space-y-3">
                    {doc.hallazgos.map((h, i) => (
                      <div
                        key={i}
                        className={`border-l-2 py-0.5 pl-3 text-xs ${
                          tieneDiscrepancia
                            ? "border-amber-500"
                            : "border-[#e81c24]"
                        }`}
                      >
                        <p className="font-medium text-slate-900">
                          {h.regla}: {h.detalle}
                        </p>
                        <p className="mt-0.5 italic text-slate-500">
                          Evidencia: {h.evidencia}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs italic text-slate-500">
                    Esperando extracción de hallazgos del agente...
                  </p>
                )}
              </div>
            );
          })}
        </div>

        {docVista && <ModalEvidencia doc={docVista} onClose={cerrarVista} />}
      </div>
    );
  }

  /* ---------- Vista bandeja ---------- */
  return (
    <div className="relative z-10 mx-auto max-w-5xl px-4 py-6 text-slate-900 sm:px-6 sm:py-8">
      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h2
            className={`${DISPLAY} text-3xl font-bold leading-tight sm:text-4xl`}
          >
            Bandeja de expedientes
          </h2>
          <p className="mt-1.5 text-sm text-slate-500">
            Así va el análisis multiagente y la validación legal en tiempo real.
          </p>
        </div>

        <div className="relative w-full lg:w-80">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
          <input
            type="search"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar por folio, inmueble o remitente"
            className="w-full rounded-full border border-slate-900/[0.07] bg-white/70 py-3 pl-11 pr-4 text-sm text-slate-900 outline-none backdrop-blur-xl transition placeholder:text-slate-400 focus:border-[#e81c24]/70 focus:ring-4 focus:ring-[#e81c24]/20"
          />
        </div>
      </div>

      {/* KPIs */}
      <div className={`${PANEL} mb-5 grid grid-cols-2 lg:grid-cols-4`}>
        <ItemKpi
          Icono={Inbox}
          etiqueta="Total de expedientes"
          valor={conteos.todos}
          total={conteos.todos}
          tono="bg-slate-900/10 text-slate-900"
          barra="bg-slate-700"
        />
        <ItemKpi
          Icono={CheckCircle2}
          etiqueta="Aprobados"
          valor={conteos.aprobado}
          total={conteos.todos}
          tono="bg-emerald-500/15 text-emerald-700"
          barra="bg-emerald-500"
        />
        <ItemKpi
          Icono={AlertTriangle}
          etiqueta="Requieren revisión"
          valor={conteos.revision}
          total={conteos.todos}
          tono="bg-amber-500/15 text-amber-700"
          barra="bg-amber-400"
        />
        <ItemKpi
          Icono={Loader2}
          etiqueta="En análisis"
          valor={conteos.analisis}
          total={conteos.todos}
          tono="bg-[#e81c24]/25 text-[#e81c24]"
          barra="bg-[#e81c24]"
        />
      </div>

      {/* Buscador por fechas / días / rangos */}
      <div className={`${PANEL} mb-5 p-4 sm:p-5`}>
        <div className="flex flex-col justify-between gap-3 lg:flex-row lg:items-center">
          <div className="flex items-center gap-2 text-sm font-bold text-slate-900">
            <Calendar className="h-4 w-4 text-[#e81c24]" />
            <span>Filtrar por fecha de subida</span>
          </div>

          <div className="flex flex-wrap gap-2">
            {FILTROS_FECHA_RAPIDOS.map((item) => {
              const activo = filtroFechaRapido === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleSeleccionFechaRapida(item.id)}
                  className={`cursor-pointer rounded-full px-3.5 py-1.5 text-xs font-semibold transition ${
                    activo
                      ? "bg-slate-900 text-white shadow-xs"
                      : "border border-slate-200 bg-white/80 text-slate-700 hover:bg-slate-100"
                  }`}
                >
                  {item.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="mt-3.5 flex flex-col gap-3 border-t border-slate-900/[0.06] pt-3.5 sm:flex-row sm:items-end">
          <div className="flex-1">
            <label
              htmlFor="admin-fecha-desde"
              className="mb-1 block text-xs font-medium text-slate-600"
            >
              Desde el día
            </label>
            <input
              id="admin-fecha-desde"
              type="date"
              value={fechaDesde}
              onChange={(e) => handleCambioRango("desde", e.target.value)}
              className="w-full cursor-pointer rounded-2xl border border-slate-200 bg-white/90 px-3.5 py-2 text-sm text-slate-900 outline-none transition focus:border-[#e81c24]/70 focus:ring-4 focus:ring-[#e81c24]/15"
            />
          </div>

          <div className="flex-1">
            <label
              htmlFor="admin-fecha-hasta"
              className="mb-1 block text-xs font-medium text-slate-600"
            >
              Hasta el día
            </label>
            <input
              id="admin-fecha-hasta"
              type="date"
              value={fechaHasta}
              min={fechaDesde || undefined}
              onChange={(e) => handleCambioRango("hasta", e.target.value)}
              className="w-full cursor-pointer rounded-2xl border border-slate-200 bg-white/90 px-3.5 py-2 text-sm text-slate-900 outline-none transition focus:border-[#e81c24]/70 focus:ring-4 focus:ring-[#e81c24]/15"
            />
          </div>

          {hayFiltroFechaActivo && (
            <button
              type="button"
              onClick={limpiarFechas}
              className="inline-flex shrink-0 cursor-pointer items-center justify-center gap-1.5 rounded-2xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-100 hover:text-slate-900"
            >
              <X className="h-3.5 w-3.5" /> Limpiar fechas
            </button>
          )}
        </div>
      </div>

      {/* Filtros por estado */}
      <div className="-mx-1 mb-4 flex gap-2 overflow-x-auto px-1 pb-1">
        {FILTROS.map((f) => {
          const activo = filtro === f.id;
          return (
            <button
              key={f.id}
              onClick={() => setFiltro(f.id)}
              className={`flex shrink-0 cursor-pointer items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#e81c24] ${
                activo
                  ? "bg-slate-900 text-white"
                  : "border border-slate-900/[0.07] bg-white/70 text-slate-600 hover:bg-slate-900/10 hover:text-slate-900"
              }`}
            >
              {f.label}
              <span
                className={`rounded-full px-1.5 text-xs tabular-nums ${
                  activo ? "bg-white/20" : "bg-slate-900/[0.06] text-slate-600"
                }`}
              >
                {conteos[f.id]}
              </span>
            </button>
          );
        })}
      </div>

      {/* Lista de expedientes */}
      {filtrados.length === 0 ? (
        <div className={`${PANEL} px-6 py-14 text-center`}>
          <Search className="mx-auto mb-3 h-6 w-6 text-slate-400" />
          <p className={`${DISPLAY} text-lg font-bold`}>
            No hay expedientes con ese criterio
          </p>
          <p className="mt-1 text-sm text-slate-500">
            Prueba con otro filtro, rango de fechas o borra la búsqueda.
          </p>
          {(filtro !== "todos" || busqueda || hayFiltroFechaActivo) && (
            <button
              onClick={() => {
                setFiltro("todos");
                setBusqueda("");
                limpiarFechas();
              }}
              className="mt-4 cursor-pointer rounded-full bg-[#e81c24] px-5 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
            >
              Limpiar todos los filtros
            </button>
          )}
        </div>
      ) : (
        <ul className="space-y-3">
          {filtrados.map((exp) => (
            <li
              key={exp.id}
              className={`${PANEL} grid gap-4 p-4 transition hover:bg-white/90 sm:p-5 md:grid-cols-[minmax(0,1.5fr)_minmax(0,1.1fr)_auto_auto] md:items-center md:gap-6`}
            >
              <div className="flex min-w-0 items-center gap-3.5">
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-slate-900/[0.06] text-slate-700">
                  <Building2 className="h-5 w-5" />
                </span>
                <div className="min-w-0">
                  <span className="block font-mono text-xs text-slate-500">
                    {exp.id}
                  </span>
                  <span className="block truncate font-semibold text-slate-900">
                    {exp.inmueble}
                  </span>
                  <span className="flex items-center gap-1.5 truncate text-xs text-slate-500">
                    {exp.cliente}
                  </span>
                </div>
              </div>

              <div>
                <BarraProgreso exp={exp} />
                <span className="mt-1.5 flex items-center gap-1.5 text-xs text-slate-500">
                  <Clock className="h-3 w-3" />
                  {exp.fechaSubida}
                </span>
              </div>

              <div>
                <BadgeDictamen recomendacion={exp.recomendacion} />
              </div>

              <div className="md:text-right">
                <button
                  onClick={() => setSeleccionado(exp)}
                  className="inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-full bg-[#e81c24] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#e81c24] md:w-auto"
                >
                  <Eye className="h-4 w-4" />
                  Revisar expediente
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}