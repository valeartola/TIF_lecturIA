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


def intento_actual(alumno_id: int, actividad_id: int, session: Session) -> int:
    """
    Devuelve el número de intento en que está el alumno (1, 2 o 3).
    - Si el intento anterior está completo, avanza al siguiente.
    - Si ya completó los 3 intentos, devuelve MAX_INTENTOS + 1 (sin más intentos).
    """
    tope = cantidad_preguntas_sesion(actividad_id, session)

    for intento in range(1, MAX_INTENTOS + 1):
        total = session.exec(
            select(Respuesta).where(
                Respuesta.alumno_id == alumno_id,
                Respuesta.actividad_id == actividad_id,
                Respuesta.numero_intento == intento,
            )
        ).all()
        if len(total) < tope:
            return intento

    return MAX_INTENTOS + 1  # todos los intentos completos


def nivel_actual(alumno_id: int, actividad_id: int, intento: int, session: Session) -> str:
    """
    Determina el nivel actual dentro de un intento específico.
    Siempre empieza en FÁCIL y sube si acierta.
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
    for r in respuestas:
        if r.es_correcta:
            idx = NIVELES.index(nivel)
            nivel = NIVELES[min(idx + 1, len(NIVELES) - 1)]

    return nivel


def actividad_completa(alumno_id: int, actividad_id: int, intento: int, session: Session) -> bool:
    """Verifica si el alumno ya alcanzó el tope de preguntas en el intento dado."""
    tope = cantidad_preguntas_sesion(actividad_id, session)
    total = session.exec(
        select(Respuesta).where(
            Respuesta.alumno_id == alumno_id,
            Respuesta.actividad_id == actividad_id,
            Respuesta.numero_intento == intento,
        )
    ).all()
    return len(total) >= tope


def proxima_pregunta(alumno_id: int, actividad_id: int, intento: int, session: Session):
    """
    Devuelve la próxima pregunta para el alumno en el intento actual.
    Excluye solo las preguntas ya respondidas en ESTE intento.
    Retorna (None, nivel) si el intento terminó.
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

    return pregunta, nivel