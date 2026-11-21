import { useEffect, useRef, useState } from "react";
import logo3b from "../img/logo1.png"; 


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
  ArrowLeft,
  AlertTriangle,
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
  const [mostrandoLogo, setMostrandoLogo] = useState(false);
  const prevListos = useRef(listos);

  useEffect(() => {
    if (listos === total && prevListos.current < total) {
      setMostrandoLogo(true);
      const timer = setTimeout(() => {
        setMostrandoLogo(false);
      }, 2200);
      prevListos.current = listos;
      return () => clearTimeout(timer);
    }

    if (listos < total) {
      setMostrandoLogo(false);
    }
    prevListos.current = listos;
  }, [listos, total]);

  const r = 54;
  const c = 2 * Math.PI * r;
  const completo = listos === total;

  return (
    <div
      className={`relative shrink-0 transition-transform duration-500 ${
        mostrandoLogo ? "scale-105" : "scale-100"
      } ${tam}`}
    >
      {/* Destello sutil detrás cuando aparece el logo 3B */}
      {mostrandoLogo && (
        <span className="absolute inset-0 animate-ping rounded-full bg-[#e81c24]/25 motion-reduce:hidden" />
      )}

      {/* Anillo SVG */}
      <svg viewBox="0 0 128 128" className="relative h-full w-full -rotate-90">
        <circle cx="64" cy="64" r={r} fill="none" stroke="rgba(15,23,42,0.08)" strokeWidth="10" />
        <circle
          cx="64"
          cy="64"
          r={r}
          fill="none"
          stroke={completo && !mostrandoLogo ? "#10b981" : "#e81c24"}
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - listos / total)}
          className="transition-all duration-700 ease-out motion-reduce:transition-none"
        />
      </svg>

      {/* Capa 1: Logo circular de Tiendas 3B ocupando el 100% del círculo */}
      <div
        className={`absolute inset-0 z-10 overflow-hidden rounded-full bg-[#e81c24] shadow-md transition-all duration-500 ${
          mostrandoLogo ? "scale-100 opacity-100" : "pointer-events-none scale-75 opacity-0"
        }`}
      >
        <img
          src={logo3b}
          alt="Logo Tiendas 3B"
          className="h-full w-full scale-105 object-cover"
        />
      </div>

      {/* Capa 2: Contador numérico (ej. 3/4 o 4/4 listos) */}
      <div
        className={`absolute inset-0 flex flex-col items-center justify-center transition-all duration-500 ${
          mostrandoLogo ? "scale-75 opacity-0" : "scale-100 opacity-100"
        }`}
      >
        <span className={`${DISPLAY} text-4xl font-bold leading-none text-slate-900`}>
          {listos}/{total}
        </span>
        <span className="mt-1 text-xs text-slate-500">listos</span>
      </div>
    </div>
  );
}

/* Modal de alerta con fondo transparente borroso */
function ModalAlerta({ alerta, onCerrar }) {
  if (!alerta) return null;

  return (
    <div
      onMouseDown={(e) => e.target === e.currentTarget && onCerrar()}
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-md transition-opacity"
    >
      <div
        role="alertdialog"
        aria-modal="true"
        className="relative mx-auto flex w-full max-w-md flex-col items-center rounded-3xl border border-slate-900/[0.07] bg-white/95 p-8 text-center text-slate-900 shadow-[0_25px_60px_-15px_rgba(15,23,42,0.35),inset_0_1px_0_rgba(255,255,255,0.9)] backdrop-blur-2xl"
      >
        <button
          type="button"
          onClick={onCerrar}
          aria-label="Cerrar aviso"
          className="absolute right-4 top-4 cursor-pointer rounded-full p-2 text-slate-400 transition hover:bg-slate-900/[0.06] hover:text-slate-700"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Icono principal */}
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-[#e81c24]/15 text-[#e81c24] ring-8 ring-[#e81c24]/5">
          <AlertTriangle className="h-10 w-10" strokeWidth={2.2} />
        </div>

        <h3 className={`${DISPLAY} mt-5 text-2xl font-bold leading-tight text-slate-900`}>
          {alerta.titulo}
        </h3>
        <p className="mt-2 text-sm leading-relaxed text-slate-600">
          {alerta.mensaje}
        </p>

        {/* Lista de pendientes */}
        {alerta.pendientes && alerta.pendientes.length > 0 && (
          <ul className="mt-5 w-full space-y-2 rounded-2xl border border-slate-200/80 bg-slate-50/90 p-4 text-left">
            {alerta.pendientes.map((item, idx) => (
              <li key={idx} className="flex items-start gap-2.5 text-sm text-slate-800">
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#e81c24]/15 text-xs font-bold text-[#e81c24]">
                  !
                </span>
                <span className="font-medium">{item}</span>
              </li>
            ))}
          </ul>
        )}

        <button
          type="button"
          onClick={onCerrar}
          className="mt-7 w-full cursor-pointer rounded-full bg-[#e81c24] px-6 py-3.5 text-sm font-semibold text-white shadow-[0_10px_30px_-8px_rgba(232,28,36,0.75)] transition hover:bg-[#f0262e] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#e81c24]"
        >
          Entendido, completar datos
        </button>
      </div>
    </div>
  );
}

export default function PortalCliente({ onEnviarExpediente, onVolver }) {
  const [inmueble, setInmueble] = useState("");
  const [cliente, setCliente] = useState("");
  const [archivos, setArchivos] = useState(ARCHIVOS_VACIOS);
  const [enviado, setEnviado] = useState(false);
  const [arrastrando, setArrastrando] = useState(null);
  const [recienCargado, setRecienCargado] = useState(null);
  const [errores, setErrores] = useState({});
  const [alertaModal, setAlertaModal] = useState(null);
  const inputsRef = useRef({});

  const handleArchivoChange = (id, file) => {
    if (!file) return;
    if (!esArchivoValido(file)) {
      const msg = "Solo se aceptan archivos en formato PDF, PNG o JPG.";
      setErrores((prev) => ({ ...prev, [id]: msg }));
      setAlertaModal({
        titulo: "Formato de archivo no válido",
        mensaje: `El archivo "${file.name}" no se puede subir. Por favor elige una foto o documento válido.`,
        pendientes: ["Formatos permitidos: PDF, PNG o JPG"],
      });
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

    // Revisar qué falta exactamente antes de enviar
    const pendientes = [];
    if (inmueble.trim() === "") {
      pendientes.push("Escribir el nombre o dirección del inmueble");
    }
    if (cliente.trim() === "") {
      pendientes.push("Escribir el nombre del propietario o corredor");
    }
    DOCUMENTOS_REQUERIDOS.forEach((doc) => {
      if (!archivos[doc.id]) {
        pendientes.push(`Subir documento: ${doc.titulo}`);
      }
    });

    if (pendientes.length > 0) {
      setAlertaModal({
        titulo: "Aún faltan datos por completar",
        mensaje:
          "Para que nuestro equipo pueda revisar tu local sin contratiempos, por favor completa lo siguiente:",
        pendientes,
      });
      return;
    }

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
    setAlertaModal(null);
  };

  /* ---------- Confirmación ---------- */
  if (enviado) {
    return (
      <div className="relative z-10 px-4 py-14 text-slate-900">
        <div className={`${PANEL} mx-auto flex max-w-lg flex-col items-center p-8 text-center sm:p-10`}>
          <Anillo listos={total} total={total} tam="h-32 w-32" />
          <h2 className={`${DISPLAY} mt-6 text-2xl font-bold sm:text-3xl`}>Todo en camino</h2>
          <p className="mt-2 max-w-sm text-sm leading-relaxed text-slate-600">
            Los 4 documentos de <strong className="text-slate-900">{inmueble}</strong> ya los está
            revisando nuestro equipo de 3B.
          </p>
          <div className="mt-7 flex flex-wrap justify-center gap-3">
            {onVolver && (
              <button
                type="button"
                onClick={onVolver}
                className="cursor-pointer rounded-full bg-[#e81c24] px-6 py-3 text-sm font-semibold text-white shadow-[0_10px_30px_-8px_rgba(232,28,36,0.75)] transition hover:bg-[#f0262e] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#e81c24]"
              >
                Volver a mis locales
              </button>
            )}
            <button
              type="button"
              onClick={reiniciar}
              className="cursor-pointer rounded-full bg-slate-900 px-6 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#e81c24]"
            >
              Subir otro inmueble
            </button>
          </div>
        </div>
      </div>
    );
  }

  /* ---------- Formulario ---------- */
  return (
    <div className="relative z-10 mx-auto max-w-4xl space-y-5 px-4 py-8 text-slate-900 sm:px-6 sm:py-10">
      {/* Modal flotante de alertas */}
      <ModalAlerta alerta={alertaModal} onCerrar={() => setAlertaModal(null)} />

      {onVolver && (
        <button
          type="button"
          onClick={onVolver}
          className="inline-flex cursor-pointer items-center gap-2 rounded-full bg-[#e81c24] px-5 py-2.5 text-sm font-semibold text-white shadow-[0_10px_30px_-8px_rgba(232,28,36,0.75)] transition hover:bg-[#f0262e] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#e81c24]"
        >
          <ArrowLeft className="h-4 w-4" /> Volver 
        </button>
      )}

      <form onSubmit={handleSubmit} noValidate className="space-y-5">
        {/* Datos del predio */}
        <div className={`${PANEL} p-6 sm:p-8`}>
          <h2
            className={`${DISPLAY} text-3xl font-bold leading-tight sm:text-4xl`}
          >
            Registra un nuevo predio o local
          </h2>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-slate-500">
            Sube los 4 documentos legales y nuestro equipo lo revisará.
          </p>

          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <div>
              <label
                htmlFor="inmueble"
                className="mb-1.5 flex items-center justify-between text-sm font-medium text-slate-700"
              >
                <span>Nombre o dirección del inmueble</span>
                {inmueble.trim() === "" && (
                  <span className="text-xs font-medium text-[#e81c24]">
                    * Obligatorio
                  </span>
                )}
              </label>
              <div className="relative">
                <Building className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                <input
                  id="inmueble"
                  type="text"
                  placeholder="Ej. Local Av. Insurgentes Sur #1240"
                  value={inmueble}
                  onChange={(e) => setInmueble(e.target.value)}
                  className={INPUT}
                />
              </div>
            </div>
            <div>
              <label
                htmlFor="cliente"
                className="mb-1.5 flex items-center justify-between text-sm font-medium text-slate-700"
              >
                <span>Propietario o corredor que envía</span>
                {cliente.trim() === "" && (
                  <span className="text-xs font-medium text-[#e81c24]">
                    * Obligatorio
                  </span>
                )}
              </label>
              <div className="relative">
                <User className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                <input
                  id="cliente"
                  type="text"
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
        <div
          className={`${PANEL} flex flex-col items-center justify-between gap-6 p-6 sm:p-8 md:flex-row`}
        >
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
                    <li
                      key={doc.id}
                      className="flex items-center gap-2.5 text-sm"
                    >
                      <span
                        className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full transition-colors duration-300 ${
                          ok
                            ? "bg-emerald-500 text-white"
                            : "border border-slate-300"
                        }`}
                      >
                        {ok && <Check className="h-3 w-3" strokeWidth={3} />}
                      </span>
                      <span
                        className={`truncate ${ok ? "text-slate-900" : "text-slate-500"}`}
                      >
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
              className={`flex w-full cursor-pointer items-center justify-center gap-2 rounded-full px-6 py-3.5 text-sm font-semibold transition-all duration-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#e81c24] ${
                todosSubidos
                  ? "bg-[#e81c24] text-white shadow-[0_10px_30px_-8px_rgba(232,28,36,0.75)] hover:bg-[#f0262e]"
                  : "bg-slate-900/[0.06] text-slate-500 hover:bg-slate-900/[0.11] hover:text-slate-700"
              }`}
            >
              <Send className="h-4 w-4" />
              Enviar documentación
            </button>
            <p className="mt-2.5 text-center text-xs text-slate-500">
              {todosSubidos
                ? "¡Todo listo! Ya puedes enviar tus documentos."
                : "Los 4 documentos son obligatorios para que nuestro equipo revise que todos tus papeles coincidan."}
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
                  if (!e.currentTarget.contains(e.relatedTarget))
                    setArrastrando(null);
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
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-3.5">
                    <div className="relative shrink-0">
                      {pulso && (
                        <span className="absolute inset-0 animate-ping rounded-2xl bg-emerald-400/50 motion-reduce:hidden" />
                      )}
                      <div
                        className={`relative flex h-11 w-11 items-center justify-center rounded-2xl transition-colors duration-300 ${
                          archivo
                            ? "bg-emerald-500 text-white"
                            : "bg-slate-900/[0.06] text-slate-700"
                        }`}
                      >
                        {archivo ? (
                          <Check className="h-5 w-5" strokeWidth={3} />
                        ) : (
                          <Icono className="h-5 w-5" />
                        )}
                      </div>
                    </div>
                    <div className="min-w-0">
                      <h3 className={`${DISPLAY} text-base font-bold`}>
                        {doc.titulo}
                      </h3>
                      <p className="mt-0.5 text-xs leading-relaxed text-slate-500">
                        {doc.descripcion}
                      </p>
                    </div>
                  </div>

                  {/* Etiqueta de estado por documento */}
                  <span
                    className={`shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
                      archivo
                        ? "bg-emerald-500/15 text-emerald-700"
                        : "bg-amber-500/15 text-amber-800"
                    }`}
                  >
                    {archivo ? "Listo" : "Falta"}
                  </span>
                </div>

                <div className="mt-4">
                  {archivo ? (
                    <div className="flex items-center gap-3 rounded-2xl bg-slate-900/[0.04] px-3 py-2.5">
                      <FileText className="h-5 w-5 shrink-0 text-emerald-600" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-slate-900">
                          {archivo.name}
                        </p>
                        <p className="text-xs text-slate-500">
                          {formatearTamano(archivo.size)}
                        </p>
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
                      <Upload
                        className={`h-5 w-5 transition-transform ${activa ? "-translate-y-1" : ""}`}
                      />
                      <span className="text-sm font-medium">
                        {activa
                          ? "Suéltalo aquí"
                          : "Arrastra tu archivo o haz clic"}
                      </span>
                      <span className="text-xs text-slate-500">
                        PDF, PNG o JPG
                      </span>
                      <input
                        ref={(el) => (inputsRef.current[doc.id] = el)}
                        type="file"
                        accept=".pdf,.png,.jpg,.jpeg"
                        className="sr-only"
                        onChange={(e) =>
                          handleArchivoChange(doc.id, e.target.files[0])
                        }
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