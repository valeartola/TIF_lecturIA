from fastapi import APIRouter, Depends, UploadFile, File, HTTPException
from sqlmodel import Session, select
import fitz

from backend.database import get_session
from backend.models import Texto, Actividad, Usuario
from backend.auth import solo_docente, get_usuario_actual

router = APIRouter(prefix="/textos", tags=["Textos"])


@router.post("/subir")
def subir_texto(
    titulo: str,
    archivo: UploadFile = File(...),
    session: Session = Depends(get_session),
    docente: Usuario = Depends(solo_docente)
):
    if not archivo.filename.endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Solo se aceptan archivos PDF")

    contenido_bytes = archivo.file.read()
    doc = fitz.open(stream=contenido_bytes, filetype="pdf")
    texto_extraido = ""
    for pagina in doc:
        texto_extraido += pagina.get_text()

    if not texto_extraido.strip():
        raise HTTPException(status_code=400, detail="No se pudo extraer texto del PDF")

    texto = Texto(titulo=titulo, contenido=texto_extraido, docente_id=docente.id)
    session.add(texto)
    session.commit()
    session.refresh(texto)

    return {"id": texto.id, "titulo": texto.titulo, "palabras": len(texto_extraido.split())}


@router.get("/")
def listar_textos(
    session: Session = Depends(get_session),
    docente: Usuario = Depends(solo_docente)
):
    textos = session.exec(select(Texto).where(Texto.docente_id == docente.id)).all()
    return textos

@router.get("/{texto_id}")
def obtener_texto(
    texto_id: int,
    session: Session = Depends(get_session),
    usuario: Usuario = Depends(get_usuario_actual)
):
    texto = session.get(Texto, texto_id)
    if not texto:
        raise HTTPException(status_code=404, detail="Texto no encontrado")

    actividad_validada = session.exec(
        select(Actividad).where(
            Actividad.texto_id == texto_id,
            Actividad.validada == True
        )
    ).first()

    if not actividad_validada:
        raise HTTPException(status_code=403, detail="Este texto no tiene una actividad publicada aún")

    return {
        "id": texto.id,
        "titulo": texto.titulo,
        "contenido": texto.contenido,
        "palabras": len(texto.contenido.split())
    }