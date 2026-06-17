from sqlmodel import Session, select
from backend.models import Pregunta, Respuesta, Texto, Actividad
from backend.domain.actividad import AnalisisTexto

NIVELES = ["FÁCIL", "MEDIA", "DIFÍCIL"]
MAX_INTENTOS = 3


def cantidad_preguntas_sesion(actividad_id: int, session: Session) -> int:
    """Retorna el tope de preguntas según la longitud del texto."""
    actividad = session.get(Actividad, actividad_id)
    texto = session.get(Texto, actividad.texto_id)
    analisis = AnalisisTexto.desde_texto(texto.contenido)
    return analisis.cantidad_preguntas


def _quedan_preguntas_disponibles(alumno_id: int, actividad_id: int, intento: int, session: Session) -> bool:
    """
    True si existe al menos una pregunta validada, de cualquier dificultad,
    que el alumno todavía no respondió en este intento.
    """
    respondidas = session.exec(
        select(Respuesta.pregunta_id).where(
            Respuesta.alumno_id == alumno_id,
            Respuesta.actividad_id == actividad_id,
            Respuesta.numero_intento == intento,
        )
    ).all()

    pregunta = session.exec(
        select(Pregunta).where(
            Pregunta.actividad_id == actividad_id,
            Pregunta.validada == True,
            ~Pregunta.id.in_(respondidas) if respondidas else True,
        )
    ).first()

    return pregunta is not None


def _intento_cerrado(alumno_id: int, actividad_id: int, intento: int, session: Session) -> bool:
    """
    Un intento está cerrado si llegó al tope de preguntas, o si ya no quedan
    preguntas validadas sin responder en ningún nivel (lo que puede pasar antes
    de llegar al tope, si hay pocas preguntas validadas en algún nivel).
    Un intento sin ninguna respuesta nunca se considera cerrado.
    """
    tope = cantidad_preguntas_sesion(actividad_id, session)
    total = session.exec(
        select(Respuesta).where(
            Respuesta.alumno_id == alumno_id,
            Respuesta.actividad_id == actividad_id,
            Respuesta.numero_intento == intento,
        )
    ).all()
    if not total:
        return False
    if len(total) >= tope:
        return True
    return not _quedan_preguntas_disponibles(alumno_id, actividad_id, intento, session)


def intento_actual(alumno_id: int, actividad_id: int, session: Session) -> int:
    """
    Devuelve el número de intento en que está el alumno (1, 2 o 3).
    - Si el intento anterior está cerrado (tope alcanzado o sin preguntas
      disponibles de ningún nivel), avanza al siguiente.
    - Si ya completó los 3 intentos, devuelve MAX_INTENTOS + 1 (sin más intentos).
    """
    for intento in range(1, MAX_INTENTOS + 1):
        if not _intento_cerrado(alumno_id, actividad_id, intento, session):
            return intento

    return MAX_INTENTOS + 1  # todos los intentos completos


RACHA_PARA_CAMBIAR_NIVEL = 2  # aciertos (o errores) consecutivos necesarios para subir (o bajar) de nivel


def nivel_actual(alumno_id: int, actividad_id: int, intento: int, session: Session) -> str:
    """
    Determina el nivel actual dentro de un intento específico.
    Siempre empieza en FÁCIL. Sube de nivel tras una racha de
    RACHA_PARA_CAMBIAR_NIVEL aciertos consecutivos, y baja tras una
    racha equivalente de errores consecutivos. Una racha rota (acierto
    después de error, o viceversa) reinicia el conteo.
    """
    respuestas = session.exec(
        select(Respuesta)
        .where(
            Respuesta.alumno_id == alumno_id,
            Respuesta.actividad_id == actividad_id,
            Respuesta.numero_intento == intento,
        )
        .order_by(Respuesta.respondido_en)
    ).all()

    if not respuestas:
        return "FÁCIL"

    nivel = "FÁCIL"
    racha_aciertos = 0
    racha_errores = 0
    for r in respuestas:
        if r.es_correcta:
            racha_aciertos += 1
            racha_errores = 0
            if racha_aciertos >= RACHA_PARA_CAMBIAR_NIVEL:
                idx = NIVELES.index(nivel)
                nivel = NIVELES[min(idx + 1, len(NIVELES) - 1)]
                racha_aciertos = 0
        else:
            racha_errores += 1
            racha_aciertos = 0
            if racha_errores >= RACHA_PARA_CAMBIAR_NIVEL:
                idx = NIVELES.index(nivel)
                nivel = NIVELES[max(idx - 1, 0)]
                racha_errores = 0

    return nivel


def actividad_completa(alumno_id: int, actividad_id: int, intento: int, session: Session) -> bool:
    """Verifica si el alumno ya cerró el intento dado (tope alcanzado o sin preguntas disponibles)."""
    return _intento_cerrado(alumno_id, actividad_id, intento, session)


def proxima_pregunta(alumno_id: int, actividad_id: int, intento: int, session: Session):
    """
    Devuelve la próxima pregunta para el alumno en el intento actual.
    Excluye solo las preguntas ya respondidas en ESTE intento.
    Prioriza el nivel correspondiente al desempeño actual; si no quedan
    preguntas validadas de ese nivel, recurre a otro nivel con preguntas
    disponibles en vez de cerrar el intento de forma prematura.
    Retorna (None, nivel) solo si no queda ninguna pregunta sin responder
    en ningún nivel.
    """
    if actividad_completa(alumno_id, actividad_id, intento, session):
        return None, nivel_actual(alumno_id, actividad_id, intento, session)

    nivel = nivel_actual(alumno_id, actividad_id, intento, session)

    respondidas_este_intento = session.exec(
        select(Respuesta.pregunta_id).where(
            Respuesta.alumno_id == alumno_id,
            Respuesta.actividad_id == actividad_id,
            Respuesta.numero_intento == intento,
        )
    ).all()

    pregunta = session.exec(
        select(Pregunta).where(
            Pregunta.actividad_id == actividad_id,
            Pregunta.dificultad == nivel,
            Pregunta.validada == True,
            ~Pregunta.id.in_(respondidas_este_intento) if respondidas_este_intento else True
        )
    ).first()

    if pregunta:
        return pregunta, nivel

    # No quedan preguntas validadas del nivel exacto: buscamos en cualquier
    # otro nivel antes de dar el intento por cerrado.
    pregunta = session.exec(
        select(Pregunta).where(
            Pregunta.actividad_id == actividad_id,
            Pregunta.validada == True,
            ~Pregunta.id.in_(respondidas_este_intento) if respondidas_este_intento else True
        )
    ).first()

    return (pregunta, nivel) if pregunta else (None, nivel)