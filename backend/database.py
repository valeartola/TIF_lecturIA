from sqlmodel import SQLModel, create_engine, Session
from backend.config.settings import get_settings

DATABASE_URL = get_settings().database_url
engine = create_engine(DATABASE_URL, echo=False)

def crear_tablas():
    SQLModel.metadata.create_all(engine)

def get_session():
    with Session(engine) as session:
        yield session