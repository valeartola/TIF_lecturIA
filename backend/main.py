from fastapi import FastAPI
from backend.database import crear_tablas
from backend import models
from backend.routers import textos
from backend.routers import actividades
from backend.routers import respuestas


app = FastAPI(title="LecturIA API")

@app.on_event("startup")
def on_startup():
    crear_tablas()

@app.get("/")
def raiz():
    return {"mensaje": "LecturIA API funcionando"}

app.include_router(textos.router)
app.include_router(actividades.router)
app.include_router(respuestas.router)
