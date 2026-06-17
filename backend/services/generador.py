"""
Clase Generador — orquesta la generación de preguntas de comprensión lectora.

Recibe un LLMClient y no sabe qué modelo usa por debajo.
La lógica es la misma que en backend/ia/generador.py pero encapsulada en una clase.
"""

import json
import random
import asyncio
import logging
import time
from backend.services.llm_client import LLMClient
from backend.ia.contexto import construir_prompt_generador, construir_prompt_generador_lote
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

    def _extraer_lista(self, contenido: str) -> list:
        """Parsea el JSON devuelto por el LLM y extrae el array de preguntas.

        Groq con response_format=json_object obliga a que la raíz sea un
        OBJETO, no un array. Por eso, aunque el prompt pide explícitamente
        un array, el modelo a veces envuelve el array en una clave (ej.
        {"preguntas": [...]}, {"resultado": [...]}, {"items": [...]}).
        Esta función soporta ambos casos: si la raíz ya es una lista, la
        devuelve tal cual; si es un dict, busca el primer valor que sea
        una lista y la devuelve.
        """
        data = json.loads(contenido)
        if isinstance(data, list):
            return data
        if isinstance(data, dict):
            for valor in data.values():
                if isinstance(valor, list):
                    return valor
            raise ValueError("El objeto JSON no contiene ninguna lista")
        raise ValueError(f"Formato inesperado: {type(data).__name__}")

    def _llamar_generador_lote(self, prompt: str, n_esperado: int) -> list[dict]:
        """Llama al generador pidiendo n_esperado preguntas en una sola
        respuesta JSON (array, posiblemente envuelto en un objeto).
        Reintenta una vez si el formato es inválido o si la cantidad de
        preguntas devueltas no coincide."""
        contenido = self._cliente.llamar(prompt)
        try:
            candidatas = self._extraer_lista(contenido)
            if len(candidatas) != n_esperado:
                raise ValueError(
                    f"Se esperaban {n_esperado} preguntas, llegaron {len(candidatas)}"
                )
            return candidatas
        except (json.JSONDecodeError, ValueError) as e:
            logger.warning(f"  [generador-lote] formato inválido ({e}), reintentando...")
            contenido = self._cliente.llamar(prompt)
            candidatas = self._extraer_lista(contenido)
            if len(candidatas) != n_esperado:
                raise ValueError(
                    f"Tras reintento: se esperaban {n_esperado} preguntas, "
                    f"llegaron {len(candidatas)}"
                )
            return candidatas

    def _generar_candidatas(self, texto: str, dificultad: str,
                            tipos: list, posiciones: list,
                            preguntas_aprobadas: list,
                            aspectos_cubiertos: list,
                            feedbacks: dict = None) -> list[dict]:
        """
        Genera todas las candidatas de un lote (uno por slot, definido por
        tipo + posición) en UNA SOLA llamada al generador. Esto reduce el
        consumo de tokens (texto y specs se envían una vez) y reduce el
        riesgo de repetición entre preguntas, porque el modelo las escribe
        todas juntas con visión simultánea del lote completo.

        feedbacks: dict {indice_slot: texto_feedback} para reintentos con corrección.
        """
        feedbacks = feedbacks or {}

        prompt = construir_prompt_generador_lote(
            texto, dificultad, tipos, posiciones,
            preguntas_aprobadas, self._specs,
            feedbacks=feedbacks,
            aspectos_previos=aspectos_cubiertos,
        )

        candidatas = self._llamar_generador_lote(prompt, len(tipos))

        for i, (candidata, tipo, pos) in enumerate(zip(candidatas, tipos, posiciones)):
            candidata["_slot"] = i
            candidata["_tipo"] = tipo
            candidata["_pos"] = pos

        return candidatas

    def _generar_por_nivel(self, juez, texto: str, dificultad: str,
                           aspectos_previos: list = None) -> dict:
        """
        Genera PREGUNTAS_POR_NIVEL preguntas para una dificultad usando batching.

        aspectos_previos: aspectos ya cubiertos por niveles anteriores, para
            evitar repetición cross-nivel (ej. MEDIA no repite lo que hizo FÁCIL).
        """
        tipos = self.definir_tipos_pregunta(PREGUNTAS_POR_NIVEL)
        posiciones = self.generar_posiciones(PREGUNTAS_POR_NIVEL)

        logger.info(f"\n── Nivel {dificultad} ──")

        preguntas_aprobadas = []
        aspectos_cubiertos = list(aspectos_previos or [])  # incluye los de niveles anteriores
        aspectos_propios = []  # solo los generados en este nivel
        descartes = []
        reemplazos_usados = 0

        # Slots pendientes: lista de (indice_slot, tipo, pos)
        slots_pendientes = list(enumerate(zip(tipos, posiciones)))
        feedbacks = {}  # {indice_slot: sugerencia del juez}

        for intento in range(1, self.MAX_INTENTOS_POR_PREGUNTA + 1):
            if not slots_pendientes:
                break

            indices = [s[0] for s in slots_pendientes]
            tipos_lote = [s[1][0] for s in slots_pendientes]
            pos_lote = [s[1][1] for s in slots_pendientes]

            logger.info(f"  Lote intento {intento}: generando {len(slots_pendientes)} candidatas...")

            # Generar todas las candidatas del lote
            candidatas = self._generar_candidatas(
                texto, dificultad, tipos_lote, pos_lote,
                preguntas_aprobadas, aspectos_cubiertos,
                feedbacks={i: feedbacks.get(orig_i) for i, orig_i in enumerate(indices)}
            )

            # Evaluar todo el lote en una sola llamada al juez
            # Usamos el tipo del primer slot como referencia (todos del mismo nivel)
            evaluaciones = juez.evaluar_lote(
                texto, candidatas, dificultad, tipos_lote[0],
                aspectos_previos=aspectos_cubiertos
            )

            slots_pendientes_siguiente = []
            for candidata, evaluacion, (orig_i, (tipo, pos)) in zip(
                candidatas, evaluaciones, slots_pendientes
            ):
                estado = "✓ aprobada" if evaluacion["aprobada"] else "✗ rechazada"
                logger.info(f"    slot {orig_i+1} intento {intento}: {estado}")

                if evaluacion["aprobada"]:
                    aspecto = evaluacion.get("aspecto_cubierto", "").strip()
                    if aspecto:
                        aspectos_cubiertos.append(aspecto)
                        aspectos_propios.append(aspecto)
                    candidata["tipo"] = tipo
                    candidata["dificultad"] = dificultad
                    # Limpiar claves internas antes de guardar
                    for k in ["_slot", "_tipo", "_pos"]:
                        candidata.pop(k, None)
                    preguntas_aprobadas.append(candidata)
                else:
                    feedbacks[orig_i] = (
                        evaluacion["sugerencia_mejora"] or evaluacion["comentarios"]
                    )
                    slots_pendientes_siguiente.append((orig_i, (tipo, pos)))

            slots_pendientes = slots_pendientes_siguiente

        # Reemplazos para slots que no aprobaron tras todos los intentos
        for orig_i, (tipo, pos) in slots_pendientes:
            if reemplazos_usados >= self.MAX_REEMPLAZOS_TOTALES:
                logger.warning(f"  ⚠ Slot {orig_i+1} sin pregunta aprobada (sin reemplazos)")
                descartes.append({"indice": orig_i, "tipo": tipo})
                continue

            reemplazos_usados += 1
            nueva_pos = random.choice([0, 1, 2, 3])
            logger.info(f"  ↻ reemplazo {reemplazos_usados} para slot {orig_i+1}")

            candidatas_r = self._generar_candidatas(
                texto, dificultad, [tipo], [nueva_pos],
                preguntas_aprobadas, aspectos_cubiertos
            )
            evaluaciones_r = juez.evaluar_lote(
                texto, candidatas_r, dificultad, tipo,
                aspectos_previos=aspectos_cubiertos
            )
            candidata_r, evaluacion_r = candidatas_r[0], evaluaciones_r[0]

            if evaluacion_r["aprobada"]:
                aspecto = evaluacion_r.get("aspecto_cubierto", "").strip()
                if aspecto:
                    aspectos_cubiertos.append(aspecto)
                    aspectos_propios.append(aspecto)
                candidata_r["tipo"] = tipo
                candidata_r["dificultad"] = dificultad
                for k in ["_slot", "_tipo", "_pos"]:
                    candidata_r.pop(k, None)
                preguntas_aprobadas.append(candidata_r)
            else:
                logger.warning(f"  ⚠ Slot {orig_i+1} sin pregunta aprobada tras reemplazo")
                descartes.append({"indice": orig_i, "tipo": tipo})

        return {
            "dificultad": dificultad,
            "preguntas": preguntas_aprobadas,
            "aspectos_cubiertos": aspectos_propios,  # solo los de este nivel
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

        Los aspectos cubiertos se acumulan entre niveles para evitar que
        MEDIA y DIFÍCIL repitan preguntas que FÁCIL ya hizo.
        """
        resultados = {}
        metricas_totales = {"pedidas": 0, "aprobadas": 0, "reemplazos": 0, "descartes": 0}
        aspectos_acumulados = []

        for dificultad in DIFICULTADES:
            resultado = self._generar_por_nivel(juez, texto, dificultad, aspectos_acumulados)
            resultados[dificultad] = resultado["preguntas"]
            aspectos_acumulados.extend(resultado["aspectos_cubiertos"])
            for k in metricas_totales:
                metricas_totales[k] += resultado["metricas"][k]

        logger.info(f"\n✓ Generación completa: {metricas_totales}")

        return {
            "preguntas_por_nivel": resultados,  # {"FÁCIL": [...], "MEDIA": [...], "DIFÍCIL": [...]}
            "metricas": metricas_totales,
        }