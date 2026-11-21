import { useEffect, useMemo, useState } from "react";
import {
  Plus,
  Building2,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  FileText,
  Sparkles,
  Calendar,
  X,
  Search,
  Eye,
} from "lucide-react";

const DISPLAY = "font-['Bricolage_Grotesque',ui-sans-serif,system-ui,sans-serif]";
const PANEL =
  "rounded-3xl border border-slate-900/[0.07] bg-white/70 backdrop-blur-2xl shadow-[0_20px_50px_-24px_rgba(90,40,40,0.28),inset_0_1px_0_rgba(255,255,255,0.9)]";

const FILTROS_RAPIDOS = [
  { id: "todos", label: "Todos" },
  { id: "hoy", label: "Hoy" },
  { id: "7dias", label: "Últimos 7 días" },
  { id: "mes", label: "Este mes" },
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

const obtenerEstatusAmigable = (exp) => {
  if (exp.recomendacion === "Cumple") {
    return {
      titulo: "¡Tu local cumple con los requisitos!",
      descripcion:
        "Todos tus documentos coinciden. Un asesor de Tiendas 3B te contactará pronto.",
      badge: "Aprobado",
      estilosBadge: "bg-emerald-500/15 text-emerald-700 border-emerald-500/30",
      Icono: CheckCircle2,
      colorIcono: "bg-emerald-500 text-white",
    };
  }
  if (exp.recomendacion === "Requiere revisión" || exp.recomendacion === "No cumple") {
    return {
      titulo: "Revisamos tus papeles, pero encontramos un detalle",
      descripcion: exp.resumenEjecutivo,
      badge: "Requiere aclaración",
      estilosBadge: "bg-amber-500/15 text-amber-800 border-amber-500/30",
      Icono: AlertTriangle,
      colorIcono: "bg-amber-500 text-white",
    };
  }
  return {
    titulo: "Estamos revisando tus 4 documentos...",
    descripcion:
      "Esto toma solo unos segundos. Estamos verificando que todos tus datos coincidan.",
    badge: `Revisando (${exp.progreso}%)`,
    estilosBadge: "bg-sky-500/15 text-sky-700 border-sky-500/30",
    Icono: Loader2,
    colorIcono: "bg-[#e81c24] text-white",
    animar: true,
  };
};

function CeldaValor({ valor, discrepante }) {
  if (!discrepante) return <span className="text-slate-700">{valor}</span>;
  return (
    <span className="inline-flex items-center gap-1.5 rounded-lg bg-amber-500/15 px-2.5 py-1 font-medium text-amber-800 ring-1 ring-inset ring-amber-500/40">
      {valor}
      <AlertTriangle
        className="h-3.5 w-3.5 shrink-0 text-amber-500"
        aria-label="Valor discrepante"
      />
    </span>
  );
}

/* Modal flotante con la tabla comparativa de los documentos */
function ModalDetalleCliente({ exp, onClose }) {
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

  const estado = obtenerEstatusAmigable(exp);
  const matriz = exp.validacionCruzada || [];
  const discrepancias = matriz.filter((f) => f.estado !== "coincide").length;
  const correctos = matriz.length - discrepancias;

  return (
    <div
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
      className={`fixed inset-0 z-50 flex items-end justify-center bg-slate-900/40 p-0 backdrop-blur-md transition-opacity duration-200 sm:items-center sm:p-6 ${
        visible ? "opacity-100" : "opacity-0"
      }`}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`Detalle de ${exp.inmueble}`}
        className={`flex max-h-[92vh] w-full max-w-6xl flex-col overflow-hidden rounded-t-3xl border border-slate-900/[0.07] bg-white/95 text-slate-900 shadow-[0_25px_60px_-15px_rgba(15,23,42,0.35),inset_0_1px_0_rgba(255,255,255,0.9)] backdrop-blur-2xl transition-all duration-300 sm:rounded-3xl ${
          visible ? "translate-y-0 scale-100" : "translate-y-4 scale-[0.98]"
        }`}
      >
        {/* Encabezado del Modal */}
        <div className="flex items-start justify-between gap-4 border-b border-slate-900/[0.07] px-6 py-5">
          <div className="min-w-0">
            <div className="mb-1.5 flex flex-wrap items-center gap-2.5">
              <span className="rounded-md bg-slate-900/[0.06] px-2.5 py-0.5 font-mono text-xs font-medium text-slate-600">
                Folio: {exp.id}
              </span>
              <span
                className={`rounded-full border px-3 py-0.5 text-xs font-bold ${estado.estilosBadge}`}
              >
                {estado.badge}
              </span>
            </div>
            <h3 className={`${DISPLAY} truncate text-xl font-bold text-slate-900 sm:text-2xl`}>
              {exp.inmueble}
            </h3>
            <p className="mt-0.5 text-xs text-slate-500">
              Enviado el {exp.fechaSubida} • {exp.cliente}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar detalle"
            className="cursor-pointer rounded-full p-2 text-slate-400 transition hover:bg-slate-900/[0.06] hover:text-slate-700"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Contenido desplazable */}
        <div className="flex-1 space-y-5 overflow-y-auto p-5 sm:p-6">
          {/* Resumen amigable */}
          <div className="rounded-2xl border border-slate-900/[0.07] bg-gradient-to-br from-[#e81c24]/10 via-white to-amber-300/15 p-4 sm:p-5">
            <p className="text-sm font-bold text-slate-900">{estado.titulo}</p>
            <p className="mt-1 text-sm leading-relaxed text-slate-600">
              {estado.descripcion}
            </p>
          </div>

          {/* Tabla comparativa de los 4 documentos */}
          {matriz.length > 0 ? (
            <div className="overflow-hidden rounded-3xl border border-slate-900/[0.07] bg-white shadow-xs">
              <div className="flex flex-col justify-between gap-3 border-b border-slate-900/[0.07] px-5 py-4 sm:flex-row sm:items-center">
                <div>
                  <h4 className={`${DISPLAY} text-base font-bold text-slate-900`}>
                    Comparación de datos entre tus 4 documentos
                  </h4>
                  <p className="mt-0.5 text-xs text-slate-500">
                    Revisamos que el nombre, dirección y medidas coincidan en todos tus papeles.
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2 text-xs font-semibold">
                  <span className="rounded-full bg-emerald-500/10 px-3 py-1 text-emerald-700">
                    {correctos} coinciden
                  </span>
                  {discrepancias > 0 && (
                    <span className="rounded-full bg-amber-500/15 px-3 py-1 text-amber-800">
                      {discrepancias} por revisar
                    </span>
                  )}
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
                          <td className="px-5 py-3.5 font-semibold text-slate-900">
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
                                <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-2.5 py-1 text-xs font-medium text-amber-800">
                                  <AlertTriangle className="h-3.5 w-3.5" /> Discrepancia
                                </span>
                                <p className="mt-1 max-w-[230px] text-xs text-amber-800">
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
          ) : (
            <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50/70 p-8 text-center">
              <Loader2 className="mx-auto mb-2.5 h-7 w-7 animate-spin text-[#e81c24]" />
              <p className={`${DISPLAY} text-base font-bold text-slate-900`}>
                Aún estamos leyendo tus documentos ({exp.progreso}%)
              </p>
              <p className="mx-auto mt-1 max-w-md text-xs text-slate-500">
                En cuanto terminemos de revisar tus 4 archivos, aquí aparecerá el desglose completo
                campo por campo.
              </p>
            </div>
          )}
        </div>

        {/* Pie del modal */}
        <div className="flex justify-end border-t border-slate-900/[0.07] px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            className="cursor-pointer rounded-full bg-[#e81c24] px-6 py-2.5 text-sm font-semibold text-white shadow-[0_10px_25px_-8px_rgba(232,28,36,0.75)] transition hover:bg-[#f0262e]"
          >
            Cerrar ventana
          </button>
        </div>
      </div>
    </div>
  );
}

export default function PanelCliente({ expedientes, onNuevoPredio }) {
  const [filtroRapido, setFiltroRapido] = useState("todos");
  const [fechaDesde, setFechaDesde] = useState("");
  const [fechaHasta, setFechaHasta] = useState("");
  const [expDetalle, setExpDetalle] = useState(null);

  const hayFiltroActivo =
    filtroRapido !== "todos" || fechaDesde !== "" || fechaHasta !== "";

  const limpiarFiltros = () => {
    setFiltroRapido("todos");
    setFechaDesde("");
    setFechaHasta("");
  };

  const handleSeleccionRapida = (id) => {
    setFiltroRapido(id);
    setFechaDesde("");
    setFechaHasta("");
  };

  const handleCambioRango = (tipo, valor) => {
    setFiltroRapido("rango");
    if (tipo === "desde") setFechaDesde(valor);
    if (tipo === "hasta") setFechaHasta(valor);
    if (
      (tipo === "desde" && valor === "" && fechaHasta === "") ||
      (tipo === "hasta" && valor === "" && fechaDesde === "")
    ) {
      setFiltroRapido("todos");
    }
  };

  const expedientesFiltrados = useMemo(() => {
    const hoy = new Date();
    const inicioHoy = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());

    return expedientes.filter((exp) => {
      const fechaExp = obtenerFechaExpediente(exp);
      if (!fechaExp) return true;

      if (filtroRapido === "hoy") {
        return fechaExp.getTime() === inicioHoy.getTime();
      }
      if (filtroRapido === "7dias") {
        const hace7Dias = new Date(inicioHoy);
        hace7Dias.setDate(inicioHoy.getDate() - 7);
        return fechaExp >= hace7Dias && fechaExp <= inicioHoy;
      }
      if (filtroRapido === "mes") {
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
  }, [expedientes, filtroRapido, fechaDesde, fechaHasta]);

  // Mantiene sincronizado el modal si el expediente termina de analizarse mientras está abierto
  const expedienteModalActualizado = expDetalle
    ? expedientes.find((e) => e.id === expDetalle.id) || expDetalle
    : null;

  return (
    <div className="relative z-10 mx-auto max-w-5xl px-4 py-8 text-slate-900 sm:px-6 sm:py-10">
      {/* Modal flotante con tabla comparativa */}
      {expedienteModalActualizado && (
        <ModalDetalleCliente
          exp={expedienteModalActualizado}
          onClose={() => setExpDetalle(null)}
        />
      )}

      {/* Encabezado de Bienvenida */}
      <div
        className={`${PANEL} mb-6 flex flex-col justify-between gap-6 p-6 sm:p-8 md:flex-row md:items-center`}
      >
        <div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-red-500/10 px-3 py-1 text-xs font-semibold text-[#e81c24]">
            <Sparkles className="h-3.5 w-3.5" /> Portal de Propietarios y Corredores
          </span>
          <h2 className={`${DISPLAY} mt-2 text-3xl font-bold leading-tight sm:text-4xl`}>
            ¡Hola, Grupo Inmobiliario!
          </h2>
          <p className="mt-1.5 max-w-xl text-sm leading-relaxed text-slate-600">
            Aquí puedes consultar el estatus de tus locales enviados o registrar uno nuevo en
            menos de 2 minutos.
          </p>
        </div>

        <button
          onClick={onNuevoPredio}
          className="inline-flex shrink-0 cursor-pointer items-center justify-center gap-2 rounded-full bg-[#e81c24] px-6 py-4 text-sm font-bold text-white shadow-[0_12px_30px_-8px_rgba(232,28,36,0.75)] transition hover:-translate-y-0.5 hover:bg-[#f0262e] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#e81c24]"
        >
          <Plus className="h-5 w-5" strokeWidth={2.5} />
          Subir nuevo predio o local
        </button>
      </div>

      {/* Buscador por fechas / días / rangos */}
      <div className={`${PANEL} mb-6 p-5 sm:p-6`}>
        <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
          <div>
            <p className="flex items-center gap-2 text-sm font-bold text-slate-900">
              <Calendar className="h-4 w-4 text-[#e81c24]" />
              Buscar reportes por fecha
            </p>
            <p className="mt-0.5 text-xs text-slate-500">
              Elige un periodo rápido o selecciona un rango exacto de días.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            {FILTROS_RAPIDOS.map((item) => {
              const activo = filtroRapido === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleSeleccionRapida(item.id)}
                  className={`cursor-pointer rounded-full px-4 py-2 text-xs font-semibold transition ${
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

        <div className="mt-4 flex flex-col gap-3 border-t border-slate-900/[0.06] pt-4 sm:flex-row sm:items-end">
          <div className="flex-1">
            <label
              htmlFor="fecha-desde"
              className="mb-1 block text-xs font-medium text-slate-600"
            >
              Desde el día
            </label>
            <input
              id="fecha-desde"
              type="date"
              value={fechaDesde}
              onChange={(e) => handleCambioRango("desde", e.target.value)}
              className="w-full cursor-pointer rounded-2xl border border-slate-200 bg-white/90 px-3.5 py-2.5 text-sm text-slate-900 outline-none transition focus:border-[#e81c24]/70 focus:ring-4 focus:ring-[#e81c24]/15"
            />
          </div>

          <div className="flex-1">
            <label
              htmlFor="fecha-hasta"
              className="mb-1 block text-xs font-medium text-slate-600"
            >
              Hasta el día
            </label>
            <input
              id="fecha-hasta"
              type="date"
              value={fechaHasta}
              min={fechaDesde || undefined}
              onChange={(e) => handleCambioRango("hasta", e.target.value)}
              className="w-full cursor-pointer rounded-2xl border border-slate-200 bg-white/90 px-3.5 py-2.5 text-sm text-slate-900 outline-none transition focus:border-[#e81c24]/70 focus:ring-4 focus:ring-[#e81c24]/15"
            />
          </div>

          {hayFiltroActivo && (
            <button
              type="button"
              onClick={limpiarFiltros}
              className="inline-flex shrink-0 cursor-pointer items-center justify-center gap-1.5 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-100 hover:text-slate-900"
            >
              <X className="h-3.5 w-3.5" /> Limpiar fechas
            </button>
          )}
        </div>
      </div>

      {/* Título de resultados */}
      <div className="mb-4 flex items-center justify-between">
        <h3 className={`${DISPLAY} text-xl font-bold text-slate-900`}>
          Tus locales enviados ({expedientesFiltrados.length})
        </h3>
        {hayFiltroActivo && (
          <span className="rounded-full bg-[#e81c24]/10 px-3 py-1 text-xs font-semibold text-[#e81c24]">
            Mostrando resultados filtrados
          </span>
        )}
      </div>

      {/* Lista de Predios Registrados */}
      {expedientesFiltrados.length === 0 ? (
        <div className={`${PANEL} p-12 text-center`}>
          {hayFiltroActivo ? (
            <>
              <Search className="mx-auto mb-3 h-10 w-10 text-slate-400" />
              <h4 className={`${DISPLAY} text-lg font-bold`}>
                No encontramos locales en esas fechas
              </h4>
              <p className="mx-auto mt-1 max-w-md text-sm text-slate-500">
                Intenta elegir otro rango de días o presiona el botón para volver a ver todos tus
                registros.
              </p>
              <button
                type="button"
                onClick={limpiarFiltros}
                className="mt-5 inline-flex cursor-pointer items-center gap-2 rounded-full bg-[#e81c24] px-5 py-2.5 text-sm font-semibold text-white shadow-[0_10px_25px_-8px_rgba(232,28,36,0.75)] transition hover:bg-[#f0262e]"
              >
                Ver todos mis locales
              </button>
            </>
          ) : (
            <>
              <Building2 className="mx-auto mb-3 h-10 w-10 text-slate-400" />
              <h4 className={`${DISPLAY} text-lg font-bold`}>Aún no has enviado ningún local</h4>
              <p className="mx-auto mt-1 max-w-md text-sm text-slate-500">
                Presiona el botón rojo de arriba para subir los 4 documentos de tu propiedad.
              </p>
            </>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {expedientesFiltrados.map((exp) => {
            const estado = obtenerEstatusAmigable(exp);
            const IconoEstado = estado.Icono;

            return (
              <div
                key={exp.id}
                className={`${PANEL} p-5 transition hover:bg-white/90 sm:p-6`}
              >
                <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
                  {/* Info principal del local */}
                  <div className="flex items-start gap-4">
                    <div
                      className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl shadow-sm ${estado.colorIcono}`}
                    >
                      <IconoEstado
                        className={`h-6 w-6 ${estado.animar ? "animate-spin" : ""}`}
                      />
                    </div>
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-md bg-slate-900/[0.06] px-2 py-0.5 font-mono text-xs font-medium text-slate-600">
                          Folio: {exp.id}
                        </span>
                        <span className="flex items-center gap-1 text-xs text-slate-500">
                          <Clock className="h-3.5 w-3.5" /> Enviado el{" "}
                          {exp.fechaSubida}
                        </span>
                      </div>

                      <h4
                        className={`${DISPLAY} mt-1 text-lg font-bold text-slate-900 sm:text-xl`}
                      >
                        {exp.inmueble}
                      </h4>
                      <p className="mt-0.5 text-xs text-slate-500">
                        Registrado por: {exp.cliente}
                      </p>
                    </div>
                  </div>

                  {/* Etiqueta de estatus */}
                  <span
                    className={`self-start whitespace-nowrap rounded-full border px-3.5 py-1.5 text-xs font-bold ${estado.estilosBadge}`}
                  >
                    {estado.badge}
                  </span>
                </div>

                {/* Caja explicativa sencilla para el cliente */}
                <div className="mt-4 rounded-2xl bg-slate-900/[0.03] p-4">
                  <p className="text-sm font-semibold text-slate-900">
                    {estado.titulo}
                  </p>
                  <p className="mt-1 text-xs leading-relaxed text-slate-600">
                    {estado.descripcion}
                  </p>

                  {exp.progreso < 100 && (
                    <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-slate-900/[0.08]">
                      <div
                        className="h-full rounded-full bg-[#e81c24] transition-all duration-500"
                        style={{ width: `${exp.progreso}%` }}
                      />
                    </div>
                  )}

                  <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-slate-900/[0.06] pt-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs font-medium text-slate-500">
                        Documentos entregados:
                      </span>
                      {exp.documentos.map((doc, idx) => (
                        <span
                          key={idx}
                          className="inline-flex items-center gap-1 rounded-lg bg-white px-2.5 py-1 text-xs text-slate-700 shadow-2xs ring-1 ring-slate-900/10"
                        >
                          <FileText className="h-3 w-3 text-[#e81c24]" />
                          {doc.tipo}
                        </span>
                      ))}
                    </div>

                    {/* Botón para abrir la tabla comparativa en ventana flotante */}
                    <button
                      type="button"
                      onClick={() => setExpDetalle(exp)}
                      className="inline-flex shrink-0 cursor-pointer items-center gap-2 rounded-full bg-[#e81c24] px-4 py-2 text-xs font-semibold text-white transition hover:bg-slate-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#e81c24]"
                    >
                      <Eye className="h-3.5 w-3.5" />
                      Ver detalle de revisión
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}