import { useRef, useState } from "react";
import {
  Upload,
  FileText,
  Building,
  Send,
  User,
  X,
  AlertCircle,
  ScrollText,
  Receipt,
  MapPin,
  Store,
  Check,
} from "lucide-react";

const DISPLAY = "font-['Bricolage_Grotesque',ui-sans-serif,system-ui,sans-serif]";

const PANEL_BASE =
  "rounded-3xl border backdrop-blur-2xl shadow-[0_20px_50px_-24px_rgba(90,40,40,0.28),inset_0_1px_0_rgba(255,255,255,0.9)]";
const PANEL = `${PANEL_BASE} border-slate-900/[0.07] bg-white/70`;
const INPUT =
  "w-full rounded-2xl border border-slate-200 bg-white/80 py-3 pl-11 pr-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[#e81c24]/70 focus:ring-4 focus:ring-[#e81c24]/20";

const DOCUMENTOS_REQUERIDOS = [
  {
    id: "escrituras",
    titulo: "Escrituras del Inmueble",
    descripcion: "Identificación del propietario, dirección y superficie del terreno.",
    Icono: ScrollText,
  },
  {
    id: "predial",
    titulo: "Boleta Predial",
    descripcion: "Contribuyente, clave predial y superficie registrada.",
    Icono: Receipt,
  },
  {
    id: "alineamiento",
    titulo: "Alineamiento y Número Oficial",
    descripcion: "Número oficial asignado, vigencia y autoridad emisora.",
    Icono: MapPin,
  },
  {
    id: "usoSuelo",
    titulo: "Certificado de Uso de Suelo",
    descripcion: "Compatibilidad comercial, superficie aplicable y restricciones.",
    Icono: Store,
  },
];

const EXTENSIONES_VALIDAS = [".pdf", ".png", ".jpg", ".jpeg"];
const ARCHIVOS_VACIOS = { escrituras: null, predial: null, alineamiento: null, usoSuelo: null };

const formatearTamano = (bytes) =>
  bytes < 1024 * 1024
    ? `${Math.max(1, Math.round(bytes / 1024))} KB`
    : `${(bytes / (1024 * 1024)).toFixed(1)} MB`;

const esArchivoValido = (file) =>
  EXTENSIONES_VALIDAS.some((ext) => file.name.toLowerCase().endsWith(ext));

function Anillo({ listos, total, tam = "h-36 w-36" }) {
  const r = 54;
  const c = 2 * Math.PI * r;
  const completo = listos === total;
  return (
    <div className={`relative shrink-0 ${tam}`}>
      <svg viewBox="0 0 128 128" className="h-full w-full -rotate-90">
        <circle cx="64" cy="64" r={r} fill="none" stroke="rgba(15,23,42,0.08)" strokeWidth="10" />
        <circle
          cx="64"
          cy="64"
          r={r}
          fill="none"
          stroke={completo ? "#10b981" : "#e81c24"}
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - listos / total)}
          className="transition-all duration-700 ease-out motion-reduce:transition-none"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={`${DISPLAY} text-4xl font-bold leading-none text-slate-900`}>
          {listos}/{total}
        </span>
        <span className="mt-1 text-xs text-slate-500">listos</span>
      </div>
    </div>
  );
}

export default function PortalCliente({ onEnviarExpediente }) {
  const [inmueble, setInmueble] = useState("");
  const [cliente, setCliente] = useState("");
  const [archivos, setArchivos] = useState(ARCHIVOS_VACIOS);
  const [enviado, setEnviado] = useState(false);
  const [arrastrando, setArrastrando] = useState(null);
  const [recienCargado, setRecienCargado] = useState(null);
  const [errores, setErrores] = useState({});
  const inputsRef = useRef({});

  const handleArchivoChange = (id, file) => {
    if (!file) return;
    if (!esArchivoValido(file)) {
      setErrores((prev) => ({ ...prev, [id]: "Solo se aceptan archivos PDF, PNG o JPG." }));
      return;
    }
    setErrores((prev) => ({ ...prev, [id]: null }));
    setArchivos((prev) => ({ ...prev, [id]: file }));
    setRecienCargado(id);
    setTimeout(() => setRecienCargado((actual) => (actual === id ? null : actual)), 800);
  };

  const quitarArchivo = (id) => {
    setArchivos((prev) => ({ ...prev, [id]: null }));
    if (inputsRef.current[id]) inputsRef.current[id].value = "";
  };

  const listos = Object.values(archivos).filter(Boolean).length;
  const total = DOCUMENTOS_REQUERIDOS.length;
  const todosSubidos = inmueble.trim() !== "" && cliente.trim() !== "" && listos === total;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!todosSubidos) return;

    const nuevoExpediente = {
      id: `EXP-2026-00${Math.floor(Math.random() * 90 + 10)}`,
      inmueble,
      cliente,
      fechaSubida: new Date().toLocaleString("es-MX", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }),
      progreso: 15,
      etapaActual: "Agente Clasificador recibiendo documentos...",
      recomendacion: "En proceso",
      resumenEjecutivo:
        "Expediente recién ingresado. Los agentes están extrayendo texto y validando reglas.",
      validacionCruzada: [],
      documentos: DOCUMENTOS_REQUERIDOS.map((doc) => ({
        tipo: doc.titulo.replace(/^\d+\.\s/, ""),
        nombreArchivo: archivos[doc.id]?.name || "documento.pdf",
        estatus: "Analizando",
        hallazgos: [],
      })),
    };

    onEnviarExpediente(nuevoExpediente);
    setEnviado(true);
  };

  const reiniciar = () => {
    setEnviado(false);
    setInmueble("");
    setCliente("");
    setArchivos(ARCHIVOS_VACIOS);
    setErrores({});
  };

  /* ---------- Confirmación ---------- */
  if (enviado) {
    return (
      <div className="relative z-10 px-4 py-14 text-slate-900">
        <div className={`${PANEL} mx-auto flex max-w-lg flex-col items-center p-8 text-center sm:p-10`}>
          <Anillo listos={total} total={total} tam="h-32 w-32" />
          <h2 className={`${DISPLAY} mt-6 text-2xl font-bold sm:text-3xl`}>Todo en camino</h2>
          <p className="mt-2 max-w-sm text-sm leading-relaxed text-slate-600">
            Los 4 documentos de <strong className="text-slate-900">{inmueble}</strong> ya los están
            revisando nuestros agentes de IA. Legal 3B verá el dictamen en cuanto terminen.
          </p>
          <button
            onClick={reiniciar}
            className="mt-7 cursor-pointer rounded-full bg-slate-900 px-6 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#e81c24]"
          >
            Subir otro inmueble
          </button>
        </div>
      </div>
    );
  }

  /* ---------- Formulario ---------- */
  return (
    <div className="relative z-10 mx-auto max-w-4xl px-4 py-8 text-slate-900 sm:px-6 sm:py-10">
      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Datos del predio */}
        <div className={`${PANEL} p-6 sm:p-8`}>
          <h2 className={`${DISPLAY} text-3xl font-bold leading-tight sm:text-4xl`}>
            Registra un nuevo predio o local
          </h2>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-slate-500">
            Sube los 4 documentos legales y el sistema los clasifica y compara entre sí por ti.
          </p>

          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="inmueble" className="mb-1.5 block text-sm font-medium text-slate-700">
                Nombre o dirección del inmueble
              </label>
              <div className="relative">
                <Building className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                <input
                  id="inmueble"
                  type="text"
                  required
                  placeholder="Ej. Local Av. Insurgentes Sur #1240"
                  value={inmueble}
                  onChange={(e) => setInmueble(e.target.value)}
                  className={INPUT}
                />
              </div>
            </div>
            <div>
              <label htmlFor="cliente" className="mb-1.5 block text-sm font-medium text-slate-700">
                Propietario o corredor que envía
              </label>
              <div className="relative">
                <User className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                <input
                  id="cliente"
                  type="text"
                  required
                  placeholder="Ej. Grupo Inmobiliario del Valle S.A."
                  value={cliente}
                  onChange={(e) => setCliente(e.target.value)}
                  className={INPUT}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Progreso y envío (Debajo de Registrar) */}
        <div className={`${PANEL} flex flex-col items-center justify-between gap-6 p-6 sm:p-8 md:flex-row`}>
          <div className="flex flex-col items-center gap-6 sm:flex-row">
            <Anillo listos={listos} total={total} />
            <div className="w-full min-w-0">
              <p className={`${DISPLAY} text-lg font-bold`}>
                {listos}/{total} documentos listos
              </p>
              <ul className="mt-3 space-y-2">
                {DOCUMENTOS_REQUERIDOS.map((doc) => {
                  const ok = Boolean(archivos[doc.id]);
                  return (
                    <li key={doc.id} className="flex items-center gap-2.5 text-sm">
                      <span
                        className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full transition-colors duration-300 ${
                          ok ? "bg-emerald-500 text-white" : "border border-slate-300"
                        }`}
                      >
                        {ok && <Check className="h-3 w-3" strokeWidth={3} />}
                      </span>
                      <span className={`truncate ${ok ? "text-slate-900" : "text-slate-500"}`}>
                        {doc.titulo}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </div>
          </div>

          <div className="w-full md:w-auto md:max-w-xs">
            <button
              type="submit"
              disabled={!todosSubidos}
              className={`flex w-full items-center justify-center gap-2 rounded-full px-6 py-3.5 text-sm font-semibold transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#e81c24] ${
                todosSubidos
                  ? "cursor-pointer bg-[#e81c24] text-white shadow-[0_10px_30px_-8px_rgba(232,28,36,0.75)] hover:bg-[#f0262e]"
                  : "cursor-not-allowed bg-slate-900/[0.06] text-slate-400"
              }`}
            >
              <Send className="h-4 w-4" />
              Enviar documentación
            </button>
            <p className="mt-2.5 text-center text-xs text-slate-500">
              Los 4 documentos son obligatorios para iniciar la validación cruzada.
            </p>
          </div>
        </div>

        {/* Zonas de carga */}
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          {DOCUMENTOS_REQUERIDOS.map((doc) => {
            const archivo = archivos[doc.id];
            const activa = arrastrando === doc.id;
            const pulso = recienCargado === doc.id;
            const error = errores[doc.id];
            const Icono = doc.Icono;

            return (
              <div
                key={doc.id}
                onDragOver={(e) => {
                  e.preventDefault();
                  if (arrastrando !== doc.id) setArrastrando(doc.id);
                }}
                onDragEnter={(e) => {
                  e.preventDefault();
                  setArrastrando(doc.id);
                }}
                onDragLeave={(e) => {
                  if (!e.currentTarget.contains(e.relatedTarget)) setArrastrando(null);
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  setArrastrando(null);
                  handleArchivoChange(doc.id, e.dataTransfer.files?.[0]);
                }}
                className={`${PANEL_BASE} p-5 transition duration-300 motion-reduce:transition-none ${
                  activa
                    ? "scale-[1.02] border-[#e81c24]/70 bg-[#e81c24]/10"
                    : archivo
                    ? "border-emerald-400/60 bg-white/70"
                    : "border-slate-900/[0.07] bg-white/70"
                }`}
              >
                <div className="flex items-start gap-3.5">
                  <div className="relative shrink-0">
                    {pulso && (
                      <span className="absolute inset-0 animate-ping rounded-2xl bg-emerald-400/50 motion-reduce:hidden" />
                    )}
                    <div
                      className={`relative flex h-11 w-11 items-center justify-center rounded-2xl transition-colors duration-300 ${
                        archivo ? "bg-emerald-500 text-white" : "bg-slate-900/[0.06] text-slate-700"
                      }`}
                    >
                      {archivo ? <Check className="h-5 w-5" strokeWidth={3} /> : <Icono className="h-5 w-5" />}
                    </div>
                  </div>
                  <div className="min-w-0">
                    <h3 className={`${DISPLAY} text-base font-bold`}>{doc.titulo}</h3>
                    <p className="mt-0.5 text-xs leading-relaxed text-slate-500">{doc.descripcion}</p>
                  </div>
                </div>

                <div className="mt-4">
                  {archivo ? (
                    <div className="flex items-center gap-3 rounded-2xl bg-slate-900/[0.04] px-3 py-2.5">
                      <FileText className="h-5 w-5 shrink-0 text-emerald-600" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-slate-900">{archivo.name}</p>
                        <p className="text-xs text-slate-500">{formatearTamano(archivo.size)}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => quitarArchivo(doc.id)}
                        aria-label={`Quitar ${doc.titulo}`}
                        className="cursor-pointer rounded-full p-1.5 text-slate-500 transition hover:bg-slate-900/[0.06] hover:text-slate-900 focus-visible:outline-2 focus-visible:outline-[#e81c24]"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ) : (
                    <label
                      className={`flex cursor-pointer flex-col items-center justify-center gap-1.5 rounded-2xl border border-dashed px-4 py-7 text-center transition ${
                        activa
                          ? "border-[#e81c24] bg-[#e81c24]/10 text-slate-900"
                          : "border-slate-300 bg-white/50 text-slate-600 hover:border-slate-400 hover:bg-white/80"
                      }`}
                    >
                      <Upload className={`h-5 w-5 transition-transform ${activa ? "-translate-y-1" : ""}`} />
                      <span className="text-sm font-medium">
                        {activa ? "Suéltalo aquí" : "Arrastra tu archivo o haz clic"}
                      </span>
                      <span className="text-xs text-slate-500">PDF, PNG o JPG</span>
                      <input
                        ref={(el) => (inputsRef.current[doc.id] = el)}
                        type="file"
                        accept=".pdf,.png,.jpg,.jpeg"
                        className="sr-only"
                        onChange={(e) => handleArchivoChange(doc.id, e.target.files[0])}
                      />
                    </label>
                  )}
                  {error && (
                    <p className="mt-2 flex items-center gap-1.5 text-xs text-red-600">
                      <AlertCircle className="h-3.5 w-3.5" /> {error}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </form>
    </div>
  );
}