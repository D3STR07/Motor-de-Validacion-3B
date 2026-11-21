import { UploadCloud, ShieldCheck } from "lucide-react";
import logo3b from "../img/logo1.png";

const DISPLAY = "font-['Bricolage_Grotesque',ui-sans-serif,system-ui,sans-serif]";

// Capa fija detrás de toda la app: base cálida y tres brillos de color
const FONDO = {
  backgroundColor: "#fdfbfa",
  backgroundImage: [
    "radial-gradient(900px 520px at 10% -8%, rgba(232,28,36,0.13), transparent 60%)",
    "radial-gradient(700px 480px at 96% 6%, rgba(251,146,60,0.18), transparent 60%)",
    "radial-gradient(800px 600px at 55% 112%, rgba(244,114,182,0.14), transparent 60%)",
  ].join(","),
};

const PERFILES = [
  { id: "cliente", corto: "Cliente", largo: "Perfil Cliente (Carga)", Icono: UploadCloud },
  { id: "admin", corto: "Admin", largo: "Perfil Admin (Legal 3B)", Icono: ShieldCheck },
];

export default function Navbar({ perfilActivo, setPerfilActivo }) {
  const indice = perfilActivo === "admin" ? 1 : 0;

  return (
    <>
      <div aria-hidden className="pointer-events-none fixed inset-0 z-0" style={FONDO} />

      <header className="sticky top-3 z-30 mx-3 mt-3 sm:mx-6">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-3 rounded-2xl border border-slate-900/[0.07] bg-white/70 px-3 shadow-[0_18px_40px_-22px_rgba(90,40,40,0.3),inset_0_1px_0_rgba(255,255,255,0.9)] backdrop-blur-2xl sm:px-4">
          {/* Logo y título */}
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-10 shrink-0 items-center rounded-xl bg-white px-2">
              <img src={logo3b} alt="Logo Tiendas 3B" className="h-7 w-auto object-contain" />
            </div>
            <div className="hidden min-w-0 lg:block">
              <h1 className={`${DISPLAY} truncate text-base font-bold leading-tight text-slate-900`}>
                Expansión y Validación Inmobiliaria
              </h1>
              <p className="truncate text-xs text-slate-500">Sistema multiagente de dictamen legal</p>
            </div>
          </div>

          {/* Selector de perfil (simulación de roles sin login) */}
          <div
            role="tablist"
            aria-label="Perfil activo"
            className="relative grid shrink-0 grid-cols-2 rounded-full border border-slate-900/[0.07] bg-slate-900/[0.06] p-1"
          >
            <span
              aria-hidden
              className="absolute inset-y-1 left-1 w-[calc(50%-0.25rem)] rounded-full bg-white shadow-md transition-transform duration-300 ease-out motion-reduce:transition-none"
              style={{ transform: `translateX(${indice * 100}%)` }}
            />
            {PERFILES.map(({ id, corto, largo, Icono }) => {
              const activo = perfilActivo === id;
              return (
                <button
                  key={id}
                  role="tab"
                  aria-selected={activo}
                  onClick={() => setPerfilActivo(id)}
                  className={`relative z-10 flex cursor-pointer items-center justify-center gap-2 rounded-full px-3 py-2 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#e81c24] sm:px-4 ${
                    activo ? "text-slate-900" : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  <Icono className={`h-4 w-4 ${activo ? "text-[#e81c24]" : ""}`} />
                  <span className="lg:hidden">{corto}</span>
                  <span className="hidden whitespace-nowrap lg:inline">{largo}</span>
                </button>
              );
            })}
          </div>
        </div>
      </header>
    </>
  );
}