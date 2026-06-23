import secrets
import string

from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import OAuth2PasswordRequestForm
from sqlmodel import Session, select
from pydantic import BaseModel

from backend.database import get_session
from backend.models import Usuario
from backend.auth import hashear_password, verificar_password, crear_token, solo_docente, get_usuario_actual

router = APIRouter(prefix="/auth", tags=["Auth"])

# Caracteres sin ambigüedades (sin 0/O, 1/I/L) para que un chico pueda copiarlo.
_ALFABETO_CODIGO = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"


class RegistroDocente(BaseModel):
    nombre: str
    email: str
    password: str


class CrearAlumno(BaseModel):
    nombre: str
    apellido: str
    password: str


def _generar_codigo_clase(session: Session) -> str:
    """Genera un código de clase corto y único, tipo 'ABCD-2345'."""
    while True:
        parte1 = "".join(secrets.choice(_ALFABETO_CODIGO) for _ in range(4))
        parte2 = "".join(secrets.choice(_ALFABETO_CODIGO) for _ in range(4))
        codigo = f"{parte1}-{parte2}"
        existe = session.exec(
            select(Usuario).where(Usuario.codigo_clase == codigo)
        ).first()
        if not existe:
            return codigo


def _nombre_completo(usuario: Usuario) -> str:
    """Devuelve 'Nombre Apellido' si tiene apellido, o solo 'Nombre'."""
    if usuario.apellido:
        return f"{usuario.nombre} {usuario.apellido}"
    return usuario.nombre


@router.post("/registro")
def registro(datos: RegistroDocente, session: Session = Depends(get_session)):
    existente = session.exec(select(Usuario).where(Usuario.email == datos.email)).first()
    if existente:
        raise HTTPException(status_code=400, detail="El email ya está registrado")
    docente = Usuario(
        nombre=datos.nombre,
        email=datos.email,
        password_hash=hashear_password(datos.password),
        rol="docente",
        codigo_clase=_generar_codigo_clase(session),
    )
    session.add(docente)
    session.commit()
    session.refresh(docente)
    return {
        "id": docente.id,
        "nombre": docente.nombre,
        "email": docente.email,
        "rol": docente.rol,
        "codigo_clase": docente.codigo_clase,
    }


@router.post("/login")
def login(form: OAuth2PasswordRequestForm = Depends(), session: Session = Depends(get_session)):
    """
    Login unificado:
      - Docente: usuario = su email.
      - Alumno:  usuario = "CODIGO-CLASE/Nombre Apellido" (ej: "ABCD-2345/Ana Torres").
    La contraseña va siempre en el campo password.
    El login del alumno busca por nombre completo (nombre + apellido).
    """
    usuario_campo = form.username

    if "/" in usuario_campo:
        # --- Alumno: código de clase + nombre completo ---
        codigo, nombre_completo = usuario_campo.split("/", 1)
        nombre_completo = nombre_completo.strip()
        docente = session.exec(
            select(Usuario).where(Usuario.codigo_clase == codigo.strip())
        ).first()
        usuario = None
        if docente:
            # Buscar primero por nombre completo exacto (nombre + apellido)
            partes = nombre_completo.split(" ", 1)
            if len(partes) == 2:
                nombre, apellido = partes
                usuario = session.exec(
                    select(Usuario).where(
                        Usuario.docente_id == docente.id,
                        Usuario.nombre == nombre,
                        Usuario.apellido == apellido,
                        Usuario.rol == "alumno",
                    )
                ).first()
            # Fallback: buscar solo por nombre (compatibilidad con alumnos sin apellido)
            if not usuario:
                usuario = session.exec(
                    select(Usuario).where(
                        Usuario.docente_id == docente.id,
                        Usuario.nombre == nombre_completo,
                        Usuario.rol == "alumno",
                    )
                ).first()
    else:
        # --- Docente: email ---
        usuario = session.exec(
            select(Usuario).where(Usuario.email == usuario_campo)
        ).first()

    if not usuario or not verificar_password(form.password, usuario.password_hash):
        raise HTTPException(status_code=401, detail="Credenciales incorrectas")

    token = crear_token({"sub": str(usuario.id), "rol": usuario.rol})
    return {"access_token": token, "token_type": "bearer"}


@router.get("/me")
def me(usuario: Usuario = Depends(get_usuario_actual)):
    return {
        "id": usuario.id,
        "nombre": usuario.nombre,
        "apellido": usuario.apellido,
        "email": usuario.email,
        "rol": usuario.rol,
        "codigo_clase": usuario.codigo_clase,
    }


@router.post("/alumnos")
def crear_alumno(
    datos: CrearAlumno,
    docente: Usuario = Depends(solo_docente),
    session: Session = Depends(get_session)
):
    nombre = datos.nombre.strip()
    apellido = datos.apellido.strip()

    if not nombre or not apellido:
        raise HTTPException(status_code=400, detail="Nombre y apellido son obligatorios")

    # El nombre + apellido debe ser único dentro de la clase
    existente = session.exec(
        select(Usuario).where(
            Usuario.docente_id == docente.id,
            Usuario.nombre == nombre,
            Usuario.apellido == apellido,
            Usuario.rol == "alumno",
        )
    ).first()
    if existente:
        raise HTTPException(
            status_code=400,
            detail="Ya tenés un alumno con ese nombre y apellido en la clase",
        )

    alumno = Usuario(
        nombre=nombre,
        apellido=apellido,
        password_hash=hashear_password(datos.password),
        rol="alumno",
        docente_id=docente.id,
    )
    session.add(alumno)
    session.commit()
    session.refresh(alumno)
    return {"id": alumno.id, "nombre": alumno.nombre, "apellido": alumno.apellido, "rol": alumno.rol}


@router.get("/alumnos")
def listar_alumnos(
    docente: Usuario = Depends(solo_docente),
    session: Session = Depends(get_session)
):
    alumnos = session.exec(
        select(Usuario).where(
            Usuario.rol == "alumno",
            Usuario.docente_id == docente.id
        )
    ).all()
    return [{"id": a.id, "nombre": a.nombre, "apellido": a.apellido} for a in alumnos]


class EditarAlumno(BaseModel):
    nombre: str
    apellido: str


class EditarNombreDocente(BaseModel):
    nombre: str


@router.put("/alumnos/{alumno_id}/nombre")
def editar_alumno(
    alumno_id: int,
    datos: EditarAlumno,
    docente: Usuario = Depends(solo_docente),
    session: Session = Depends(get_session)
):
    alumno = session.get(Usuario, alumno_id)
    if not alumno or alumno.docente_id != docente.id or alumno.rol != "alumno":
        raise HTTPException(status_code=404, detail="Alumno no encontrado en tu clase")

    nombre = datos.nombre.strip()
    apellido = datos.apellido.strip()

    if not nombre or not apellido:
        raise HTTPException(status_code=400, detail="Nombre y apellido son obligatorios")

    # Verificar unicidad (excluyendo el mismo alumno)
    existente = session.exec(
        select(Usuario).where(
            Usuario.docente_id == docente.id,
            Usuario.nombre == nombre,
            Usuario.apellido == apellido,
            Usuario.rol == "alumno",
            Usuario.id != alumno_id,
        )
    ).first()
    if existente:
        raise HTTPException(status_code=400, detail="Ya tenés un alumno con ese nombre y apellido")

    alumno.nombre = nombre
    alumno.apellido = apellido
    session.add(alumno)
    session.commit()
    session.refresh(alumno)
    return {"id": alumno.id, "nombre": alumno.nombre, "apellido": alumno.apellido}


@router.put("/me/nombre")
def editar_nombre_docente(
    datos: EditarNombreDocente,
    usuario: Usuario = Depends(get_usuario_actual),
    session: Session = Depends(get_session)
):
    nuevo_nombre = datos.nombre.strip()
    if not nuevo_nombre:
        raise HTTPException(status_code=400, detail="El nombre no puede estar vacío")

    usuario.nombre = nuevo_nombre
    session.add(usuario)
    session.commit()
    session.refresh(usuario)
    return {"id": usuario.id, "nombre": usuario.nombre}