from sqlmodel import SQLModel, Field
from typing import Optional
from datetime import datetime

class Usuario(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    nombre: str
    email: Optional[str] = Field(default=None)          # solo para docentes
    password_hash: str
    rol: str
    codigo_clase: Optional[str] = Field(default=None, unique=True)  # solo para docentes
    docente_id: Optional[int] = Field(default=None, foreign_key="usuario.id")  # solo para alumnos
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
    validada: bool = Field(default=False)
    creado_en: datetime = Field(default_factory=datetime.utcnow)

class Pregunta(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    actividad_id: int = Field(foreign_key="actividad.id")
    dificultad: str          # "FÁCIL", "MEDIA", "DIFÍCIL"
    enunciado: str
    opciones_json: str       # lista de 4 opciones como JSON string
    opcion_correcta: int     # índice 0-3
    tipo: str                # "comprensión literal", "inferencial", etc.
    validada: bool = Field(default=False)
    creado_en: datetime = Field(default_factory=datetime.utcnow)

class Respuesta(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    alumno_id: int = Field(foreign_key="usuario.id")
    actividad_id: int = Field(foreign_key="actividad.id")
    pregunta_id: int = Field(foreign_key="pregunta.id")
    opcion_elegida: int
    es_correcta: bool
    numero_intento: int = Field(default=1)
    respondido_en: datetime = Field(default_factory=datetime.utcnow)