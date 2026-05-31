from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select

from backend.database import get_session
from backend.models import Actividad, Pregunta, Respuesta

router = APIRouter(prefix="/respuestas", tags=["Respuestas"])


@router.post("/")
def registrar_respuesta(
    alumno_id: int,
    pregunta_id: int,
    opcion_elegida: int,
    session: Session = Depends(get_session)
):
    pregunta = session.get(Pregunta, pregunta_id)
    if not pregunta:
        raise HTTPException(status_code=404, detail="Pregunta no encontrada")
    if not pregunta.validada:
        raise HTTPException(status_code=400, detail="La pregunta no está disponible")

    # Verificar que la actividad padre está validada
    actividad = session.get(Actividad, pregunta.actividad_id)
    if not actividad or not actividad.validada:
        raise HTTPException(status_code=403, detail="La actividad no está publicada")

    es_correcta = opcion_elegida == pregunta.opcion_correcta

    respuesta = Respuesta(
        alumno_id=alumno_id,
        pregunta_id=pregunta_id,
        actividad_id=pregunta.actividad_id,
        opcion_elegida=opcion_elegida,
        es_correcta=es_correcta
    )
    session.add(respuesta)
    session.commit()

    return {
        "es_correcta": es_correcta,
        "opcion_elegida": opcion_elegida,
        "opcion_correcta": pregunta.opcion_correcta,
        "dificultad": pregunta.dificultad
    }

@router.get("/alumno/{alumno_id}/historial")
def historial_alumno(
    alumno_id: int,
    actividad_id: int | None = None,
    session: Session = Depends(get_session)
):
    """Devuelve las respuestas del alumno, opcionalmente filtradas por actividad."""
    from sqlmodel import select
    query = select(Respuesta).where(Respuesta.alumno_id == alumno_id)
    if actividad_id is not None:
        query = query.where(Respuesta.actividad_id == actividad_id)

    respuestas = session.exec(query).all()

    return {
        "alumno_id": alumno_id,
        "total": len(respuestas),
        "respuestas": [
            {
                "pregunta_id": r.pregunta_id,
                "actividad_id": r.actividad_id,
                "opcion_elegida": r.opcion_elegida,
                "es_correcta": r.es_correcta,
                "respondido_en": r.respondido_en,
            }
            for r in respuestas
        ]
    }
