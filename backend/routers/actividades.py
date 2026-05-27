from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session
import json
import os

from backend.database import get_session
from backend.models import Texto, Actividad
from backend.services.generador import Generador
from backend.services.juez import Juez
from backend.services.llm_client import GroqClient, UMCloudClient
from backend.config.settings import get_settings

router = APIRouter(prefix="/actividades", tags=["Actividades"])


def _crear_generador_y_juez():
    settings = get_settings()
    groq_client = GroqClient(api_key=settings.groq_api_key)
    um_client = UMCloudClient(api_key=settings.um_cloud_api_key)
    return Generador(cliente=groq_client), Juez(cliente=um_client)


@router.post("/generar")
def generar(
    texto_id: int,
    dificultad: str = "MEDIA",
    session: Session = Depends(get_session)
):
    texto = session.get(Texto, texto_id)
    if not texto:
        raise HTTPException(status_code=404, detail="Texto no encontrado")

    mapeo = {"FACIL": "FÁCIL", "MEDIA": "MEDIA", "DIFICIL": "DIFÍCIL"}
    if dificultad in mapeo:
        dificultad = mapeo[dificultad]
    if dificultad not in ["FÁCIL", "MEDIA", "DIFÍCIL"]:
        raise HTTPException(status_code=400, detail="Dificultad debe ser FACIL, MEDIA o DIFICIL")

    generador, juez = _crear_generador_y_juez()
    resultado = generador.generar_actividad(juez, texto.contenido, dificultad=dificultad)

    actividad = Actividad(
        texto_id=texto_id,
        dificultad=dificultad,
        preguntas_json=json.dumps(resultado["preguntas"], ensure_ascii=False),
        validada=False
    )
    session.add(actividad)
    session.commit()
    session.refresh(actividad)

    return {
        "id": actividad.id,
        "dificultad": dificultad,
        "preguntas": resultado["preguntas"],
        "metricas": resultado["metricas"]
    }


@router.get("/{actividad_id}")
def obtener_actividad(actividad_id: int, session: Session = Depends(get_session)):
    actividad = session.get(Actividad, actividad_id)
    if not actividad:
        raise HTTPException(status_code=404, detail="Actividad no encontrada")

    return {
        "id": actividad.id,
        "texto_id": actividad.texto_id,
        "dificultad": actividad.dificultad,
        "preguntas": json.loads(actividad.preguntas_json),
        "validada": actividad.validada
    }


@router.patch("/{actividad_id}/validar")
def validar_actividad(actividad_id: int, session: Session = Depends(get_session)):
    actividad = session.get(Actividad, actividad_id)
    if not actividad:
        raise HTTPException(status_code=404, detail="Actividad no encontrada")

    actividad.validada = True
    session.add(actividad)
    session.commit()

    return {"mensaje": "Actividad validada correctamente", "id": actividad_id}