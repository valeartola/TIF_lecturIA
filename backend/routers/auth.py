from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import OAuth2PasswordRequestForm
from sqlmodel import Session, select
from pydantic import BaseModel
from backend.database import get_session
from backend.models import Usuario
from backend.auth import hashear_password, verificar_password, crear_token, solo_docente, get_usuario_actual

router = APIRouter(prefix="/auth", tags=["Auth"])

class RegistroDocente(BaseModel):
    nombre: str
    email: str
    password: str

class CrearAlumno(BaseModel):
    nombre: str
    email: str
    password: str

@router.post("/registro")
def registro(datos: RegistroDocente, session: Session = Depends(get_session)):
    existente = session.exec(select(Usuario).where(Usuario.email == datos.email)).first()
    if existente:
        raise HTTPException(status_code=400, detail="El email ya está registrado")
    usuario = Usuario(
        nombre=datos.nombre,
        email=datos.email,
        password_hash=hashear_password(datos.password),
        rol="docente"
    )
    session.add(usuario)
    session.commit()
    session.refresh(usuario)
    return {"id": usuario.id, "nombre": usuario.nombre, "email": usuario.email, "rol": usuario.rol}

@router.post("/login")
def login(form: OAuth2PasswordRequestForm = Depends(), session: Session = Depends(get_session)):
    usuario = session.exec(select(Usuario).where(Usuario.email == form.username)).first()
    if not usuario or not verificar_password(form.password, usuario.password_hash):
        raise HTTPException(status_code=401, detail="Email o contraseña incorrectos")
    token = crear_token({"sub": str(usuario.id), "rol": usuario.rol})
    return {"access_token": token, "token_type": "bearer"}

@router.get("/me")
def me(usuario: Usuario = Depends(get_usuario_actual)):
    return {"id": usuario.id, "nombre": usuario.nombre, "email": usuario.email, "rol": usuario.rol}

@router.post("/alumnos")
def crear_alumno(
    datos: CrearAlumno,
    docente: Usuario = Depends(solo_docente),
    session: Session = Depends(get_session)
):
    existente = session.exec(select(Usuario).where(Usuario.email == datos.email)).first()
    if existente:
        raise HTTPException(status_code=400, detail="El email ya está registrado")
    alumno = Usuario(
        nombre=datos.nombre,
        email=datos.email,
        password_hash=hashear_password(datos.password),
        rol="alumno"
    )
    session.add(alumno)
    session.commit()
    session.refresh(alumno)
    return {"id": alumno.id, "nombre": alumno.nombre, "email": alumno.email, "rol": alumno.rol}

@router.get("/alumnos")
def listar_alumnos(
    docente: Usuario = Depends(solo_docente),
    session: Session = Depends(get_session)
):
    alumnos = session.exec(select(Usuario).where(Usuario.rol == "alumno")).all()
    return [{"id": a.id, "nombre": a.nombre, "email": a.email} for a in alumnos]