
import { useState, useEffect, useCallback } from "react";

import Navbar from "./components/Navbar";
import PanelCliente from "./components/PanelCliente";
import PortalCliente from "./components/PortalCliente";
import BandejaAdmin from "./components/BandejaAdmin";

import { obtenerExpedientes } from "./services/api";

export default function App() {
  const [perfilActivo, setPerfilActivo] = useState("cliente");
  const [vistaCliente, setVistaCliente] = useState("panel");

  const [expedientes, setExpedientes] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");

  const cargarExpedientes = useCallback(async (mostrarCarga = false) => {
    if (mostrarCarga) setCargando(true);

    try {
      const datos = await obtenerExpedientes();
      setExpedientes(datos);
      setError("");
    } catch (err) {
      setError(err.message || "No se pudieron cargar los expedientes.");
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    cargarExpedientes(true);

    const intervalo = setInterval(() => {
      cargarExpedientes(false);
    }, 5000);

    return () => clearInterval(intervalo);
  }, [cargarExpedientes]);

  const handleAgregarExpediente = (nuevoExpediente) => {
    setExpedientes((actuales) => [
      nuevoExpediente,
      ...actuales.filter(
        (exp) => exp.backendId !== nuevoExpediente.backendId
      ),
    ]);

    setVistaCliente("panel");

    cargarExpedientes(false);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <Navbar
        perfilActivo={perfilActivo}
        setPerfilActivo={(perfil) => {
          setPerfilActivo(perfil);

          if (perfil === "cliente") {
            setVistaCliente("panel");
          }

          if (perfil === "admin") {
            cargarExpedientes(false);
          }
        }}
      />

      <main>
        {error && (
          <div className="mx-auto mt-4 max-w-5xl px-4">
            <div
              role="alert"
              className="flex flex-col gap-2 rounded-2xl border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-800 sm:flex-row sm:items-center sm:justify-between"
            >
              <span>{error}</span>

              <button
                type="button"
                onClick={() => cargarExpedientes(true)}
                className="shrink-0 rounded-full bg-red-700 px-4 py-2 font-semibold text-white transition hover:bg-red-800"
              >
                Reintentar conexión
              </button>
            </div>
          </div>
        )}

        {cargando ? (
          <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-red-600" />
            <p className="text-sm text-slate-500">
              Conectando con el servidor de expedientes...
            </p>
          </div>
        ) : perfilActivo === "cliente" ? (
          vistaCliente === "panel" ? (
            <PanelCliente
              expedientes={expedientes}
              onNuevoPredio={() => setVistaCliente("subir")}
            />
          ) : (
            <PortalCliente
              onEnviarExpediente={handleAgregarExpediente}
              onVolver={() => setVistaCliente("panel")}
            />
          )
        ) : (
          <BandejaAdmin expedientes={expedientes} />
        )}
      </main>
    </div>
  );
}
