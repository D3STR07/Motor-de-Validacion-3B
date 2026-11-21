import { useState, useEffect } from "react";
import Navbar from "./components/Navbar";
import PortalCliente from "./components/PortalCliente";
import BandejaAdmin from "./components/BandejaAdmin";
import { EXPEDIENTES_INICIALES } from "./data/mockData";

const generarValidacionAprobada = (exp) => [
  {
    campo: "Propietario / Titular",
    estado: "coincide",
    escrituras: exp.cliente,
    predial: exp.cliente,
    alineamiento: "No aplica",
    usoSuelo: exp.cliente,
  },
  {
    campo: "Dirección del Inmueble",
    estado: "coincide",
    escrituras: exp.inmueble,
    predial: exp.inmueble,
    alineamiento: exp.inmueble,
    usoSuelo: exp.inmueble,
  },
  {
    campo: "Número Oficial Asignado",
    estado: "coincide",
    escrituras: "Núm. Oficial verificado en escritura",
    predial: "Coincide con boleta predial",
    alineamiento: "Núm. Oficial ratificado por autoridad",
    usoSuelo: "Coincide con certificado",
  },
  {
    campo: "Identificación del Predio / Clave Catastral",
    estado: "coincide",
    escrituras: "Folio Real inscrito en RPP",
    predial: "Clave catastral verificada y activa",
    alineamiento: "Lote y manzana coincidentes",
    usoSuelo: "Clave catastral coincidente",
  },
  {
    campo: "Superficie del Terreno",
    estado: "coincide",
    escrituras: "495.00 m²",
    predial: "495.00 m²",
    alineamiento: "495.00 m²",
    usoSuelo: "495.00 m²",
  },
  {
    campo: "Vigencia y Estatus Fiscal / Legal",
    estado: "coincide",
    escrituras: "Libre de gravámenes vigentes",
    predial: "Al corriente de pagos fiscales 2026",
    alineamiento: "Vigente",
    usoSuelo: "Certificado vigente",
  },
  {
    campo: "Giro Comercial / Uso Autorizado",
    estado: "coincide",
    escrituras: "Apto para uso comercial",
    predial: "Uso comercial registrado",
    alineamiento: "Vialidad comercial permitida",
    usoSuelo: "Compatible con Tiendas 3B (Autoservicio)",
  },
];

const generarDocumentosAprobados = (docs) =>
  docs.map((doc) => ({
    ...doc,
    estatus: "Válido",
    hallazgos: [
      {
        regla: `Validación integral de ${doc.tipo}`,
        detalle: `Información completa y consistente con el resto del expediente de ${doc.tipo}.`,
        evidencia: `Documento '${doc.nombreArchivo}' validado por Agente Legal sin observaciones.`,
      },
    ],
  }));

export default function App() {
  const [perfilActivo, setPerfilActivo] = useState("cliente");
  const [expedientes, setExpedientes] = useState(EXPEDIENTES_INICIALES);

  // Simulación de avance de los agentes de IA para expedientes en proceso
  useEffect(() => {
    const intervalo = setInterval(() => {
      setExpedientes((prev) =>
        prev.map((exp) => {
          if (exp.progreso >= 100) return exp;

          const nuevoProgreso = Math.min(exp.progreso + 15, 100);
          let nuevaEtapa = exp.etapaActual;
          let nuevaRecomendacion = exp.recomendacion;
          let nuevoResumen = exp.resumenEjecutivo;
          let nuevaValidacion = exp.validacionCruzada;
          let nuevosDocs = exp.documentos;

          if (nuevoProgreso >= 40 && nuevoProgreso < 70) {
            nuevaEtapa = "Agente Extractor leyendo cláusulas y superficies...";
          } else if (nuevoProgreso >= 70 && nuevoProgreso < 100) {
            nuevaEtapa = "Agente Legal realizando validación cruzada...";
          } else if (nuevoProgreso === 100) {
            nuevaEtapa = "Dictamen generado";
            nuevaRecomendacion = "Cumple";
            nuevoResumen =
              "Expediente validado al 100% por el sistema multiagente. Todos los campos de titularidad, superficie, clave catastral y uso de suelo comercial cumplen con los requisitos de Tiendas 3B.";
            nuevaValidacion = generarValidacionAprobada(exp);
            nuevosDocs = generarDocumentosAprobados(exp.documentos);
          }

          return {
            ...exp,
            progreso: nuevoProgreso,
            etapaActual: nuevaEtapa,
            recomendacion: nuevaRecomendacion,
            resumenEjecutivo: nuevoResumen,
            validacionCruzada: nuevaValidacion,
            documentos: nuevosDocs,
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
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <Navbar perfilActivo={perfilActivo} setPerfilActivo={setPerfilActivo} />

      <main>
        {perfilActivo === "cliente" ? (
          <PortalCliente onEnviarExpediente={handleAgregarExpediente} />
        ) : (
          <BandejaAdmin expedientes={expedientes} />
        )}
      </main>
    </div>
  );
}