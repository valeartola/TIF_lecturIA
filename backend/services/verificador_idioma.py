"""
Verificador mecánico de idioma — detecta palabras en inglés mezcladas
en preguntas que deberían estar 100% en español.

Es deliberadamente NO un LLM: una verificación determinística es más
rápida, más barata (no consume tokens) y más confiable que pedirle a un
modelo que juzgue idioma, que es una tarea donde los LLM tienden a ser
inconsistentes (a veces aprueban "homework" en medio de una oración en
español sin marcarlo).

Estrategia: lista de palabras función del inglés (stopwords) que son
extremadamente comunes en inglés y prácticamente no existen en español.
Si alguna aparece como palabra completa en el enunciado u opciones,
se marca la pregunta para descarte automático sin gastar una llamada
al juez.

No pretende ser un detector de idioma exhaustivo (eso requeriría un
modelo de verdad). Es un filtro barato para el caso más común: el LLM
generador "se olvida" y deja una palabra o frase corta en inglés.
"""

import re

# Palabras función del inglés muy frecuentes que NO son palabras válidas
# en español. Se excluyen deliberadamente palabras ambiguas que también
# existen en español (ej. "no", "es" no está pero "is" sí podría
# confundirse con nada en español, así que es segura) para evitar falsos
# positivos. Cualquier palabra de 1-2 letras se excluye por el alto riesgo
# de coincidencia accidental.
PALABRAS_INGLES = {
    "the", "and", "but", "with", "without", "from", "into",
    "about", "before", "after", "because", "although", "though",
    "what", "when", "where", "which", "who", "whom", "whose", "why", "how",
    "this", "that", "these", "those",
    "was", "were", "been", "being",
    "have", "has", "had", "does", "did",
    "would", "could", "should", "must",
    "yes",
    "they", "we", "you",
    "his", "her", "its", "their", "our", "your",
    "of", "for",
    "all", "some", "any", "each", "every", "both", "either", "neither",
    "very", "much", "many", "more", "most", "less", "least",
    "good", "bad", "big", "small", "happy", "sad",
}

# Patrón para extraer palabras (sin contar tildes/ñ como separadores)
_PATRON_PALABRA = re.compile(r"[a-záéíóúñA-ZÁÉÍÓÚÑ]+")

# Terminaciones casi exclusivas del inglés: en español prácticamente no
# existen palabras nativas que terminen así. Se usan como señal adicional
# a las stopwords para cubrir sustantivos/verbos de contenido en inglés
# (ej. "homework", "running", "feeling") que no son palabras función.
_SUFIJOS_INGLES = ("ing", "tion", "sion", "ness", "ship", "ful", "less", "ward", "ment", "work")

# Excepciones: palabras que terminan en esos sufijos pero SÍ son válidas
# en español (préstamos asentados o coincidencias), para evitar falsos
# positivos.
_EXCEPCIONES_SUFIJO = {
    "camping", "marketing", "ranking", "ring", "living",
}


def _tiene_sufijo_ingles(palabra: str) -> bool:
    if len(palabra) < 5 or palabra in _EXCEPCIONES_SUFIJO:
        return False
    return palabra.endswith(_SUFIJOS_INGLES)


def detectar_palabras_ingles(texto: str) -> list[str]:
    """
    Devuelve la lista de palabras en inglés encontradas en el texto
    (sin duplicados, en minúsculas). Lista vacía si no encuentra ninguna.

    Combina dos señales: palabras función del inglés (stopwords) y
    terminaciones morfológicas casi exclusivas del inglés (-ing, -tion,
    etc.) para también capturar sustantivos y verbos de contenido.
    """
    palabras = _PATRON_PALABRA.findall(texto.lower())
    encontradas = {
        p for p in palabras
        if p in PALABRAS_INGLES or _tiene_sufijo_ingles(p)
    }
    return sorted(encontradas)


def verificar_pregunta(pregunta: dict) -> dict | None:
    """
    Verifica una pregunta candidata (dict con 'pregunta' y 'opciones').

    Returns:
        None si no se detectó ningún problema.
        dict con {"motivo": str} si se detectó una palabra en inglés,
        listo para usarse como feedback de rechazo (mismo formato que
        usaría el juez al rechazar).
    """
    textos_a_revisar = [pregunta.get("pregunta", "")]
    textos_a_revisar.extend(pregunta.get("opciones", []))

    encontradas_total = []
    for texto in textos_a_revisar:
        encontradas_total.extend(detectar_palabras_ingles(texto))

    if encontradas_total:
        unicas = sorted(set(encontradas_total))
        return {
            "motivo": (
                f"Se detectó vocabulario en inglés mezclado en la pregunta "
                f"u opciones: {', '.join(unicas)}. Reescribí la pregunta "
                f"completamente en español, sin mezclar idiomas."
            )
        }
    return None


def verificar_lote(preguntas: list[dict]) -> dict[int, dict]:
    """
    Verifica un lote de preguntas candidatas.

    Returns:
        dict {indice: {"motivo": str}} solo para las preguntas con
        problemas detectados. Las preguntas sin problemas no aparecen
        en el resultado.
    """
    problemas = {}
    for i, pregunta in enumerate(preguntas):
        resultado = verificar_pregunta(pregunta)
        if resultado:
            problemas[i] = resultado
    return problemas