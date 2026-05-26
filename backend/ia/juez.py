"""
LLM juez — evalúa preguntas de comprensión lectora generadas.

Usa un modelo distinto al del generador (gpt-oss-20b via UM-Cloud vs
llama-3.3-70b via Groq) para tener criterio independiente.
Temperatura 0.5 para equilibrar estabilidad y sensibilidad pedagógica.
"""

import json
import os
import re
import time
from openai import OpenAI, RateLimitError, APIConnectionError
from dotenv import load_dotenv

from backend.ia.contexto import construir_prompt_juez
from backend.ia.especificaciones_loader import specs_para_juez

load_dotenv()

_client = OpenAI(
    api_key=os.getenv("UM_CLOUD_API_KEY"),
    base_url="https://ai.cloud.um.edu.ar/api/v1",
)

_MODELO_JUEZ = "gpt-oss-20b"
_TEMPERATURA_JUEZ = 0.5
_PAUSA_ENTRE_LLAMADAS_S = 2.0

# Cargar specs una sola vez al importar el módulo.
_SPECS = specs_para_juez()

# Campos que el juez SIEMPRE debe devolver.
_CAMPOS_REQUERIDOS = [
    "contenido_texto", "respuesta_correcta_unica", "nivel_adecuado",
    "no_repeticion", "aspecto_cubierto", "aprobada", "comentarios",
    "sugerencia_mejora"
]


def _validar_evaluacion(eval_dict):
    """Verifica que la respuesta del juez tenga la estructura esperada."""
    for campo in _CAMPOS_REQUERIDOS:
        if campo not in eval_dict:
            raise ValueError(f"Falta campo '{campo}' en evaluación del juez")

    for dim in ["contenido_texto", "respuesta_correcta_unica", "nivel_adecuado",
                "no_repeticion"]:
        if not isinstance(eval_dict[dim], int) or not 1 <= eval_dict[dim] <= 5:
            raise ValueError(
                f"Dimensión '{dim}' debe ser entero 1-5, vino: {eval_dict[dim]}"
            )

    if not isinstance(eval_dict["aprobada"], bool):
        raise ValueError("'aprobada' debe ser true/false")

    if not isinstance(eval_dict["aspecto_cubierto"], str) or \
            not eval_dict["aspecto_cubierto"].strip():
        raise ValueError("'aspecto_cubierto' debe ser un string no vacío")


def _calcular_aprobada(eval_dict):
    """
    Recalcula 'aprobada' desde los puntajes según el umbral.
    - nivel_adecuado debe ser >= 4: exigimos que la dificultad sea correcta.
    - El resto de las dimensiones deben ser >= 3.
    """
    dims_permisivas = ["contenido_texto", "respuesta_correcta_unica", "no_repeticion"]
    if not all(eval_dict[d] >= 3 for d in dims_permisivas):
        return False
    return eval_dict["nivel_adecuado"] >= 4


def _llamar_modelo(prompt):
    """
    Llama al modelo manejando rate limits y errores de conexión.

    - RateLimitError con espera <= 600s: duerme y reintenta.
    - RateLimitError con espera > 600s: aborta.
    - APIConnectionError: espera 5s y reintenta.
    - Hasta 3 reintentos en total.
    """
    for intento in range(3):
        try:
            return _client.chat.completions.create(
                model=_MODELO_JUEZ,
                messages=[{"role": "user", "content": prompt}],
                temperature=_TEMPERATURA_JUEZ,
                response_format={"type": "json_object"},
            )
        except RateLimitError as e:
            m = re.search(r"in\s+(?:(\d+)m)?\s*([\d.]+)s", str(e))
            if not m:
                raise
            espera = (int(m.group(1)) if m.group(1) else 0) * 60 + float(m.group(2))
            if espera > 600:
                raise
            print(f"   [juez] rate limit, esperando {espera:.0f}s "
                  f"(intento {intento + 1}/3)...")
            time.sleep(espera + 1)
        except APIConnectionError:
            if intento == 2:
                raise
            print(f"   [juez] error de conexión, reintentando en 5s "
                  f"(intento {intento + 1}/3)...")
            time.sleep(5)
    raise RuntimeError("Juez: no se pudo conectar tras varios reintentos")


def evaluar(texto, pregunta, dificultad, tipo, aspectos_previos=None):
    """
    Evalúa una pregunta en las 4 dimensiones.

    Args:
        texto: el texto fuente.
        pregunta: dict con pregunta, opciones, correcta.
        dificultad: FÁCIL, MEDIA o DIFÍCIL.
        tipo: tipo de pregunta pedido al generador.
        aspectos_previos: lista de aspectos ya cubiertos por preguntas
            aprobadas anteriores. Se pasa al prompt para que el juez
            evalúe D4 (no_repeticion).

    Returns:
        dict con contenido_texto, respuesta_correcta_unica, nivel_adecuado,
        no_repeticion, aspecto_cubierto, aprobada, comentarios,
        sugerencia_mejora.
    """
    time.sleep(_PAUSA_ENTRE_LLAMADAS_S)

    prompt = construir_prompt_juez(
        texto, pregunta, dificultad, tipo, _SPECS, aspectos_previos
    )

    respuesta = _llamar_modelo(prompt)
    contenido = respuesta.choices[0].message.content

    try:
        evaluacion = json.loads(contenido)
        _validar_evaluacion(evaluacion)
    except (json.JSONDecodeError, ValueError) as e:
        print(f"   [juez] formato inválido ({e}), reintentando...")
        time.sleep(_PAUSA_ENTRE_LLAMADAS_S)
        respuesta = _llamar_modelo(prompt)
        evaluacion = json.loads(respuesta.choices[0].message.content)
        _validar_evaluacion(evaluacion)

    # Recalculamos aprobada desde los puntajes (defensa ante inconsistencias).
    evaluacion["aprobada"] = _calcular_aprobada(evaluacion)
    return evaluacion