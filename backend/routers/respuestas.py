from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select
import json

from backend.database import get_session
from backend.models import Actividad, Respuesta

router = APIRouter(prefix="/respuestas", tags=["Respuestas"])


@router.post("/")
def registrar_respuesta(
    alumno_id: int,
    actividad_id: int,
    pregunta_index: int,
    opcion_elegida: int,
    session: Session = Depends(get_session)
):
    # Verificar que la actividad existe y está validada
    actividad = session.get(Actividad, actividad_id)
    if not actividad:
        raise HTTPException(status_code=404, detail="Actividad no encontrada")
    if not actividad.validada:
        raise HTTPException(status_code=400, detail="La actividad aún no fue validada por el docente")

    # Obtener la pregunta correcta
    preguntas = json.loads(actividad.preguntas_json)
    if pregunta_index >= len(preguntas):
        raise HTTPException(status_code=400, detail="Índice de pregunta inválido")

    correcta = preguntas[pregunta_index]["correcta"]
    es_correcta = opcion_elegida == correcta

    # Guardar respuesta
    respuesta = Respuesta(
        alumno_id=alumno_id,
        actividad_id=actividad_id,
        pregunta_index=pregunta_index,
        opcion_elegida=opcion_elegida,
        es_correcta=es_correcta
    )
    session.add(respuesta)
    session.commit()

    return {
        "es_correcta": es_correcta,
        "opcion_elegida": opcion_elegida,
        "opcion_correcta": correcta
    }