"""
Clase Juez — evalúa preguntas de comprensión lectora generadas.

Recibe un LLMClient y no sabe qué modelo usa por debajo.
La lógica es la misma que en backend/ia/juez.py pero encapsulada en una clase.
"""

import json
import logging
from backend.services.llm_client import LLMClient
from backend.ia.contexto import construir_prompt_juez
from backend.ia.especificaciones_loader import specs_para_juez

logger = logging.getLogger(__name__)

class Juez:

    CAMPOS_REQUERIDOS = [
        "contenido_texto", "respuesta_correcta_unica", "nivel_adecuado",
        "no_repeticion", "aspecto_cubierto", "aprobada", "comentarios",
        "sugerencia_mejora"
    ]

    def __init__(self, cliente: LLMClient):
        self._cliente = cliente
        self._specs = specs_para_juez()

    def _validar_evaluacion(self, eval_dict: dict) -> None:
        for campo in self.CAMPOS_REQUERIDOS:
            if campo not in eval_dict:
                raise ValueError(f"Falta campo '{campo}' en evaluación del juez")

        for dim in ["contenido_texto", "respuesta_correcta_unica",
                    "nivel_adecuado", "no_repeticion"]:
            if not isinstance(eval_dict[dim], int) or not 1 <= eval_dict[dim] <= 5:
                raise ValueError(
                    f"Dimensión '{dim}' debe ser entero 1-5, vino: {eval_dict[dim]}"
                )

        if not isinstance(eval_dict["aprobada"], bool):
            raise ValueError("'aprobada' debe ser true/false")

        if not isinstance(eval_dict["aspecto_cubierto"], str) or \
                not eval_dict["aspecto_cubierto"].strip():
            raise ValueError("'aspecto_cubierto' debe ser un string no vacío")

    def _calcular_aprobada(self, eval_dict: dict) -> bool:
        dims_permisivas = ["contenido_texto", "respuesta_correcta_unica", "no_repeticion"]
        if not all(eval_dict[d] >= 3 for d in dims_permisivas):
            return False
        return eval_dict["nivel_adecuado"] >= 4

    def evaluar(self, texto: str, pregunta: dict, dificultad: str,
                tipo: str, aspectos_previos: list = None) -> dict:
        """
        Evalúa una pregunta en las 4 dimensiones.

        Returns:
            dict con contenido_texto, respuesta_correcta_unica, nivel_adecuado,
            no_repeticion, aspecto_cubierto, aprobada, comentarios, sugerencia_mejora.
        """
        prompt = construir_prompt_juez(
            texto, pregunta, dificultad, tipo, self._specs, aspectos_previos
        )

        contenido = self._cliente.llamar(prompt)

        try:
            evaluacion = json.loads(contenido)
            self._validar_evaluacion(evaluacion)
        except (json.JSONDecodeError, ValueError) as e:
            logger.warning(f"   [juez] formato inválido ({e}), reintentando...")
            contenido = self._cliente.llamar(prompt)
            evaluacion = json.loads(contenido)
            self._validar_evaluacion(evaluacion)

        evaluacion["aprobada"] = self._calcular_aprobada(evaluacion)
        return evaluacion