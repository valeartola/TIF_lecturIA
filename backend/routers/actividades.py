from backend.domain import actividad
from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select
import json

from backend.database import get_session
from backend.models import Texto, Actividad, Pregunta, Usuario
from backend.services.generador import Generador
from backend.services.juez import Juez
from backend.services.llm_client import GroqClient, UMCloudClient, GeminiClient
from backend.config.settings import get_settings
from backend.auth import solo_docente, solo_alumno

router = APIRouter(prefix="/actividades", tags=["Actividades"])


def _crear_generador_y_juez():
    settings = get_settings()
    groq_client = GroqClient(api_key=settings.groq_api_key)
    gemini_client = GeminiClient(api_key=settings.gemini_api_key)
    return Generador(cliente=groq_client), Juez(cliente=gemini_client)

@router.post("/generar")
def generar(
    texto_id: int,
    session: Session = Depends(get_session),
    docente: Usuario = Depends(solo_docente)
):
    texto = session.get(Texto, texto_id)
    if not texto:
        raise HTTPException(status_code=404, detail="Texto no encontrado")

    generador, juez = _crear_generador_y_juez()
    try:
        resultado = generador.generar_actividad(juez, texto.contenido)
    except Exception as exc:
        # Falla del servicio de IA (caída, timeout, cuota agotada, etc.):
        # no es un error nuestro, así que devolvemos un 503 claro en vez de un 500.
        import logging
        logging.getLogger("lecturia").error("Falló la generación con IA", exc_info=exc)
        raise HTTPException(
            status_code=503,
            detail="El servicio de IA no está disponible en este momento. Intentá más tarde.",
        )

    actividad = Actividad(texto_id=texto_id, validada=False)
    session.add(actividad)
    session.commit()
    session.refresh(actividad)

    preguntas_con_id = {}

    for dificultad, preguntas in resultado["preguntas_por_nivel"].items():
        preguntas_con_id[dificultad] = []

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
            session.flush()  # esto hace que pregunta.id ya exista antes del commit

            preguntas_con_id[dificultad].append({
                "id": pregunta.id,
                "pregunta": p["pregunta"],
                "opciones": p["opciones"],
                "correcta": p["correcta"],
                "tipo": p["tipo"],
                "validada": pregunta.validada,
            })

    session.commit()

    return {
        "id": actividad.id,
        "preguntas_por_nivel": preguntas_con_id,
        "metricas": resultado["metricas"]
    }


@router.delete("/{actividad_id}")
def eliminar_actividad(
    actividad_id: int,
    session: Session = Depends(get_session),
    docente: Usuario = Depends(solo_docente)
):
    actividad = session.get(Actividad, actividad_id)
    if not actividad:
        raise HTTPException(status_code=404, detail="Actividad no encontrada")

    # Verificar que el texto pertenece al docente que hace el pedido
    texto = session.get(Texto, actividad.texto_id)
    if texto.docente_id != docente.id:
        raise HTTPException(status_code=403, detail="No tenés permiso para eliminar esta actividad")

    from backend.models import Respuesta

    # Eliminar en orden por FK: respuestas → preguntas → actividad → texto
    respuestas = session.exec(
        select(Respuesta).where(Respuesta.actividad_id == actividad_id)
    ).all()
    for r in respuestas:
        session.delete(r)

    preguntas = session.exec(
        select(Pregunta).where(Pregunta.actividad_id == actividad_id)
    ).all()
    for p in preguntas:
        session.delete(p)

    session.delete(actividad)
    session.delete(texto)
    session.commit()

    return {"mensaje": "Actividad y texto eliminados correctamente", "id": actividad_id}


@router.get("/{actividad_id}")
def obtener_actividad(
    actividad_id: int,
    session: Session = Depends(get_session),
    docente: Usuario = Depends(solo_docente)
):
    actividad = session.get(Actividad, actividad_id)
    if not actividad:
        raise HTTPException(status_code=404, detail="Actividad no encontrada")

    preguntas = session.exec(
        select(Pregunta).where(Pregunta.actividad_id == actividad_id)
    ).all()

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


# Mínimo de preguntas validadas que debe tener cada nivel para poder publicar.
# Ajustable: subilo si querés exigir más cobertura por nivel.
MIN_PREGUNTAS_VALIDADAS_POR_NIVEL = 2
NIVELES = ["FÁCIL", "MEDIA", "DIFÍCIL"]


def _preguntas_validadas_por_nivel(actividad_id: int, session: Session) -> dict:
    preguntas = session.exec(
        select(Pregunta).where(
            Pregunta.actividad_id == actividad_id,
            Pregunta.validada == True,
        )
    ).all()
    conteo = {nivel: 0 for nivel in NIVELES}
    for p in preguntas:
        if p.dificultad in conteo:
            conteo[p.dificultad] += 1
    return conteo


@router.patch("/{actividad_id}/validar")
def validar_actividad(
    actividad_id: int,
    session: Session = Depends(get_session),
    docente: Usuario = Depends(solo_docente)
):
    actividad = session.get(Actividad, actividad_id)
    if not actividad:
        raise HTTPException(status_code=404, detail="Actividad no encontrada")

    conteo = _preguntas_validadas_por_nivel(actividad_id, session)
    faltantes = {
        nivel: MIN_PREGUNTAS_VALIDADAS_POR_NIVEL - cantidad
        for nivel, cantidad in conteo.items()
        if cantidad < MIN_PREGUNTAS_VALIDADAS_POR_NIVEL
    }
    if faltantes:
        detalle = ", ".join(
            f"{nivel} (faltan {n})" for nivel, n in faltantes.items()
        )
        raise HTTPException(
            status_code=400,
            detail=(
                f"No se puede publicar: cada nivel necesita al menos "
                f"{MIN_PREGUNTAS_VALIDADAS_POR_NIVEL} preguntas validadas. "
                f"Faltan en: {detalle}"
            ),
        )

    actividad.validada = True
    session.add(actividad)
    session.commit()

    return {
        "mensaje": "Actividad validada correctamente",
        "id": actividad_id,
        "preguntas_validadas_por_nivel": conteo,
    }


@router.patch("/preguntas/{pregunta_id}/validar")
def validar_pregunta(
    pregunta_id: int,
    session: Session = Depends(get_session),
    docente: Usuario = Depends(solo_docente)
):
    pregunta = session.get(Pregunta, pregunta_id)
    if not pregunta:
        raise HTTPException(status_code=404, detail="Pregunta no encontrada")

    pregunta.validada = True
    session.add(pregunta)
    session.commit()

    return {"mensaje": "Pregunta validada correctamente", "id": pregunta_id}


@router.get("/{actividad_id}/alumno/intentos")
def estado_intentos(
    actividad_id: int,
    session: Session = Depends(get_session),
    alumno: Usuario = Depends(solo_alumno)
):
    actividad = session.get(Actividad, actividad_id)
    if not actividad:
        raise HTTPException(status_code=404, detail="Actividad no encontrada")
    if not actividad.validada:
        raise HTTPException(status_code=403, detail="Actividad no publicada aún")

    texto = session.get(Texto, actividad.texto_id)
    if texto.docente_id != alumno.docente_id:
        raise HTTPException(status_code=403, detail="No tenés acceso a esta actividad")

    from backend.services.nivel_service import intento_actual, MAX_INTENTOS, cantidad_preguntas_sesion
    from backend.models import Respuesta

    intento = intento_actual(alumno.id, actividad_id, session)
    sin_intentos = intento > MAX_INTENTOS

    # Puntajes de cada intento completado
    puntajes = []
    tope = cantidad_preguntas_sesion(actividad_id, session)
    for i in range(1, MAX_INTENTOS + 1):
        respuestas = session.exec(
            select(Respuesta).where(
                Respuesta.alumno_id == alumno.id,
                Respuesta.actividad_id == actividad_id,
                Respuesta.numero_intento == i,
            )
        ).all()
        if respuestas:
            correctas = sum(1 for r in respuestas if r.es_correcta)
            puntajes.append({
                "intento": i,
                "respondidas": len(respuestas),
                "correctas": correctas,
                "completo": len(respuestas) >= tope,
            })

    return {
        "intento_actual": intento if not sin_intentos else MAX_INTENTOS,
        "sin_intentos": sin_intentos,
        "max_intentos": MAX_INTENTOS,
        "puntajes": puntajes,
    }


@router.get("/{actividad_id}/alumno/proxima")
def proxima_pregunta(
    actividad_id: int,
    nuevo_intento: bool = False,
    session: Session = Depends(get_session),
    alumno: Usuario = Depends(solo_alumno)
):
    actividad = session.get(Actividad, actividad_id)
    if not actividad:
        raise HTTPException(status_code=404, detail="Actividad no encontrada")
    if not actividad.validada:
        raise HTTPException(status_code=403, detail="Actividad no publicada aún")

    texto = session.get(Texto, actividad.texto_id)
    if texto.docente_id != alumno.docente_id:
        raise HTTPException(status_code=403, detail="No tenés acceso a esta actividad")

    from backend.services.nivel_service import proxima_pregunta as get_proxima, intento_actual, MAX_INTENTOS, actividad_completa, cantidad_preguntas_sesion
    from backend.models import Respuesta

    # Calcular en qué intento está manualmente para detectar intento recién completado
    tope = cantidad_preguntas_sesion(actividad_id, session)
    intento_calculado = 1
    intento_recien_completado = None

    for i in range(1, MAX_INTENTOS + 1):
        total = session.exec(
            select(Respuesta).where(
                Respuesta.alumno_id == alumno.id,
                Respuesta.actividad_id == actividad_id,
                Respuesta.numero_intento == i,
            )
        ).all()
        if len(total) >= tope:
            intento_recien_completado = i  # este intento está completo
            intento_calculado = i + 1
        else:
            intento_calculado = i
            break

    # Si todos los intentos están completos
    if intento_calculado > MAX_INTENTOS and intento_recien_completado:
        return {"finalizada": True, "sin_intentos": True, "intento_completado": intento_recien_completado}

    # Si el intento anterior se acaba de completar (el actual no tiene respuestas aún)
    if intento_recien_completado and intento_calculado <= MAX_INTENTOS:
        respuestas_actuales = session.exec(
            select(Respuesta).where(
                Respuesta.alumno_id == alumno.id,
                Respuesta.actividad_id == actividad_id,
                Respuesta.numero_intento == intento_calculado,
            )
        ).all()
        if len(respuestas_actuales) == 0 and not nuevo_intento:
            return {"finalizada": True, "sin_intentos": False, "intento_completado": intento_recien_completado}

    intento = intento_calculado

    pregunta, nivel = get_proxima(alumno.id, actividad_id, intento, session)

    if not pregunta:
        return {"finalizada": True, "sin_intentos": False, "intento_completado": intento, "nivel_actual": nivel}

    return {
        "finalizada": False,
        "nivel_actual": nivel,
        "intento_actual": intento,
        "pregunta": {
            "id": pregunta.id,
            "enunciado": pregunta.enunciado,
            "opciones": json.loads(pregunta.opciones_json),
        }
    }
 