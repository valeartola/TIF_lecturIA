import os
from sqlmodel import SQLModel, create_engine, Session
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./lecturia.db")
engine = create_engine(DATABASE_URL, echo=False)

def crear_tablas():
    SQLModel.metadata.create_all(engine)

def get_session():
    with Session(engine) as session:
        yield session