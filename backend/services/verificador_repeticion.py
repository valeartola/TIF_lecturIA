"""
Verificador mecánico de repetición — detecta preguntas candidatas
demasiado parecidas a preguntas ya aprobadas (de niveles anteriores o
del mismo lote), sin gastar tokens en el juez.

Mismo principio que verificador_idioma.py: el juez razona sobre
'aspecto_cubierto' (un resumen semántico hecho por otro LLM), lo cual es
útil pero no infalible — dos preguntas pueden resumirse con frases
distintas y aun así apuntar a la misma idea (ej. "moraleja del cuento" y
"lección sobre la invención"). Esta verificación es un filtro adicional,
puramente textual y determinístico, que actúa de red de seguridad antes
de esa evaluación semántica.

Estrategia: similitud de secuencias (difflib.SequenceMatcher) sobre el
enunciado de la pregunta, normalizado (minúsculas, sin espacios extra).
No entiende significado, así que no reemplaza al juez ni al control de
aspectos_cubiertos — solo atrapa el caso más obvio: dos preguntas casi
idénticas en su redacción.
"""

from difflib import SequenceMatcher

UMBRAL_SIMILITUD = 0.72  # 0.0 = totalmente distintas, 1.0 = idénticas


def _normalizar(texto: str) -> str:
    return " ".join(texto.strip().lower().split())


def _similitud(a: str, b: str) -> float:
    return SequenceMatcher(None, _normalizar(a), _normalizar(b)).ratio()


def verificar_pregunta(
    pregunta: dict, preguntas_previas: list[str]
) -> dict | None:
    """
    Compara el enunciado de una pregunta candidata contra una lista de
    enunciados ya aprobados.

    Args:
        pregunta: dict con al menos la clave 'pregunta'.
        preguntas_previas: lista de strings con enunciados ya aprobados
            (de niveles anteriores y/o del mismo lote).

    Returns:
        None si no se detectó similitud alta con ninguna anterior.
        dict con {"motivo": str} si se detectó, listo para usarse como
        feedback de rechazo (mismo formato que verificador_idioma).
    """
    enunciado = pregunta.get("pregunta", "")
    if not enunciado or not preguntas_previas:
        return None

    for previa in preguntas_previas:
        ratio = _similitud(enunciado, previa)
        if ratio >= UMBRAL_SIMILITUD:
            return {
                "motivo": (
                    f"La pregunta es muy similar a una ya aprobada "
                    f"(\"{previa}\"). Elegí un aspecto del texto "
                    f"genuinamente distinto, no una reformulación de la "
                    f"misma idea."
                )
            }
    return None


def verificar_lote(
    preguntas: list[dict], preguntas_previas: list[str] = None
) -> dict[int, dict]:
    """
    Verifica un lote de preguntas candidatas, tanto contra preguntas
    previas (de niveles/lotes anteriores) como entre sí mismas (dos
    candidatas del mismo lote pueden resultar parecidas entre ellas).

    Args:
        preguntas: lista de dicts candidatas del lote actual.
        preguntas_previas: enunciados ya aprobados antes de este lote.

    Returns:
        dict {indice: {"motivo": str}} solo para las preguntas con
        problemas detectados, en el mismo formato que
        verificador_idioma.verificar_lote.
    """
    preguntas_previas = list(preguntas_previas or [])
    problemas = {}
    aprobadas_acumuladas = list(preguntas_previas)

    for i, pregunta in enumerate(preguntas):
        resultado = verificar_pregunta(pregunta, aprobadas_acumuladas)
        if resultado:
            problemas[i] = resultado
        else:
            # Si esta candidata no chocó con ninguna anterior, se suma a
            # la lista de comparación para las siguientes del mismo lote
            # (evita que dos candidatas parecidas dentro del lote se
            # aprueben ambas solo porque ninguna era "previa" todavía).
            enunciado = pregunta.get("pregunta", "")
            if enunciado:
                aprobadas_acumuladas.append(enunciado)

    return problemas