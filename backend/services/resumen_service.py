"""
Genera un resumen pedagógico de la clase con Gemini.

Reúne las métricas reales de la BD (alumnos, respuestas, actividades),
construye un prompt y llama a GeminiClient.llamar_texto().
"""
from sqlmodel import Session, select

from backend.models import Actividad, Respuesta, Texto, Usuario
from backend.config.settings import get_settings
from backend.services.llm_client import GeminiClient


def generar_resumen_clase(docente_id: int, nombre_docente: str, session: Session) -> str:
    # ── 1. Alumnos de la clase ────────────────────────────────────────
    alumnos = session.exec(
        select(Usuario).where(
            Usuario.docente_id == docente_id,
            Usuario.rol == "alumno",
        )
    ).all()

    if not alumnos:
        return (
            f"Tu clase aún no tiene alumnos registrados, {nombre_docente}. "
            "Una vez que los alumnos se unan con el código de clase, "
            "podrás ver aquí un análisis detallado de su progreso."
        )

    alumno_ids = [a.id for a in alumnos]

    # ── 2. Todas las respuestas de esos alumnos ───────────────────────
    respuestas = session.exec(
        select(Respuesta).where(Respuesta.alumno_id.in_(alumno_ids))
    ).all()

    # ── 3. Actividades creadas por el docente ─────────────────────────
    textos = session.exec(
        select(Texto).where(Texto.docente_id == docente_id)
    ).all()
    texto_ids = [t.id for t in textos]
    total_actividades = 0
    if texto_ids:
        actividades = session.exec(
            select(Actividad).where(Actividad.texto_id.in_(texto_ids))
        ).all()
        total_actividades = len(actividades)

    # ── 4. Métricas por alumno ────────────────────────────────────────
    stats = []
    for alumno in alumnos:
        resp = [r for r in respuestas if r.alumno_id == alumno.id]
        if not resp:
            stats.append({"nombre": alumno.nombre, "pct": 0, "activo": False})
        else:
            correctas = sum(1 for r in resp if r.es_correcta)
            stats.append({
                "nombre": alumno.nombre,
                "pct": round(correctas / len(resp) * 100, 1),
                "activo": True,
            })

    activos   = [s for s in stats if s["activo"]]
    inactivos = [s for s in stats if not s["activo"]]
    destacados = [s for s in activos if s["pct"] >= 80]
    en_riesgo  = [s for s in activos if s["pct"] < 50] + inactivos

    promedio_general = (
        round(sum(s["pct"] for s in activos) / len(activos), 1) if activos else 0.0
    )

    def nombres(lista, max_n=3):
        ns = [s["nombre"] for s in lista[:max_n]]
        return ", ".join(ns) if ns else "ninguno"

    # ── 5. Prompt ─────────────────────────────────────────────────────
    prompt = f"""Sos un asistente pedagógico de LecturIA, una plataforma de comprensión lectora para escuela primaria.
Escribí UN párrafo breve (entre 4 y 6 oraciones) en español rioplatense, dirigido al docente "{nombre_docente}".
El párrafo debe ser cálido, profesional y útil; como si lo escribiera un coordinador pedagógico experimentado.

Datos actuales de la clase:
- Total de alumnos: {len(alumnos)}
- Alumnos con actividad registrada: {len(activos)}
- Alumnos sin actividad aún: {len(inactivos)}
- Promedio general de aciertos: {promedio_general}%
- Alumnos con desempeño destacado (≥ 80 %): {len(destacados)} → {nombres(destacados)}
- Alumnos que necesitan atención (< 50 % o sin actividad): {len(en_riesgo)} → {nombres(en_riesgo)}
- Actividades creadas: {total_actividades}

Instrucciones de estilo:
- Empezá con algo positivo antes de mencionar los desafíos.
- Integrá los números en oraciones naturales; no uses listas ni títulos.
- Si hay alumnos en riesgo, sugerí brevemente atención personalizada.
- Máximo 6 oraciones. Solo texto corrido, sin formato markdown."""

    # ── 6. Llamada a Gemini ───────────────────────────────────────────
    client = GeminiClient(api_key=get_settings().gemini_api_key)
    return client.llamar_texto(prompt)