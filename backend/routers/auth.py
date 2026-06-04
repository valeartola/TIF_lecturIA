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
        "codigo_clase": docente.codigo_clase,  # el docente lo comparte con sus alumnos
    }


@router.post("/login")
def login(form: OAuth2PasswordRequestForm = Depends(), session: Session = Depends(get_session)):
    """
    Login unificado:
      - Docente: usuario = su email.
      - Alumno:  usuario = "CODIGO-CLASE/Nombre del alumno" (ej: "ABCD-2345/Ana Pérez").
    La contraseña va siempre en el campo password.
    """
    usuario_campo = form.username

    if "/" in usuario_campo:
        # --- Alumno: código de clase + nombre ---
        codigo, nombre = usuario_campo.split("/", 1)
        docente = session.exec(
            select(Usuario).where(Usuario.codigo_clase == codigo.strip())
        ).first()
        usuario = None
        if docente:
            usuario = session.exec(
                select(Usuario).where(
                    Usuario.docente_id == docente.id,
                    Usuario.nombre == nombre.strip(),
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
        "email": usuario.email,
        "rol": usuario.rol,
        "codigo_clase": usuario.codigo_clase,  # None para alumnos
    }


@router.post("/alumnos")
def crear_alumno(
    datos: CrearAlumno,
    docente: Usuario = Depends(solo_docente),
    session: Session = Depends(get_session)
):
    # El nombre debe ser único dentro de la clase del docente, porque es
    # parte de la credencial de login del alumno.
    existente = session.exec(
        select(Usuario).where(
            Usuario.docente_id == docente.id,
            Usuario.nombre == datos.nombre,
            Usuario.rol == "alumno",
        )
    ).first()
    if existente:
        raise HTTPException(
            status_code=400,
            detail="Ya tenés un alumno con ese nombre en la clase",
        )

    alumno = Usuario(
        nombre=datos.nombre,
        password_hash=hashear_password(datos.password),
        rol="alumno",
        docente_id=docente.id,  # ← se asigna automáticamente
    )
    session.add(alumno)
    session.commit()
    session.refresh(alumno)
    return {"id": alumno.id, "nombre": alumno.nombre, "rol": alumno.rol}


@router.get("/alumnos")
def listar_alumnos(
    docente: Usuario = Depends(solo_docente),
    session: Session = Depends(get_session)
):
    alumnos = session.exec(
        select(Usuario).where(
            Usuario.rol == "alumno",
            Usuario.docente_id == docente.id  # ← solo los suyos
        )
    ).all()
    return [{"id": a.id, "nombre": a.nombre} for a in alumnos]