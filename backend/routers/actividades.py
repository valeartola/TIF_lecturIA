from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select
import json

from backend.database import get_session
from backend.models import Texto, Actividad, Pregunta
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
def generar(texto_id: int, session: Session = Depends(get_session)):
    texto = session.get(Texto, texto_id)
    if not texto:
        raise HTTPException(status_code=404, detail="Texto no encontrado")

    generador, juez = _crear_generador_y_juez()
    resultado = generador.generar_actividad(juez, texto.contenido)

    # Crear la actividad contenedora
    actividad = Actividad(texto_id=texto_id, validada=False)
    session.add(actividad)
    session.commit()
    session.refresh(actividad)

    # Guardar cada pregunta como registro individual
    for dificultad, preguntas in resultado["preguntas_por_nivel"].items():
        for p in preguntas:
            pregunta = Pregunta(
                actividad_id=actividad.id,
                dificultad=dificultad,
                enunciado=p["pregunta"],
                opciones_json=json.dumps(p["opciones"], ensure_ascii=False),
                opcion_correcta=p["correcta"],
                tipo=p["tipo"],
                validada=False
            )
            session.add(pregunta)
    session.commit()

    return {
        "id": actividad.id,
        "preguntas_por_nivel": resultado["preguntas_por_nivel"],
        "metricas": resultado["metricas"]
    }

@router.get("/{actividad_id}")
def obtener_actividad(actividad_id: int, session: Session = Depends(get_session)):
    actividad = session.get(Actividad, actividad_id)
    if not actividad:
        raise HTTPException(status_code=404, detail="Actividad no encontrada")

    preguntas = session.exec(
        select(Pregunta).where(Pregunta.actividad_id == actividad_id)
    ).all()

    # Agrupar por nivel para el docente
    por_nivel = {"FÁCIL": [], "MEDIA": [], "DIFÍCIL": []}
    for p in preguntas:
        por_nivel[p.dificultad].append({
            "id": p.id,
            "enunciado": p.enunciado,
            "opciones": json.loads(p.opciones_json),
            "opcion_correcta": p.opcion_correcta,
            "tipo": p.tipo,
            "validada": p.validada
        })

    return {
        "id": actividad.id,
        "texto_id": actividad.texto_id,
        "validada": actividad.validada,
        "preguntas_por_nivel": por_nivel
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

@router.patch("/preguntas/{pregunta_id}/validar")
def validar_pregunta(pregunta_id: int, session: Session = Depends(get_session)):
    pregunta = session.get(Pregunta, pregunta_id)
    if not pregunta:
        raise HTTPException(status_code=404, detail="Pregunta no encontrada")

    pregunta.validada = True
    session.add(pregunta)
    session.commit()

    return {"mensaje": "Pregunta validada correctamente", "id": pregunta_id}

@router.get("/{actividad_id}/alumno/proxima")
def proxima_pregunta(
    actividad_id: int,
    alumno_id: int,
    session: Session = Depends(get_session)
):
    """Devuelve la próxima pregunta para el alumno según su nivel actual."""
    actividad = session.get(Actividad, actividad_id)
    if not actividad:
        raise HTTPException(status_code=404, detail="Actividad no encontrada")
    if not actividad.validada:
        raise HTTPException(status_code=403, detail="Actividad no publicada aún")

    from backend.services.nivel_service import proxima_pregunta as get_proxima
    pregunta, nivel = get_proxima(alumno_id, actividad_id, session)

    if not pregunta:
        return {"finalizada": True, "mensaje": "El alumno completó la actividad"}

    return {
        "finalizada": False,
        "nivel_actual": nivel,
        "pregunta": {
            "id": pregunta.id,
            "enunciado": pregunta.enunciado,
            "opciones": json.loads(pregunta.opciones_json),
        }
    }