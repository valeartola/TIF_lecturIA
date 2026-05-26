from sqlmodel import SQLModel, Field
from typing import Optional
from datetime import datetime

class Usuario(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    nombre: str
    email: str
    rol: str  # "docente" o "alumno"
    creado_en: datetime = Field(default_factory=datetime.utcnow)

class Texto(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    titulo: str
    contenido: str
    docente_id: int = Field(foreign_key="usuario.id")
    creado_en: datetime = Field(default_factory=datetime.utcnow)

class Actividad(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    texto_id: int = Field(foreign_key="texto.id")
    dificultad: str  # "FÁCIL", "MEDIA", "DIFÍCIL"
    preguntas_json: str  # guardamos las preguntas como JSON string
    validada: bool = Field(default=False)
    creado_en: datetime = Field(default_factory=datetime.utcnow)

class Respuesta(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    alumno_id: int = Field(foreign_key="usuario.id")
    actividad_id: int = Field(foreign_key="actividad.id")
    pregunta_index: int
    opcion_elegida: int
    es_correcta: bool
    respondido_en: datetime = Field(default_factory=datetime.utcnow)