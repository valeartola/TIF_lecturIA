import json
import random
import os
import time
import re
from groq import Groq, RateLimitError, APIConnectionError
from dotenv import load_dotenv

from backend.contexto import construir_prompt_generador
from backend.especificaciones_loader import specs_para_generador
from backend.juez import evaluar

load_dotenv()
_client = Groq(api_key=os.getenv("GROQ_API_KEY"))

_MODELO_GENERADOR = "llama-3.3-70b-versatile"
_MAX_INTENTOS_POR_PREGUNTA = 3
_MAX_REEMPLAZOS_TOTALES = 5  # techo de seguridad para no quedar en loop

# Cuando golpea rate limit, esperamos lo que diga Groq (más un margen).
# Tope de espera: si Groq pide más de _MAX_ESPERA_S, abortamos.
# 600s = 10 minutos, razonable para cuotas de TPM/cortas.
_MAX_ESPERA_S = 600

# Espera fija para errores de conexión (red caída, DNS, etc.)
_ESPERA_CONEXION_S = 5

# Cargar specs una sola vez al importar el módulo.
_SPECS = specs_para_generador()


def analizar_texto(texto):
    palabras = len(texto.split())
    if palabras < 300:
        cantidad = random.choice([4, 5])
        tipo = "corto"
    elif palabras < 600:
        cantidad = random.choice([5, 6])
        tipo = "mediano"
    else:
        cantidad = random.choice([6, 7])
        tipo = "largo"
    return cantidad, tipo


def definir_tipos_pregunta(cantidad):
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


def generar_posiciones(cantidad):
    posiciones = list(range(4)) * (cantidad // 4 + 1)
    random.shuffle(posiciones)
    return posiciones[:cantidad]


def _llamar_modelo(prompt):
    """
    Llama al modelo manejando rate limits y errores de conexión.

    - RateLimitError con espera <= _MAX_ESPERA_S: duerme y reintenta.
    - RateLimitError con espera > _MAX_ESPERA_S: aborta (cuota diaria larga).
    - APIConnectionError: espera fija y reintenta (red caída o DNS).
    - Hasta 3 reintentos en total.
    """
    for intento in range(3):
        try:
            return _client.chat.completions.create(
                model=_MODELO_GENERADOR,
                messages=[{"role": "user", "content": prompt}],
                response_format={"type": "json_object"},
            )
        except RateLimitError as e:
            espera = _extraer_espera_segundos(str(e))
            if espera is None or espera > _MAX_ESPERA_S:
                raise  # cuota diaria: no tiene sentido esperar
            print(f"   [generador] rate limit, esperando {espera:.0f}s "
                  f"(intento {intento + 1}/3)...")
            time.sleep(espera + 1)
        except APIConnectionError:
            if intento == 2:
                raise  # tercer intento: propagamos
            print(f"   [generador] error de conexión, reintentando en "
                  f"{_ESPERA_CONEXION_S}s (intento {intento + 1}/3)...")
            time.sleep(_ESPERA_CONEXION_S)
    raise RuntimeError("Generador: no se pudo conectar tras varios reintentos")


def _extraer_espera_segundos(mensaje):
    """
    Extrae los segundos de espera de un mensaje de rate limit de Groq.
    Maneja formatos: '12.5s', '1m30s', '40m8.832s'.
    Devuelve float o None si no encuentra.
    """
    m = re.search(r"in\s+(?:(\d+)m)?\s*([\d.]+)s", mensaje)
    if not m:
        return None
    minutos = int(m.group(1)) if m.group(1) else 0
    segundos = float(m.group(2))
    return minutos * 60 + segundos


def _llamar_generador(prompt):
    """Llama al modelo y parsea el JSON. Un reintento si el formato falla."""
    respuesta = _llamar_modelo(prompt)
    contenido = respuesta.choices[0].message.content
    try:
        return json.loads(contenido)
    except json.JSONDecodeError:
        respuesta = _llamar_modelo(prompt)
        return json.loads(respuesta.choices[0].message.content)


def _generar_y_evaluar(texto, dificultad, tipo, pos, preguntas_anteriores,
                       aspectos_previos=None):
    """
    Genera UNA pregunta y la evalúa. Si el juez la rechaza, regenera con
    feedback hasta _MAX_INTENTOS_POR_PREGUNTA veces.

    Args:
        aspectos_previos: lista de strings con los aspectos cubiertos por
            las preguntas ya aprobadas. Se pasa tanto al generador (para
            que evite esos aspectos) como al juez (para que evalúe D4).

    Devuelve (pregunta, evaluacion, intentos, rechazadas) si aprueba,
    o (None, ultima_evaluacion, intentos, rechazadas) si no aprobó.
    """
    feedback = None
    ultima_evaluacion = None
    rechazadas = []

    for intento in range(1, _MAX_INTENTOS_POR_PREGUNTA + 1):
        prompt = construir_prompt_generador(
            texto, dificultad, tipo, pos, preguntas_anteriores, _SPECS,
            feedback=feedback, aspectos_previos=aspectos_previos
        )
        pregunta = _llamar_generador(prompt)

        evaluacion = evaluar(
            texto, pregunta, dificultad, tipo,
            aspectos_previos=aspectos_previos
        )
        ultima_evaluacion = evaluacion

        scores = (
            f"D1={evaluacion['contenido_texto']} "
            f"D2={evaluacion['respuesta_correcta_unica']} "
            f"D3={evaluacion['nivel_adecuado']} "
            f"D4={evaluacion['no_repeticion']}"
        )
        estado = "✓ aprobada" if evaluacion["aprobada"] else "✗ rechazada"
        aspecto = evaluacion.get("aspecto_cubierto", "?")
        print(f"     intento {intento}: {scores} → {estado}  [{aspecto}]")

        if evaluacion["aprobada"]:
            return pregunta, evaluacion, intento, rechazadas

        rechazadas.append({
            "intento": intento,
            "pregunta": pregunta,
            "evaluacion": evaluacion,
        })
        feedback = evaluacion["sugerencia_mejora"] or evaluacion["comentarios"]

    return None, ultima_evaluacion, _MAX_INTENTOS_POR_PREGUNTA, rechazadas


def generar_actividad(texto, dificultad="MEDIA"):
    """
    Genera una actividad completa: cantidad adaptada al texto, cada pregunta
    pasa por generación + evaluación del juez. Si una pregunta no aprueba
    tras varios intentos, se descarta y se intenta una nueva (reemplazo).
    """
    cantidad, tipo_texto = analizar_texto(texto)
    tipos_pregunta = definir_tipos_pregunta(cantidad)
    posiciones = generar_posiciones(cantidad)

    print(f" Texto {tipo_texto}: {len(texto.split())} palabras")
    print(f" Generando {cantidad} preguntas")
    print(f" Tipos: {tipos_pregunta}")

    preguntas_aprobadas = []
    aspectos_cubiertos = []   # frases de aspecto de cada pregunta aprobada
    descartes = []
    rechazos_todos = []
    reemplazos_usados = 0

    for i, (tipo, pos) in enumerate(zip(tipos_pregunta, posiciones)):
        print(f"\n   Pregunta {i+1}/{cantidad} — tipo: {tipo}, pos: {pos}")

        pregunta, evaluacion, intentos, rechazadas = _generar_y_evaluar(
            texto, dificultad, tipo, pos, preguntas_aprobadas,
            aspectos_previos=aspectos_cubiertos
        )
        for r in rechazadas:
            rechazos_todos.append({"slot": i + 1, "tipo": tipo, **r})

        while pregunta is None and reemplazos_usados < _MAX_REEMPLAZOS_TOTALES:
            reemplazos_usados += 1
            nueva_pos = random.choice([0, 1, 2, 3])
            print(f"   ↻ reemplazo {reemplazos_usados}: nuevo intento "
                  f"con pos={nueva_pos}")
            descartes.append({
                "indice": i, "tipo": tipo,
                "ultima_evaluacion": evaluacion, "intentos": intentos,
            })
            pregunta, evaluacion, intentos, rechazadas = _generar_y_evaluar(
                texto, dificultad, tipo, nueva_pos, preguntas_aprobadas,
                aspectos_previos=aspectos_cubiertos
            )
            for r in rechazadas:
                rechazos_todos.append({"slot": i + 1, "tipo": tipo, **r})

        if pregunta is None:
            print(f"   ⚠ No se logró una pregunta aprobada para el slot {i+1}")
            descartes.append({
                "indice": i, "tipo": tipo,
                "ultima_evaluacion": evaluacion, "intentos": intentos,
                "agotado": True,
            })
            continue

        # Guardar el aspecto para que las siguientes preguntas lo conozcan.
        aspecto = evaluacion.get("aspecto_cubierto", "").strip()
        if aspecto:
            aspectos_cubiertos.append(aspecto)

        pregunta["tipo"] = tipo
        pregunta["evaluacion"] = {**evaluacion, "intentos": intentos}
        preguntas_aprobadas.append(pregunta)

    print(f"\n {len(preguntas_aprobadas)}/{cantidad} preguntas aprobadas "
          f"({reemplazos_usados} reemplazos, {len(descartes)} descartes, "
          f"{len(rechazos_todos)} intentos rechazados)")
    print(f" Aspectos cubiertos: {aspectos_cubiertos}")

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