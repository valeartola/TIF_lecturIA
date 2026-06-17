"""
Clase Juez — evalúa preguntas de comprensión lectora generadas.

Recibe un LLMClient y no sabe qué modelo usa por debajo.
La lógica es la misma que en backend/ia/juez.py pero encapsulada en una clase.
"""

import json
import logging
from backend.services.llm_client import LLMClient
from backend.ia.contexto import construir_prompt_juez, construir_prompt_juez_lote
from backend.ia.especificaciones_loader import specs_para_juez
from backend.services.verificador_idioma import verificar_lote

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
        dims = ["contenido_texto", "respuesta_correcta_unica", "nivel_adecuado", "no_repeticion"]
        return all(eval_dict[d] >= 4 for d in dims)

    def evaluar(self, texto: str, pregunta: dict, dificultad: str,
                tipo: str, aspectos_previos: list = None) -> dict:
        """
        Evalúa una pregunta en las 4 dimensiones.

        Returns:
            dict con contenido_texto, respuesta_correcta_unica, nivel_adecuado,
            no_repeticion, aspecto_cubierto, aprobada, comentarios, sugerencia_mejora.
        """
        texto_truncado = texto[:3000] if len(texto) > 3000 else texto

        prompt = construir_prompt_juez(
            texto_truncado, pregunta, dificultad, tipo, self._specs, aspectos_previos
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

    def _evaluacion_rechazo_mecanico(self, motivo: str) -> dict:
        """Construye una evaluación sintética de rechazo, sin pasar por el
        LLM, para preguntas descartadas por el verificador mecánico
        (ej. idioma). Puntúa todas las dimensiones en 1 para que
        _calcular_aprobada las rechace sin ambigüedad."""
        return {
            "contenido_texto": 1,
            "respuesta_correcta_unica": 1,
            "nivel_adecuado": 1,
            "no_repeticion": 1,
            "aspecto_cubierto": "descartada por verificación de idioma",
            "aprobada": False,
            "comentarios": motivo,
            "sugerencia_mejora": motivo,
        }

    def evaluar_lote(self, texto: str, preguntas: list[dict], dificultad: str,
                     tipo: str, aspectos_previos: list = None) -> list[dict]:
        """
        Evalúa un lote de preguntas en una sola llamada al LLM.

        Antes de llamar al LLM, pasa el lote por un verificador mecánico
        (determinístico, sin tokens) que detecta problemas de idioma
        mezclado. Las preguntas marcadas por ese verificador se rechazan
        directamente sin gastar la llamada al juez; solo las preguntas
        limpias se evalúan con el LLM.

        Reduce drásticamente el consumo de tokens: las specs y el texto se
        envían una sola vez para todas las preguntas del lote, en lugar de
        repetirlos en cada llamada individual.

        Args:
            texto: el texto fuente.
            preguntas: lista de dicts con pregunta, opciones, correcta.
            dificultad: FÁCIL, MEDIA o DIFÍCIL.
            tipo: tipo de pregunta pedido al generador.
            aspectos_previos: aspectos ya cubiertos por preguntas aprobadas
                anteriores al lote actual.

        Returns:
            Lista de dicts de evaluación, uno por pregunta, en el mismo orden.
        """
        if not preguntas:
            return []

        # Paso 1: verificación mecánica de idioma (sin tokens).
        problemas_idioma = verificar_lote(preguntas)

        if problemas_idioma:
            indices_descartados = sorted(problemas_idioma.keys())
            logger.info(
                f"   [verificador-idioma] {len(indices_descartados)} pregunta(s) "
                f"descartada(s) por idioma mezclado: índices {indices_descartados}"
            )

        indices_a_evaluar = [i for i in range(len(preguntas)) if i not in problemas_idioma]
        preguntas_a_evaluar = [preguntas[i] for i in indices_a_evaluar]

        evaluaciones_llm = []
        if preguntas_a_evaluar:
            texto_truncado = texto[:3000] if len(texto) > 3000 else texto

            prompt = construir_prompt_juez_lote(
                texto_truncado, preguntas_a_evaluar, dificultad, tipo,
                self._specs, aspectos_previos
            )

            contenido = self._cliente.llamar(prompt)

            try:
                evaluaciones_llm = json.loads(contenido)
                if not isinstance(evaluaciones_llm, list):
                    raise ValueError("El juez no devolvió un array JSON")
                if len(evaluaciones_llm) != len(preguntas_a_evaluar):
                    raise ValueError(
                        f"El juez devolvió {len(evaluaciones_llm)} evaluaciones "
                        f"pero se enviaron {len(preguntas_a_evaluar)} preguntas"
                    )
                for ev in evaluaciones_llm:
                    self._validar_evaluacion(ev)
            except (json.JSONDecodeError, ValueError) as e:
                logger.warning(f"   [juez-lote] formato inválido ({e}), reintentando...")
                contenido = self._cliente.llamar(prompt)
                evaluaciones_llm = json.loads(contenido)
                if not isinstance(evaluaciones_llm, list):
                    raise ValueError("El juez no devolvió un array JSON en el reintento")
                for ev in evaluaciones_llm:
                    self._validar_evaluacion(ev)

            for ev in evaluaciones_llm:
                ev["aprobada"] = self._calcular_aprobada(ev)

        # Paso 2: reensamblar en el orden original, combinando los
        # rechazos mecánicos con las evaluaciones del LLM.
        resultado = [None] * len(preguntas)
        for indice, problema in problemas_idioma.items():
            resultado[indice] = self._evaluacion_rechazo_mecanico(problema["motivo"])
        for indice_original, evaluacion in zip(indices_a_evaluar, evaluaciones_llm):
            resultado[indice_original] = evaluacion

        return resultado