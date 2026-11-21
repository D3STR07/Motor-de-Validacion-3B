
from langgraph.graph import StateGraph, START, END

from app.graph.state import EstadoMotor

from app.graph.nodes import (
    nodo_escrituras,
    nodo_predial,
    nodo_alineamiento,
    nodo_uso_suelo,
    nodo_auditor
)


def construir_workflow():

    grafo = StateGraph(EstadoMotor)

    # Registrar nodos
    grafo.add_node("escrituras", nodo_escrituras)
    grafo.add_node("predial", nodo_predial)
    grafo.add_node("alineamiento", nodo_alineamiento)
    grafo.add_node("uso_suelo", nodo_uso_suelo)
    grafo.add_node("auditor", nodo_auditor)

    # Inicio: ejecutar especialistas en paralelo
    grafo.add_edge(START, "escrituras")
    grafo.add_edge(START, "predial")
    grafo.add_edge(START, "alineamiento")
    grafo.add_edge(START, "uso_suelo")

    # Los cuatro especialistas deben terminar antes del auditor
    grafo.add_edge("escrituras", "auditor")
    grafo.add_edge("predial", "auditor")
    grafo.add_edge("alineamiento", "auditor")
    grafo.add_edge("uso_suelo", "auditor")

    # Finalizar después de la auditoría
    grafo.add_edge("auditor", END)

    return grafo.compile()


# Instancia global del workflow
workflow = construir_workflow()
