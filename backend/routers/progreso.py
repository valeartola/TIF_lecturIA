from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select
import logging

from backend.database import get_session
from backend.models import Actividad, Texto, Usuario, Respuesta, Pregunta
from backend.auth import solo_docente
from backend.services.nivel_service import (
    nivel_actual,
    cantidad_preguntas_sesion,
    actividad_completa,
    intento_actual,
)

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/progreso", tags=["Progreso y reportes"])


def _verificar_actividad_del_docente(actividad_id: int, docente: Usuario, session: Session) -> Actividad:
    """La actividad debe existir y pertenecer a un texto del docente logueado."""
    actividad = session.get(Actividad, actividad_id)
    if not actividad:
        raise HTTPException(status_code=404, detail="Actividad no encontrada")

    texto = session.get(Texto, actividad.texto_id)
    if not texto or texto.docente_id != docente.id:
        raise HTTPException(status_code=403, detail="La actividad no pertenece a este docente")

    return actividad


PESOS_INTENTOS = {1: [1.0], 2: [0.75, 0.25], 3: [0.5, 0.3, 0.2]}


def _calcular_progreso(alumno: Usuario, actividad_id: int, session: Session) -> dict:
    """Calcula las métricas de un alumno en una actividad. Reutilizado por ambos endpoints."""
    from backend.services.nivel_service import MAX_INTENTOS

    respuestas = session.exec(
        select(Respuesta).where(
            Respuesta.alumno_id == alumno.id,
            Respuesta.actividad_id == actividad_id,
        )
    ).all()

    total_respondidas = len(respuestas)
    correctas = sum(1 for r in respuestas if r.es_correcta)
    tope = cantidad_preguntas_sesion(actividad_id, session)
    intento = intento_actual(alumno.id, actividad_id, session)

    # Promedio ponderado por intento: 1→100%, 2→75/25%, 3→50/30/20%
    pcts_por_intento = []
    ultimo_intento_con_respuestas = None
    for n in range(1, MAX_INTENTOS + 1):
        resp_n = [r for r in respuestas if r.numero_intento == n]
        if not resp_n:
            break
        ultimo_intento_con_respuestas = n
        correctas_n = sum(1 for r in resp_n if r.es_correcta)
        pcts_por_intento.append(round(correctas_n / len(resp_n) * 100, 1))

    if pcts_por_intento:
        pesos = PESOS_INTENTOS[len(pcts_por_intento)]
        porcentaje_ponderado = round(sum(p * w for p, w in zip(pcts_por_intento, pesos)), 1)
    else:
        porcentaje_ponderado = 0.0

    # El nivel a reportar es el del último intento que tiene respuestas.
    # `intento_actual` puede devolver el intento SIGUIENTE (todavía vacío) una vez
    # que el anterior se completó, lo que haría caer nivel_actual() en "FÁCIL" por defecto.
    intento_para_nivel = ultimo_intento_con_respuestas or intento

    return {
        "alumno_id": alumno.id,
        "nombre": alumno.nombre,
        "respondidas": total_respondidas,
        "tope_preguntas": tope,
        "correctas": correctas,
        "porcentaje_aciertos": porcentaje_ponderado,
        "nivel_alcanzado": nivel_actual(alumno.id, actividad_id, intento_para_nivel, session),
        "completada": actividad_completa(alumno.id, actividad_id, intento, session),
    }


# --- Punto 9: progreso de un alumno en una actividad ---
@router.get("/alumno/{alumno_id}/actividad/{actividad_id}")
def progreso_alumno(
    alumno_id: int,
    actividad_id: int,
    session: Session = Depends(get_session),
    docente: Usuario = Depends(solo_docente),
):
    _verificar_actividad_del_docente(actividad_id, docente, session)

    alumno = session.get(Usuario, alumno_id)
    if not alumno or alumno.rol != "alumno":
        raise HTTPException(status_code=404, detail="Alumno no encontrado")
    if alumno.docente_id != docente.id:
        raise HTTPException(status_code=403, detail="Ese alumno no pertenece a tu clase")

    progreso = _calcular_progreso(alumno, actividad_id, session)
    tope = progreso["tope_preguntas"]

    # Todas las respuestas ordenadas cronológicamente
    todas = session.exec(
        select(Respuesta)
        .where(
            Respuesta.alumno_id == alumno_id,
            Respuesta.actividad_id == actividad_id,
        )
        .order_by(Respuesta.numero_intento, Respuesta.respondido_en)
    ).all()

    # Agrupar por intento con métricas de cada uno
    from backend.services.nivel_service import nivel_actual as _nivel_actual, MAX_INTENTOS
    intentos_data = []
    for n in range(1, MAX_INTENTOS + 1):
        resp_intento = [r for r in todas if r.numero_intento == n]
        if not resp_intento:
            break
        correctas_intento = sum(1 for r in resp_intento if r.es_correcta)
        pct = round(correctas_intento / len(resp_intento) * 100, 1)
        nivel = _nivel_actual(alumno_id, actividad_id, n, session)
        completado = len(resp_intento) >= tope
        intentos_data.append({
            "numero": n,
            "respondidas": len(resp_intento),
            "correctas": correctas_intento,
            "porcentaje_aciertos": pct,
            "nivel_alcanzado": nivel,
            "completado": completado,
            "respuestas": [
                {
                    "pregunta_id": r.pregunta_id,
                    "opcion_elegida": r.opcion_elegida,
                    "es_correcta": r.es_correcta,
                    "respondido_en": r.respondido_en.isoformat() if r.respondido_en else None,
                    **({
                        "dificultad": p.dificultad,
                        "tipo": p.tipo,
                    } if (p := session.get(Pregunta, r.pregunta_id)) else {}),
                }
                for r in resp_intento
            ],
        })

    progreso["intentos"] = intentos_data
    return progreso


# --- Punto 10: resumen grupal de la clase en una actividad ---
@router.get("/resumen/actividad/{actividad_id}")
def resumen_grupal(
    actividad_id: int,
    session: Session = Depends(get_session),
    docente: Usuario = Depends(solo_docente),
):
    _verificar_actividad_del_docente(actividad_id, docente, session)

    alumnos = session.exec(
        select(Usuario).where(
            Usuario.docente_id == docente.id,
            Usuario.rol == "alumno",
        )
    ).all()

    progresos = [_calcular_progreso(a, actividad_id, session) for a in alumnos]

    # Solo promediamos sobre alumnos que empezaron la actividad
    con_actividad = [p for p in progresos if p["respondidas"] > 0]
    promedio_aciertos = (
        round(sum(p["porcentaje_aciertos"] for p in con_actividad) / len(con_actividad), 1)
        if con_actividad else 0.0
    )

    return {
        "actividad_id": actividad_id,
        "total_alumnos": len(alumnos),
        "alumnos_que_empezaron": len(con_actividad),
        "alumnos_que_completaron": sum(1 for p in progresos if p["completada"]),
        "promedio_aciertos_clase": promedio_aciertos,
        "alumnos": progresos,
    }

# --- Resumen de la clase generado por IA ---
@router.get("/resumen-ia")
def resumen_ia(
    session: Session = Depends(get_session),
    docente: Usuario = Depends(solo_docente),
):
    """
    Genera un párrafo de análisis pedagógico de la clase usando Gemini.
    Toma los datos reales de alumnos, respuestas y actividades del docente.
    """
    from backend.services.resumen_service import generar_resumen_clase
    try:
        resumen = generar_resumen_clase(docente.id, docente.nombre, session)
        return {"resumen": resumen}
    except Exception as e:
        logger.error("Error al generar resumen IA para docente %s: %s", docente.id, e)
        raise HTTPException(
            status_code=503,
            detail="No se pudo generar el resumen en este momento. Intentá de nuevo.",
        )