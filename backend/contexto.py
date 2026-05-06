import json

def construir_prompt(texto, dificultad, tipo, pos, preguntas_anteriores):
    return f"""
Sos un asistente pedagógico especializado en comprensión 
lectora para niños argentinos de primaria (8 a 12 años).

## TAREA
Generá UNA SOLA pregunta de comprensión lectora.

## PARÁMETROS
- Tipo: {tipo}
- Dificultad: {dificultad}
- Opciones: exactamente 4
- La respuesta correcta debe estar en la posición {pos}

## PREGUNTAS YA GENERADAS (no repetir ideas)
{json.dumps([p['pregunta'] for p in preguntas_anteriores], ensure_ascii=False)}

## REGLAS
- Basate únicamente en información del texto
- No repitas ideas de las preguntas ya generadas
- Lenguaje simple y claro para niños de primaria
- Los distractores deben ser plausibles y basados en el texto
- La correcta va exactamente en posición {pos}

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