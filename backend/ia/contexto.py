import json


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