import {
  Plus,
  Building2,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  FileText,
  Sparkles,
} from "lucide-react";

const DISPLAY = "font-['Bricolage_Grotesque',ui-sans-serif,system-ui,sans-serif]";
const PANEL =
  "rounded-3xl border border-slate-900/[0.07] bg-white/70 backdrop-blur-2xl shadow-[0_20px_50px_-24px_rgba(90,40,40,0.28),inset_0_1px_0_rgba(255,255,255,0.9)]";

// Traduce los estados técnicos a lenguaje claro para cualquier persona
const obtenerEstatusAmigable = (exp) => {
  if (exp.recomendacion === "Cumple") {
    return {
      titulo: "¡Tu local cumple con los requisitos!",
      descripcion: "Todos tus documentos coinciden. Un asesor de Tiendas 3B te contactará pronto.",
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
    descripcion: "Esto toma solo unos segundos. Estamos verificando que todos tus datos coincidan.",
    badge: `Revisando (${exp.progreso}%)`,
    estilosBadge: "bg-sky-500/15 text-sky-700 border-sky-500/30",
    Icono: Loader2,
    colorIcono: "bg-[#e81c24] text-white",
    animar: true,
  };
};

export default function PanelCliente({ expedientes, onNuevoPredio }) {
  return (
    <div className="relative z-10 mx-auto max-w-5xl px-4 py-8 text-slate-900 sm:px-6 sm:py-10">
      {/* Encabezado de Bienvenida */}
      <div
        className={`${PANEL} mb-8 flex flex-col justify-between gap-6 p-6 sm:p-8 md:flex-row md:items-center`}
      >
        <div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-red-500/10 px-3 py-1 text-xs font-semibold text-[#e81c24]">
            <Sparkles className="h-3.5 w-3.5" /> Portal de Propietarios y Corredores
          </span>
          <h2 className={`${DISPLAY} mt-2 text-3xl font-bold leading-tight sm:text-4xl`}>
            ¡Hola, Departamento Inmobiliario!
          </h2>
          <p className="mt-1.5 max-w-xl text-sm leading-relaxed text-slate-600">
            Aquí puedes ver el avance de los locales que nos has enviado o registrar uno nuevo en menos de 2 minutos.
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

      {/* Lista de Predios Registrados */}
      <div className="mb-4 flex items-center justify-between">
        <h3 className={`${DISPLAY} text-xl font-bold text-slate-900`}>
          Tus locales enviados ({expedientes.length})
        </h3>
      </div>

      {expedientes.length === 0 ? (
        <div className={`${PANEL} p-12 text-center`}>
          <Building2 className="mx-auto mb-3 h-10 w-10 text-slate-400" />
          <h4 className={`${DISPLAY} text-lg font-bold`}>Aún no has enviado ningún local</h4>
          <p className="mx-auto mt-1 max-w-md text-sm text-slate-500">
            Presiona el botón rojo de arriba para subir los 4 documentos de tu propiedad.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {expedientes.map((exp) => {
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
                          <Clock className="h-3.5 w-3.5" /> Enviado el {exp.fechaSubida}
                        </span>
                      </div>

                      <h4 className={`${DISPLAY} mt-1 text-lg font-bold text-slate-900 sm:text-xl`}>
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
                  <p className="text-sm font-semibold text-slate-900">{estado.titulo}</p>
                  <p className="mt-1 text-xs leading-relaxed text-slate-600">
                    {estado.descripcion}
                  </p>

                  {/* Barra visual si sigue analizando */}
                  {exp.progreso < 100 && (
                    <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-slate-900/[0.08]">
                      <div
                        className="h-full rounded-full bg-[#e81c24] transition-all duration-500"
                        style={{ width: `${exp.progreso}%` }}
                      />
                    </div>
                  )}

                  {/* Resumen de los 4 archivos subidos */}
                  <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-slate-900/[0.06] pt-3">
                    <span className="text-xs font-medium text-slate-500">Documentos entregados:</span>
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
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}