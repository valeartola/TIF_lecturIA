from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select

from backend.database import get_session
from backend.models import Actividad, Texto, Usuario, Respuesta
from backend.auth import solo_docente
from backend.services.nivel_service import (
    nivel_actual,
    cantidad_preguntas_sesion,
    actividad_completa,
)

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


def _calcular_progreso(alumno: Usuario, actividad_id: int, session: Session) -> dict:
    """Calcula las métricas de un alumno en una actividad. Reutilizado por ambos endpoints."""
    respuestas = session.exec(
        select(Respuesta).where(
            Respuesta.alumno_id == alumno.id,
            Respuesta.actividad_id == actividad_id,
        )
    ).all()

    total_respondidas = len(respuestas)
    correctas = sum(1 for r in respuestas if r.es_correcta)
    tope = cantidad_preguntas_sesion(actividad_id, session)
    porcentaje = round(correctas / total_respondidas * 100, 1) if total_respondidas else 0.0

    return {
        "alumno_id": alumno.id,
        "nombre": alumno.nombre,
        "respondidas": total_respondidas,
        "tope_preguntas": tope,
        "correctas": correctas,
        "porcentaje_aciertos": porcentaje,
        "nivel_alcanzado": nivel_actual(alumno.id, actividad_id, session),
        "completada": actividad_completa(alumno.id, actividad_id, session),
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

    # Detalle pregunta por pregunta (orden cronológico)
    respuestas = session.exec(
        select(Respuesta)
        .where(
            Respuesta.alumno_id == alumno_id,
            Respuesta.actividad_id == actividad_id,
        )
        .order_by(Respuesta.respondido_en)
    ).all()

    progreso["detalle"] = [
        {
            "pregunta_id": r.pregunta_id,
            "opcion_elegida": r.opcion_elegida,
            "es_correcta": r.es_correcta,
            "respondido_en": r.respondido_en,
        }
        for r in respuestas
    ]
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