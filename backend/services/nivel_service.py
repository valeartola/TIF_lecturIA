from sqlmodel import Session, select
from backend.models import Pregunta, Respuesta, Texto, Actividad
from backend.domain.actividad import AnalisisTexto

NIVELES = ["FÁCIL", "MEDIA", "DIFÍCIL"]


def cantidad_preguntas_sesion(actividad_id: int, session: Session) -> int:
    """Retorna el tope de preguntas según la longitud del texto."""
    actividad = session.get(Actividad, actividad_id)
    texto = session.get(Texto, actividad.texto_id)
    analisis = AnalisisTexto.desde_texto(texto.contenido)
    return analisis.cantidad_preguntas  # 5, 6 o 7 → ahora usamos 6, 8, 10


def nivel_actual(alumno_id: int, actividad_id: int, session: Session) -> str:
    """
    Determina el nivel actual pregunta a pregunta.
    El alumno sube si acierta, se queda si falla. Nunca baja.
    """
    respuestas = session.exec(
        select(Respuesta)
        .where(
            Respuesta.alumno_id == alumno_id,
            Respuesta.actividad_id == actividad_id
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


def actividad_completa(alumno_id: int, actividad_id: int, session: Session) -> bool:
    """Verifica si el alumno ya alcanzó el tope de preguntas para esta actividad."""
    tope = cantidad_preguntas_sesion(actividad_id, session)
    total = session.exec(
        select(Respuesta)
        .where(
            Respuesta.alumno_id == alumno_id,
            Respuesta.actividad_id == actividad_id
        )
    ).all()
    return len(total) >= tope


def proxima_pregunta(alumno_id: int, actividad_id: int, session: Session):
    """
    Devuelve la próxima pregunta para el alumno según su nivel actual,
    excluyendo las ya respondidas. Retorna (None, nivel) si la actividad terminó.
    """
    if actividad_completa(alumno_id, actividad_id, session):
        return None, nivel_actual(alumno_id, actividad_id, session)

    nivel = nivel_actual(alumno_id, actividad_id, session)

    respondidas = session.exec(
        select(Respuesta.pregunta_id)
        .where(
            Respuesta.alumno_id == alumno_id,
            Respuesta.actividad_id == actividad_id
        )
    ).all()

    pregunta = session.exec(
        select(Pregunta)
        .where(
            Pregunta.actividad_id == actividad_id,
            Pregunta.dificultad == nivel,
            Pregunta.validada == True,
            ~Pregunta.id.in_(respondidas) if respondidas else True
        )
    ).first()

    return pregunta, nivel