from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select

from backend.database import get_session
from backend.models import Actividad, Pregunta, Respuesta, Usuario
from backend.auth import solo_alumno, get_usuario_actual

router = APIRouter(prefix="/respuestas", tags=["Respuestas"])


@router.post("/")
def registrar_respuesta(
    pregunta_id: int,
    opcion_elegida: int,
    session: Session = Depends(get_session),
    alumno: Usuario = Depends(solo_alumno)
):
    pregunta = session.get(Pregunta, pregunta_id)
    if not pregunta:
        raise HTTPException(status_code=404, detail="Pregunta no encontrada")
    if not pregunta.validada:
        raise HTTPException(status_code=400, detail="La pregunta no está disponible")

    actividad = session.get(Actividad, pregunta.actividad_id)
    if not actividad or not actividad.validada:
        raise HTTPException(status_code=403, detail="La actividad no está publicada")

    es_correcta = opcion_elegida == pregunta.opcion_correcta

    respuesta = Respuesta(
        alumno_id=alumno.id,  # viene del token
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
    session: Session = Depends(get_session),
    usuario: Usuario = Depends(get_usuario_actual)
):
    # Docente puede ver cualquier historial, alumno solo el suyo
    if usuario.rol == "alumno" and usuario.id != alumno_id:
        raise HTTPException(status_code=403, detail="No podés ver el historial de otro alumno")

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