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

logger = logging.getLogger(__name__)

class Generador:

    MAX_INTENTOS_POR_PREGUNTA = 3
    MAX_REEMPLAZOS_TOTALES = 5

    def __init__(self, cliente: LLMClient):
        self._cliente = cliente
        self._specs = specs_para_generador()
    
    
    def analizar_texto(self, texto: str) -> tuple[int, str]:
        palabras = len(texto.split())
        if palabras < 300:
            return random.choice([4, 5]), "corto"
        elif palabras < 600:
            return random.choice([5, 6]), "mediano"
        else:
            return random.choice([6, 7]), "largo"

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
        """Llama al cliente y parsea el JSON. Un reintento si el formato falla."""
        contenido = self._cliente.llamar(prompt)
        try:
            return json.loads(contenido)
        except json.JSONDecodeError:
            contenido = self._cliente.llamar(prompt)
            return json.loads(contenido)

    def _generar_y_evaluar(self, juez, texto, dificultad, tipo, pos,
                           preguntas_anteriores, aspectos_previos=None):
        """
        Genera UNA pregunta y la evalúa con el juez.
        Si el juez la rechaza, regenera con feedback hasta MAX_INTENTOS veces.
        """
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

            scores = (
                f"D1={evaluacion['contenido_texto']} "
                f"D2={evaluacion['respuesta_correcta_unica']} "
                f"D3={evaluacion['nivel_adecuado']} "
                f"D4={evaluacion['no_repeticion']}"
            )
            estado = "✓ aprobada" if evaluacion["aprobada"] else "✗ rechazada"
            aspecto = evaluacion.get("aspecto_cubierto", "?")
            logger.info(f"     intento {intento}: {scores} → {estado}  [{aspecto}]")

            if evaluacion["aprobada"]:
                return pregunta, evaluacion, intento, rechazadas

            rechazadas.append({
                "intento": intento,
                "pregunta": pregunta,
                "evaluacion": evaluacion,
            })
            feedback = evaluacion["sugerencia_mejora"] or evaluacion["comentarios"]

        return None, ultima_evaluacion, self.MAX_INTENTOS_POR_PREGUNTA, rechazadas

    def generar_actividad(self, juez, texto: str, dificultad: str = "MEDIA") -> dict:
        """
        Genera una actividad completa. Cada pregunta pasa por generación
        y evaluación del juez. Si no aprueba, se reemplaza hasta el tope.
        """
        cantidad, tipo_texto = self.analizar_texto(texto)
        tipos_pregunta = self.definir_tipos_pregunta(cantidad)
        posiciones = self.generar_posiciones(cantidad)

        logger.info(f" Texto {tipo_texto}: {len(texto.split())} palabras")
        logger.info(f" Generando {cantidad} preguntas")
        logger.info(f" Tipos: {tipos_pregunta}")

        preguntas_aprobadas = []
        aspectos_cubiertos = []
        descartes = []
        rechazos_todos = []
        reemplazos_usados = 0

        for i, (tipo, pos) in enumerate(zip(tipos_pregunta, posiciones)):
            logger.info(f"\n   Pregunta {i+1}/{cantidad} — tipo: {tipo}, pos: {pos}")

            pregunta, evaluacion, intentos, rechazadas = self._generar_y_evaluar(
                juez, texto, dificultad, tipo, pos,
                preguntas_aprobadas, aspectos_previos=aspectos_cubiertos
            )
            for r in rechazadas:
                rechazos_todos.append({"slot": i + 1, "tipo": tipo, **r})

            while pregunta is None and reemplazos_usados < self.MAX_REEMPLAZOS_TOTALES:
                reemplazos_usados += 1
                nueva_pos = random.choice([0, 1, 2, 3])
                logger.info(f"   ↻ reemplazo {reemplazos_usados}: nuevo intento con pos={nueva_pos}")
                descartes.append({
                    "indice": i, "tipo": tipo,
                    "ultima_evaluacion": evaluacion, "intentos": intentos,
                })
                pregunta, evaluacion, intentos, rechazadas = self._generar_y_evaluar(
                    juez, texto, dificultad, tipo, nueva_pos,
                    preguntas_aprobadas, aspectos_previos=aspectos_cubiertos
                )
                for r in rechazadas:
                    rechazos_todos.append({"slot": i + 1, "tipo": tipo, **r})

            if pregunta is None:
                logger.warning(f"   ⚠ No se logró una pregunta aprobada para el slot {i+1}")
                descartes.append({
                    "indice": i, "tipo": tipo,
                    "ultima_evaluacion": evaluacion, "intentos": intentos,
                    "agotado": True,
                })
                continue

            aspecto = evaluacion.get("aspecto_cubierto", "").strip()
            if aspecto:
                aspectos_cubiertos.append(aspecto)

            pregunta["tipo"] = tipo
            pregunta["evaluacion"] = {**evaluacion, "intentos": intentos}
            preguntas_aprobadas.append(pregunta)

        logger.info(f"\n {len(preguntas_aprobadas)}/{cantidad} preguntas aprobadas "
              f"({reemplazos_usados} reemplazos, {len(descartes)} descartes, "
              f"{len(rechazos_todos)} intentos rechazados)")
        logger.info(f" Aspectos cubiertos: {aspectos_cubiertos}")

        return {
            "preguntas": preguntas_aprobadas,
            "descartes": descartes,
            "rechazos": rechazos_todos,
            "aspectos_cubiertos": aspectos_cubiertos,
            "metricas": {
                "pedidas": cantidad,
                "aprobadas": len(preguntas_aprobadas),
                "reemplazos": reemplazos_usados,
                "descartes": len(descartes),
                "rechazos_total": len(rechazos_todos),
            },
        }