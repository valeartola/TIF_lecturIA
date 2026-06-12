"""
Seed de datos de prueba para LecturIA.

Llena la base con un docente, sus alumnos, un texto, una actividad publicada
con preguntas validadas en los tres niveles y algunas respuestas, para poder
probar los endpoints de progreso, resumen y validación sin gastar tokens de IA.

Es idempotente: borra los datos sembrados anteriormente (identificados por el
email del docente de prueba) antes de volver a crearlos. Así podés correrlo las
veces que quieras y siempre quedás en el mismo estado conocido.

Uso (parado en la carpeta TIF_lecturIA):
    python -m backend.seed
"""

import json
from datetime import datetime, timedelta

from sqlmodel import Session, select

from backend.database import engine, crear_tablas
from backend.models import Usuario, Texto, Actividad, Pregunta, Respuesta
from backend.auth import hashear_password

# --- Datos del docente de prueba (sirve de "marca" para el borrado idempotente) ---
DOCENTE_EMAIL = "docente@mail.com"
DOCENTE_PASSWORD = "docente123"
ALUMNO_PASSWORD = "alumno123"
CODIGO_CLASE = "TEST-2345"


def limpiar_seed_previo(session: Session) -> None:
    """Borra el docente de prueba y todo lo que cuelga de él, si ya existe."""
    docente = session.exec(
        select(Usuario).where(Usuario.email == DOCENTE_EMAIL)
    ).first()
    if not docente:
        return

    textos = session.exec(
        select(Texto).where(Texto.docente_id == docente.id)
    ).all()
    texto_ids = [t.id for t in textos]

    actividades = []
    if texto_ids:
        actividades = session.exec(
            select(Actividad).where(Actividad.texto_id.in_(texto_ids))
        ).all()
    actividad_ids = [a.id for a in actividades]

    alumnos = session.exec(
        select(Usuario).where(Usuario.docente_id == docente.id)
    ).all()

    # Orden de borrado respetando las dependencias (hijos primero)
    if actividad_ids:
        for r in session.exec(
            select(Respuesta).where(Respuesta.actividad_id.in_(actividad_ids))
        ).all():
            session.delete(r)
        for p in session.exec(
            select(Pregunta).where(Pregunta.actividad_id.in_(actividad_ids))
        ).all():
            session.delete(p)
    for a in actividades:
        session.delete(a)
    for t in textos:
        session.delete(t)
    for al in alumnos:
        session.delete(al)
    session.delete(docente)
    session.commit()


def _pregunta(actividad_id: int, dificultad: str, n: int, correcta: int) -> Pregunta:
    """Crea una pregunta validada de prueba con 4 opciones."""
    return Pregunta(
        actividad_id=actividad_id,
        dificultad=dificultad,
        enunciado=f"[{dificultad}] Pregunta de prueba número {n}",
        opciones_json=json.dumps(
            [f"Opción A ({n})", f"Opción B ({n})", f"Opción C ({n})", f"Opción D ({n})"],
            ensure_ascii=False,
        ),
        opcion_correcta=correcta,
        tipo="comprensión literal",
        validada=True,
    )


def sembrar(session: Session) -> None:
    # --- Docente ---
    docente = Usuario(
        nombre="Profe Mariela",
        email=DOCENTE_EMAIL,
        password_hash=hashear_password(DOCENTE_PASSWORD),
        rol="docente",
        codigo_clase=CODIGO_CLASE,
    )
    session.add(docente)
    session.commit()
    session.refresh(docente)

    # --- Alumnos vinculados al docente ---
    nombres_alumnos = ["Ana", "Beto", "Caro"]
    alumnos = []
    for i, nombre in enumerate(nombres_alumnos, start=1):
        alumno = Usuario(
            nombre=nombre,
            password_hash=hashear_password(ALUMNO_PASSWORD),
            rol="alumno",
            docente_id=docente.id,
        )
        session.add(alumno)
        alumnos.append(alumno)
    session.commit()
    for al in alumnos:
        session.refresh(al)

    # --- Texto (corto -> tope de 6 preguntas por sesión) ---
    texto = Texto(
        titulo="El gato curioso",
        contenido=(
            "Había una vez un gato muy curioso que vivía en un pueblo pequeño. "
            "Todos los días salía a explorar las calles y los jardines. Un día "
            "encontró una caja misteriosa debajo de un árbol y decidió averiguar "
            "qué había dentro. Con mucho cuidado, empujó la tapa y descubrió un "
            "ovillo de lana de colores. Jugó toda la tarde hasta quedarse dormido."
        ),
        docente_id=docente.id,
    )
    session.add(texto)
    session.commit()
    session.refresh(texto)

    # --- Actividad publicada ---
    actividad = Actividad(texto_id=texto.id, validada=True)
    session.add(actividad)
    session.commit()
    session.refresh(actividad)

    # --- Preguntas validadas: 4 por nivel (cumple el mínimo del punto 11) ---
    preguntas_por_nivel = {"FÁCIL": [], "MEDIA": [], "DIFÍCIL": []}
    n = 1
    for nivel in ["FÁCIL", "MEDIA", "DIFÍCIL"]:
        for _ in range(4):
            p = _pregunta(actividad.id, nivel, n, correcta=n % 4)
            session.add(p)
            preguntas_por_nivel[nivel].append(p)
            n += 1
    session.commit()
    for nivel in preguntas_por_nivel:
        for p in preguntas_por_nivel[nivel]:
            session.refresh(p)

    # --- Respuestas: distintos perfiles de desempeño ---
    # Ana: arranca FÁCIL acertando y va subiendo de nivel (buen desempeño).
    # Beto: responde algunas FÁCIL con errores (se queda en nivel bajo).
    # Caro: no responde nada (sirve para probar el caso "no empezó").
    base = datetime.utcnow() - timedelta(hours=1)

    def responder(alumno, pregunta, correcta: bool, minuto: int):
        opcion = pregunta.opcion_correcta if correcta else (pregunta.opcion_correcta + 1) % 4
        return Respuesta(
            alumno_id=alumno.id,
            actividad_id=actividad.id,
            pregunta_id=pregunta.id,
            opcion_elegida=opcion,
            es_correcta=correcta,
            respondido_en=base + timedelta(minutes=minuto),
        )

    ana, beto, _caro = alumnos
    faciles = preguntas_por_nivel["FÁCIL"]
    medias = preguntas_por_nivel["MEDIA"]

    # Ana: 1 fácil ok, 1 fácil ok, 2 medias (una ok, una mal) -> sube a niveles altos
    session.add(responder(ana, faciles[0], True, 1))
    session.add(responder(ana, faciles[1], True, 2))
    session.add(responder(ana, medias[0], True, 3))
    session.add(responder(ana, medias[1], False, 4))

    # Beto: 3 fáciles, mayoría mal -> se queda en FÁCIL
    session.add(responder(beto, faciles[0], False, 1))
    session.add(responder(beto, faciles[1], True, 2))
    session.add(responder(beto, faciles[2], False, 3))

    session.commit()

    # --- Resumen por consola ---
    print("Seed completado.")
    print(f"  Docente: {DOCENTE_EMAIL} / {DOCENTE_PASSWORD}  (id={docente.id})")
    print(f"  Código de clase: {CODIGO_CLASE}")
    print(f"  Alumnos: {', '.join(f'{a.nombre} (id={a.id})' for a in alumnos)}  / {ALUMNO_PASSWORD}")
    print(f"  Texto id={texto.id} | Actividad id={actividad.id} (publicada)")
    print(f"  Preguntas validadas: 4 por nivel (12 en total)")
    print(f"  Respuestas: Ana=4, Beto=3, Caro=0")
    print()
    print("Login en /docs (botón Authorize):")
    print(f"  Docente -> username: {DOCENTE_EMAIL}      | password: {DOCENTE_PASSWORD}")
    print(f"  Alumno  -> username: {CODIGO_CLASE}/Ana    | password: {ALUMNO_PASSWORD}")


def main():
    crear_tablas()
    with Session(engine) as session:
        limpiar_seed_previo(session)
        sembrar(session)


if __name__ == "__main__":
    main()