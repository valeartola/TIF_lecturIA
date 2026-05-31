"""
Clase Generador — orquesta la generación de preguntas de comprensión lectora.

Recibe un LLMClient y no sabe qué modelo usa por debajo.
La lógica es la misma que en backend/ia/generador.py pero encapsulada en una clase.
"""

import json
import random
import asyncio
import logging
from backend.services.llm_client import LLMClient
from backend.ia.contexto import construir_prompt_generador
from backend.ia.especificaciones_loader import specs_para_generador
from backend.domain.actividad import PREGUNTAS_POR_NIVEL, DIFICULTADES


logger = logging.getLogger(__name__)

class Generador:

    MAX_INTENTOS_POR_PREGUNTA = 3
    MAX_REEMPLAZOS_TOTALES = 5

    def __init__(self, cliente: LLMClient):
        self._cliente = cliente
        self._specs = specs_para_generador()

    def definir_tipos_pregunta(self, cantidad: int) -> list[str]:
        tipos = [
            "comprensión literal",
            "comprensión inferencial",
            "vocabulario en contexto",
            "idea principal o global",
            "detalle específico",
            "causa y efecto",
        ]
        obligatorios = tipos[:3]
        extras = tipos[3:]
        resultado = obligatorios.copy()
        while len(resultado) < cantidad:
            resultado.append(random.choice(extras))
        random.shuffle(resultado)
        return resultado[:cantidad]

    def generar_posiciones(self, cantidad: int) -> list[int]:
        posiciones = list(range(4)) * (cantidad // 4 + 1)
        random.shuffle(posiciones)
        return posiciones[:cantidad]

    def _llamar_generador(self, prompt: str) -> dict:
        contenido = self._cliente.llamar(prompt)
        try:
            return json.loads(contenido)
        except json.JSONDecodeError:
            contenido = self._cliente.llamar(prompt)
            return json.loads(contenido)

    def _generar_y_evaluar(self, juez, texto, dificultad, tipo, pos,
                           preguntas_anteriores, aspectos_previos=None):
        feedback = None
        ultima_evaluacion = None
        rechazadas = []

        for intento in range(1, self.MAX_INTENTOS_POR_PREGUNTA + 1):
            prompt = construir_prompt_generador(
                texto, dificultad, tipo, pos, preguntas_anteriores,
                self._specs, feedback=feedback, aspectos_previos=aspectos_previos
            )
            pregunta = self._llamar_generador(prompt)
            evaluacion = juez.evaluar(texto, pregunta, dificultad, tipo,
                                      aspectos_previos=aspectos_previos)
            ultima_evaluacion = evaluacion

            estado = "✓ aprobada" if evaluacion["aprobada"] else "✗ rechazada"
            logger.info(f"     intento {intento}: {estado}")

            if evaluacion["aprobada"]:
                return pregunta, evaluacion, intento, rechazadas

            rechazadas.append({"intento": intento, "pregunta": pregunta, "evaluacion": evaluacion})
            feedback = evaluacion["sugerencia_mejora"] or evaluacion["comentarios"]

        return None, ultima_evaluacion, self.MAX_INTENTOS_POR_PREGUNTA, rechazadas
    
    def _generar_por_nivel(self, juez, texto: str, dificultad: str) -> dict:
        """Genera PREGUNTAS_POR_NIVEL preguntas para una dificultad específica."""
        tipos = self.definir_tipos_pregunta(PREGUNTAS_POR_NIVEL)
        posiciones = self.generar_posiciones(PREGUNTAS_POR_NIVEL)

        logger.info(f"\n── Nivel {dificultad} ──")

        preguntas_aprobadas = []
        aspectos_cubiertos = []
        descartes = []
        reemplazos_usados = 0

        for i, (tipo, pos) in enumerate(zip(tipos, posiciones)):
            logger.info(f"  Pregunta {i+1}/{PREGUNTAS_POR_NIVEL} — tipo: {tipo}")

            pregunta, evaluacion, intentos, rechazadas = self._generar_y_evaluar(
                juez, texto, dificultad, tipo, pos,
                preguntas_aprobadas, aspectos_previos=aspectos_cubiertos
            )

            while pregunta is None and reemplazos_usados < self.MAX_REEMPLAZOS_TOTALES:
                reemplazos_usados += 1
                nueva_pos = random.choice([0, 1, 2, 3])
                logger.info(f"  ↻ reemplazo {reemplazos_usados}")
                descartes.append({"indice": i, "tipo": tipo, "ultima_evaluacion": evaluacion})
                pregunta, evaluacion, intentos, rechazadas = self._generar_y_evaluar(
                    juez, texto, dificultad, tipo, nueva_pos,
                    preguntas_aprobadas, aspectos_previos=aspectos_cubiertos
                )

            if pregunta is None:
                logger.warning(f"  ⚠ Slot {i+1} sin pregunta aprobada")
                continue

            aspecto = evaluacion.get("aspecto_cubierto", "").strip()
            if aspecto:
                aspectos_cubiertos.append(aspecto)

            pregunta["tipo"] = tipo
            pregunta["dificultad"] = dificultad
            preguntas_aprobadas.append(pregunta)

        return {
            "dificultad": dificultad,
            "preguntas": preguntas_aprobadas,
            "metricas": {
                "pedidas": PREGUNTAS_POR_NIVEL,
                "aprobadas": len(preguntas_aprobadas),
                "reemplazos": reemplazos_usados,
                "descartes": len(descartes),
            }
        }

    def generar_actividad(self, juez, texto: str) -> dict:
        """
        Genera PREGUNTAS_POR_NIVEL preguntas para cada dificultad.
        Retorna un dict con las preguntas agrupadas por nivel.
        """
        resultados = {}
        metricas_totales = {"pedidas": 0, "aprobadas": 0, "reemplazos": 0, "descartes": 0}

        for dificultad in DIFICULTADES:
            resultado = self._generar_por_nivel(juez, texto, dificultad)
            resultados[dificultad] = resultado["preguntas"]
            for k in metricas_totales:
                metricas_totales[k] += resultado["metricas"][k]

        logger.info(f"\n✓ Generación completa: {metricas_totales}")

        return {
            "preguntas_por_nivel": resultados,  # {"FÁCIL": [...], "MEDIA": [...], "DIFÍCIL": [...]}
            "metricas": metricas_totales,
        }