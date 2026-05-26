from fastapi import APIRouter, Depends, UploadFile, File, HTTPException
from sqlmodel import Session
import fitz

from backend.database import get_session
from backend.models import Texto

router = APIRouter(prefix="/textos", tags=["Textos"])


@router.post("/subir")
def subir_texto(
    titulo: str,
    docente_id: int,
    archivo: UploadFile = File(...),
    session: Session = Depends(get_session)
):
    # Verificar que sea PDF
    if not archivo.filename.endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Solo se aceptan archivos PDF")

    # Extraer texto del PDF
    contenido_bytes = archivo.file.read()
    doc = fitz.open(stream=contenido_bytes, filetype="pdf")
    texto_extraido = ""
    for pagina in doc:
        texto_extraido += pagina.get_text()

    if not texto_extraido.strip():
        raise HTTPException(status_code=400, detail="No se pudo extraer texto del PDF")

    # Guardar en base de datos
    texto = Texto(titulo=titulo, contenido=texto_extraido, docente_id=docente_id)
    session.add(texto)
    session.commit()
    session.refresh(texto)

    return {"id": texto.id, "titulo": texto.titulo, "palabras": len(texto_extraido.split())}


@router.get("/")
def listar_textos(docente_id: int, session: Session = Depends(get_session)):
    from sqlmodel import select
    textos = session.exec(select(Texto).where(Texto.docente_id == docente_id)).all()
    return textos