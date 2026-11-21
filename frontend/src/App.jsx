import { useState, useEffect } from "react";
import Navbar from "./components/Navbar";
import PanelCliente from "./components/PanelCliente";
import PortalCliente from "./components/PortalCliente";
import BandejaAdmin from "./components/BandejaAdmin";
import { EXPEDIENTES_INICIALES } from "./data/mockData";

export default function App() {
  const [perfilActivo, setPerfilActivo] = useState("cliente");
  const [vistaCliente, setVistaCliente] = useState("panel"); // "panel" | "subir"
  const [expedientes, setExpedientes] = useState(EXPEDIENTES_INICIALES);

  // Simulación de avance de los agentes de IA
  useEffect(() => {
    const intervalo = setInterval(() => {
      setExpedientes((prev) =>
        prev.map((exp) => {
          if (exp.progreso >= 100) return exp;

          const nuevoProgreso = Math.min(exp.progreso + 15, 100);
          let nuevaEtapa = exp.etapaActual;
          let nuevaRecomendacion = exp.recomendacion;
          let nuevoResumen = exp.resumenEjecutivo;

          if (nuevoProgreso >= 40 && nuevoProgreso < 70) {
            nuevaEtapa = "Agente Extractor leyendo cláusulas y superficies...";
          } else if (nuevoProgreso >= 70 && nuevoProgreso < 100) {
            nuevaEtapa = "Agente Legal realizando validación cruzada...";
          } else if (nuevoProgreso === 100) {
            nuevaEtapa = "Dictamen generado";
            nuevaRecomendacion = "Cumple";
            nuevoResumen =
              "Expediente validado al 100%. Todos los campos de titularidad, superficie, clave catastral y uso de suelo comercial cumplen con los requisitos de Tiendas 3B.";
          }

          return {
            ...exp,
            progreso: nuevoProgreso,
            etapaActual: nuevaEtapa,
            recomendacion: nuevaRecomendacion,
            resumenEjecutivo: nuevoResumen,
          };
        })
      );
    }, 3000);

    return () => clearInterval(intervalo);
  }, []);

  const handleAgregarExpediente = (nuevoExp) => {
    setExpedientes((prev) => [nuevoExp, ...prev]);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <Navbar
        perfilActivo={perfilActivo}
        setPerfilActivo={(perfil) => {
          setPerfilActivo(perfil);
          if (perfil === "cliente") setVistaCliente("panel");
        }}
      />

      <main>
        {perfilActivo === "cliente" ? (
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