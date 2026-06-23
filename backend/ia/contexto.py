import json


def construir_prompt_juez_lote(
    texto, preguntas, dificultad, tipo, specs, aspectos_previos=None
):
    """
    Construye el prompt para el JUEZ en modo batch.

    Evalúa una lista de preguntas en una sola llamada al LLM.
    El texto y las specs se envían una sola vez, reduciendo significativamente
    el consumo de tokens frente a llamadas individuales por pregunta.

    Args:
        texto: el texto fuente (ya truncado).
        preguntas: lista de dicts con pregunta, opciones, correcta.
        dificultad: FÁCIL, MEDIA o DIFÍCIL pedida al generador.
        tipo: tipo de pregunta pedido al generador.
        specs: pedagogía + rúbrica (de specs_para_juez()).
        aspectos_previos: lista de strings con aspectos ya cubiertos por
            preguntas aprobadas anteriores al lote actual.
    """
    if aspectos_previos:
        lista = "\n".join(f"- {a}" for a in aspectos_previos)
        bloque_aspectos = f"""
## ASPECTOS YA CUBIERTOS (preguntas aprobadas antes de este lote)
{lista}

Usá esta lista para evaluar D4 (No repetición) de cada pregunta.
También tenés en cuenta la repetición entre preguntas del mismo lote.
"""
    else:
        bloque_aspectos = """
## ASPECTOS YA CUBIERTOS
(ninguna pregunta aprobada previa — primera generación de esta actividad)

D4 = 5 automáticamente para la primera pregunta del lote que no repita
aspectos con las demás del mismo lote.
"""

    preguntas_json = json.dumps(
        [{"indice": i, **p} for i, p in enumerate(preguntas)],
        ensure_ascii=False,
        indent=2
    )

    n = len(preguntas)
    return f"""Sos un evaluador pedagógico de preguntas de comprensión lectora.
Tu tarea es evaluar un lote de {n} preguntas en una sola respuesta.
Aplicá la rúbrica con criterio estricto pero justo, basándote
únicamente en el texto provisto y en los criterios pedagógicos.

## CRITERIOS Y RÚBRICA
{specs}

## TEXTO FUENTE
{texto}

## PARÁMETROS DEL LOTE
- Tipo solicitado al generador: {tipo}
- Dificultad solicitada al generador: {dificultad}

## PREGUNTAS A EVALUAR
{preguntas_json}
{bloque_aspectos}
## INSTRUCCIONES
Evaluá cada pregunta en las cuatro dimensiones (contenido_texto,
respuesta_correcta_unica, nivel_adecuado, no_repeticion) según la rúbrica.
La opción correcta de cada pregunta es la que está en la posición indicada
por el campo "correcta" (0-indexed).

Para evaluar D4, considerá tanto los aspectos previos listados arriba
como los aspectos cubiertos por las otras preguntas del mismo lote.

Devolvé ÚNICAMENTE un JSON válido con un array de {n} objetos, uno por
pregunta, en el mismo orden en que aparecen arriba. Sin texto extra, sin
markdown:

[
  {{
    "indice": 0,
    "contenido_texto": <1-5>,
    "respuesta_correcta_unica": <1-5>,
    "nivel_adecuado": <1-5>,
    "no_repeticion": <1-5>,
    "aspecto_cubierto": "frase corta (3-7 palabras) sobre qué aspecto cubre",
    "aprobada": <true|false>,
    "comentarios": "qué está bien y qué se podría mejorar",
    "sugerencia_mejora": "instrucción concreta si aprobada=false, si no string vacío"
  }},
  ...
]

Recordá: aprobada=true solo si TODAS las cuatro dimensiones tienen puntaje ≥ 3.
"""


def construir_prompt_generador_lote(
    texto, dificultad, tipos, preguntas_anteriores, specs,
    feedbacks=None, aspectos_previos=None
):
    """
    Construye el prompt para el GENERADOR en modo batch.

    Pide todas las preguntas de un nivel en una sola llamada, en lugar de
    una llamada por pregunta. Esto reduce drásticamente el consumo de
    tokens (el texto y las specs se envían una sola vez) y además ayuda
    a que el modelo no se repita a sí mismo, porque genera todo el lote
    con visión simultánea de las preguntas anteriores y de las nuevas.

    El LLM no recibe una posición objetivo para la opción correcta: la
    marca él mismo (campo "respuesta_correcta"), y el índice numérico se
    resuelve después por búsqueda en Generador._resolver_correcta. Esto
    evita que el modelo tenga que "encajar" el contenido correcto en una
    posición predeterminada, que es donde se producían errores de
    indexado (la respuesta correcta quedaba mal marcada).

    Args:
        texto: el texto fuente.
        dificultad: FÁCIL, MEDIA o DIFÍCIL.
        tipos: lista de tipos de pregunta, uno por slot.
        preguntas_anteriores: lista de preguntas ya aprobadas (de niveles
            previos en la misma actividad).
        specs: especificaciones pedagógicas (de specs_para_generador()).
        feedbacks: dict opcional {indice_slot: sugerencia_del_juez} para
            reintentos con corrección dirigida.
        aspectos_previos: lista de strings con aspectos ya cubiertos por
            preguntas anteriores (de niveles previos).
    """
    feedbacks = feedbacks or {}
    n = len(tipos)

    slots_desc = []
    for i, tipo in enumerate(tipos):
        bloque = f'- Slot {i}: tipo="{tipo}"'
        if i in feedbacks:
            bloque += f'\n  REINTENTO — la versión anterior fue rechazada por: {feedbacks[i]}\n  Corregí ese problema específico en esta nueva versión.'
        slots_desc.append(bloque)
    bloque_slots = "\n".join(slots_desc)

    bloque_aspectos = ""
    if aspectos_previos:
        lista = "\n".join(f"- {a}" for a in aspectos_previos)
        bloque_aspectos = f"""
## ASPECTOS YA CUBIERTOS (no repetir, ni siquiera reformulados)
Preguntas de niveles anteriores ya cubren estos aspectos del texto:
{lista}

Ninguna de las nuevas preguntas debe apuntar a estos aspectos, incluyendo
reformulaciones o variantes de la misma idea (ej. si ya se preguntó por la
"moraleja" o "lección principal" del texto, no generes otra pregunta sobre
"qué aprendió" el personaje ni sobre "la idea principal" si en el fondo
apunta al mismo mensaje). Elegí un aspecto del texto genuinamente distinto.
"""

    bloque_anteriores = ""
    if preguntas_anteriores:
        bloque_anteriores = f"""
## PREGUNTAS YA GENERADAS EN ESTA ACTIVIDAD (no repetir ideas ni wording)
{json.dumps([p['pregunta'] for p in preguntas_anteriores], ensure_ascii=False)}
"""

    return f"""Sos un asistente pedagógico especializado en comprensión lectora
para niños argentinos de primaria (8 a 12 años). Conocés y respetás los
siguientes criterios pedagógicos.

## CRITERIOS PEDAGÓGICOS
{specs}

## TAREA
Generá {n} preguntas de comprensión lectora DISTINTAS entre sí, una por
cada slot detallado abajo, siguiendo estrictamente los criterios anteriores.
Cada pregunta debe apuntar a un aspecto diferente del texto: no repitas
ideas, datos ni wording entre las {n} preguntas de este lote.

## QUÉ SIGNIFICA CADA DIFICULTAD (aplica a TODAS las preguntas de este lote)
- FÁCIL: pregunta sobre información explícita y directa del texto. El estudiante
  solo necesita localizar y leer. Sin inferencias. Vocabulario simple.
- MEDIA: puede requerir relacionar dos partes del texto o una inferencia simple.
  Vocabulario accesible pero con algún término que requiera atención.
- DIFÍCIL: requiere inferencia, análisis de causa-efecto, interpretación del
  significado global o relación entre ideas no contiguas del texto. NO puede
  ser una pregunta literal. Vocabulario más preciso y opciones más desafiantes.

Dificultad pedida para TODO el lote: {dificultad}

## COBERTURA DEL TEXTO (importante para evitar repetición)
Antes de escribir las preguntas, identificá mentalmente entre 5 y 8 momentos
o aspectos DISTINTOS del texto (ej. una situación inicial, una reacción de
un personaje secundario, una dificultad concreta, una acción de otro
personaje, el desenlace, un detalle descriptivo, etc.).

Repartí las {n} preguntas de este lote entre esos momentos distintos: cada
pregunta debe apuntar a un momento o aspecto diferente del texto. Si dos
preguntas del lote terminarían apuntando al mismo momento o a la misma idea
central (por ejemplo, la moraleja o el mensaje general), descartá una de
las dos y elegí otro aspecto del texto que todavía no esté cubierto, aunque
sea secundario.

No concentres las preguntas únicamente en la idea principal o en el
desenlace: el texto tiene personajes secundarios, causas, reacciones y
detalles que también son material válido para preguntar.

## SLOTS A GENERAR
Cada slot define el tipo de pregunta que tenés que generar.
{bloque_slots}
{bloque_anteriores}{bloque_aspectos}
## ORTOGRAFÍA
Revisá la ortografía y gramática antes de responder. No uses errores tipográficos
ni palabras mal escritas en ninguna pregunta ni opción.

## CÓMO ARMAR CADA PREGUNTA (hacelo en este orden mental, no lo escribas)
1. Pensá la pregunta y la ÚNICA respuesta correcta, justificada por el texto.
2. Escribí esa respuesta correcta tal cual en el campo "respuesta_correcta".
3. Después escribí los otros 3 distractores (también dentro de "opciones"),
   plausibles pero claramente incorrectos según el texto.
4. NO te preocupes por el orden de las opciones dentro de la lista: lo
   importante es que "respuesta_correcta" sea EXACTAMENTE igual, carácter
   por carácter, a una de las strings que pusiste en "opciones".

## FORMATO
Devolvé ÚNICAMENTE un JSON válido con esta forma exacta — un objeto con
una clave "preguntas" cuyo valor es un array de {n} objetos, uno por slot,
EN EL MISMO ORDEN en que aparecen arriba (slot 0 primero, slot 1 segundo, etc).
Sin texto extra, sin markdown:

{{
  "preguntas": [
    {{
      "pregunta": "...",
      "opciones": ["opción A", "opción B", "opción C", "opción D"],
      "respuesta_correcta": "<copiá acá, exactamente igual, la opción correcta>"
    }},
    ...
  ]
}}

## TEXTO
{texto}
"""


def construir_prompt_generador(
    texto, dificultad, tipo, pos, preguntas_anteriores, specs,
    feedback=None, aspectos_previos=None
):
    """
    Construye el prompt para el GENERADOR.

    Args:
        texto: el texto fuente.
        dificultad: FÁCIL, MEDIA o DIFÍCIL.
        tipo: tipo de pregunta (literal, inferencial, etc).
        pos: posición 0-3 donde debe quedar la opción correcta.
        preguntas_anteriores: lista de preguntas ya aprobadas.
        specs: especificaciones pedagógicas (de specs_para_generador()).
        feedback: si es un reintento, sugerencia del juez sobre qué mejorar.
        aspectos_previos: lista de strings con los aspectos ya cubiertos por
            preguntas anteriores (ej. ["motivación del vecino", "descripción del gato"]).
    """
    bloque_feedback = ""
    if feedback:
        bloque_feedback = f"""
## REINTENTO — FEEDBACK DEL EVALUADOR
La versión anterior de esta pregunta fue rechazada por el siguiente motivo:
{feedback}

Corregí ese problema específico en esta nueva versión.
"""

    bloque_aspectos = ""
    if aspectos_previos:
        lista = "\n".join(f"- {a}" for a in aspectos_previos)
        bloque_aspectos = f"""
## ASPECTOS YA CUBIERTOS (no repetir)
Las preguntas anteriores ya cubren estos aspectos del texto:
{lista}

Tu nueva pregunta DEBE apuntar a un aspecto distinto del texto que no
esté en esa lista.
"""

    return f"""Sos un asistente pedagógico especializado en comprensión lectora
para niños argentinos de primaria (8 a 12 años). Conocés y respetás los
siguientes criterios pedagógicos.

## CRITERIOS PEDAGÓGICOS
{specs}

## TAREA
Generá UNA SOLA pregunta de comprensión lectora siguiendo estrictamente los
criterios anteriores.

## PARÁMETROS
- Tipo: {tipo}
- Dificultad: {dificultad}
- Opciones: exactamente 4
- La respuesta correcta debe estar en la posición {pos}

## QUÉ SIGNIFICA CADA DIFICULTAD
- FÁCIL: pregunta sobre información explícita y directa del texto. El estudiante
  solo necesita localizar y leer. Sin inferencias. Vocabulario simple.
- MEDIA: puede requerir relacionar dos partes del texto o una inferencia simple.
  Vocabulario accesible pero con algún término que requiera atención.
- DIFÍCIL: requiere inferencia, análisis de causa-efecto, interpretación del
  significado global o relación entre ideas no contiguas del texto. NO puede
  ser una pregunta literal. Vocabulario más preciso y opciones más desafiantes.

## PREGUNTAS YA GENERADAS (no repetir ideas ni wording)
{json.dumps([p['pregunta'] for p in preguntas_anteriores], ensure_ascii=False)}
{bloque_aspectos}{bloque_feedback}
## ORTOGRAFÍA
Revisá la ortografía y gramática antes de responder. No uses errores tipográficos
ni palabras mal escritas en la pregunta ni en las opciones.

## FORMATO
ÚNICAMENTE JSON válido, sin texto extra, sin markdown:
{{
  "pregunta": "...",
  "opciones": ["opción 0", "opción 1", "opción 2", "opción 3"],
  "correcta": {pos}
}}

## TEXTO
{texto}
"""


def construir_prompt_juez(
    texto, pregunta, dificultad, tipo, specs, aspectos_previos=None
):
    """
    Construye el prompt para el JUEZ.

    Args:
        texto: el texto fuente.
        pregunta: dict con pregunta, opciones, correcta.
        dificultad: FÁCIL, MEDIA o DIFÍCIL pedida al generador.
        tipo: tipo de pregunta pedido al generador.
        specs: pedagogía + rúbrica + ejemplos (de specs_para_juez()).
        aspectos_previos: lista de strings con los aspectos ya cubiertos
            por preguntas anteriores aprobadas. El juez los usa para
            evaluar D4 (no_repeticion).
    """
    if aspectos_previos:
        lista = "\n".join(f"- {a}" for a in aspectos_previos)
        bloque_aspectos = f"""
## ASPECTOS YA CUBIERTOS POR PREGUNTAS ANTERIORES
{lista}

Usá esta lista para evaluar D4 (No repetición). Si la pregunta apunta al
mismo aspecto que alguno de los anteriores, penalizá D4 en consecuencia.
Si esta es la primera pregunta (lista vacía), D4 = 5 automáticamente.
"""
    else:
        bloque_aspectos = """
## ASPECTOS YA CUBIERTOS POR PREGUNTAS ANTERIORES
(ninguna — esta es la primera pregunta de la actividad)

D4 = 5 automáticamente: no hay preguntas anteriores con qué comparar.
"""

    return f"""Sos un evaluador pedagógico de preguntas de comprensión lectora.
Tu tarea es aplicar la rúbrica con criterio estricto pero justo, basándote
únicamente en el texto provisto y en los criterios pedagógicos.

## CRITERIOS Y RÚBRICA
{specs}

## TEXTO FUENTE
{texto}

## PREGUNTA A EVALUAR
- Tipo solicitado al generador: {tipo}
- Dificultad solicitada al generador: {dificultad}

{json.dumps(pregunta, ensure_ascii=False, indent=2)}
{bloque_aspectos}
## INSTRUCCIONES
Evaluá la pregunta en las cuatro dimensiones (contenido_texto,
respuesta_correcta_unica, nivel_adecuado, no_repeticion) según la rúbrica.
La opción correcta es la que está en la posición indicada por el campo
"correcta" (0-indexed).

Devolvé ÚNICAMENTE un JSON válido, sin texto extra, sin markdown, con esta
estructura exacta:

{{
  "contenido_texto": <1-5>,
  "respuesta_correcta_unica": <1-5>,
  "nivel_adecuado": <1-5>,
  "no_repeticion": <1-5>,
  "aspecto_cubierto": "frase corta (3-7 palabras) sobre qué aspecto del texto cubre esta pregunta",
  "aprobada": <true|false>,
  "comentarios": "Texto breve indicando qué está bien y qué se podría mejorar.",
  "sugerencia_mejora": "Si aprobada=false, instrucción concreta para regenerar. Si aprobada=true, dejar string vacío."
}}

Recordá: aprobada=true solo si TODAS las cuatro dimensiones tienen puntaje ≥ 3.
"""