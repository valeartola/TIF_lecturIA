from fastapi import APIRouter, Depends, UploadFile, File, HTTPException
from sqlmodel import Session, select
import fitz

from backend.database import get_session
from backend.models import Texto, Actividad, Usuario
from backend.auth import solo_docente, get_usuario_actual, solo_alumno

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


@router.delete("/{texto_id}")
def eliminar_texto(
    texto_id: int,
    session: Session = Depends(get_session),
    docente: Usuario = Depends(solo_docente)
):
    """
    Elimina un texto. Solo permitido si NO tiene ninguna actividad asociada
    (caso típico: la generación falló antes de crear la Actividad y quedó
    un Texto huérfano). Si el texto ya tiene una actividad, hay que usar
    DELETE /actividades/{id} en su lugar, que borra todo en cascada.
    """
    texto = session.get(Texto, texto_id)
    if not texto:
        raise HTTPException(status_code=404, detail="Texto no encontrado")
    if texto.docente_id != docente.id:
        raise HTTPException(status_code=403, detail="No tenés permiso sobre este texto")

    actividad_existente = session.exec(
        select(Actividad).where(Actividad.texto_id == texto_id)
    ).first()
    if actividad_existente:
        raise HTTPException(
            status_code=400,
            detail="Este texto ya tiene una actividad asociada. Eliminá la actividad en su lugar.",
        )

    session.delete(texto)
    session.commit()

    return {"mensaje": "Texto eliminado correctamente", "id": texto_id}


@router.get("/")
def listar_textos(
    session: Session = Depends(get_session),
    docente: Usuario = Depends(solo_docente)
):
    textos = session.exec(select(Texto).where(Texto.docente_id == docente.id)).all()
    return textos

@router.get("/mis-actividades")
def mis_actividades(
    session: Session = Depends(get_session),
    docente: Usuario = Depends(solo_docente)
):
    """Devuelve los textos del docente con el estado de su actividad asociada."""
    textos = session.exec(select(Texto).where(Texto.docente_id == docente.id)).all()
    resultado = []
    for t in textos:
        act = session.exec(
            select(Actividad).where(Actividad.texto_id == t.id)
        ).first()
        resultado.append({
            "texto_id": t.id,
            "titulo": t.titulo,
            "palabras": len(t.contenido.split()),
            "creado_en": t.creado_en,
            "actividad_id": act.id if act else None,
            "validada": act.validada if act else None,
        })
    return resultado



@router.get("/disponibles")
def textos_disponibles(
    session: Session = Depends(get_session),
    alumno: Usuario = Depends(solo_alumno)
):
    textos = session.exec(
        select(Texto).where(Texto.docente_id == alumno.docente_id)
    ).all()

    resultado = []
    for texto in textos:
        actividad_validada = session.exec(
            select(Actividad).where(
                Actividad.texto_id == texto.id,
                Actividad.validada == True
            )
        ).first()
        if actividad_validada:
            resultado.append({
                "id": texto.id,
                "titulo": texto.titulo,
                "palabras": len(texto.contenido.split()),
                "actividad_id": actividad_validada.id
            })

    return resultado


@router.get("/{texto_id}")
def obtener_texto(
    texto_id: int,
    session: Session = Depends(get_session),
    usuario: Usuario = Depends(get_usuario_actual)
):
    texto = session.get(Texto, texto_id)
    if not texto:
        raise HTTPException(status_code=404, detail="Texto no encontrado")

    if usuario.rol == "alumno" and texto.docente_id != usuario.docente_id:
        raise HTTPException(status_code=403, detail="No tenés acceso a este texto")

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