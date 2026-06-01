from fastapi import FastAPI
from fastapi.security import HTTPBearer
from backend.database import crear_tablas
from backend import models
from backend.routers import auth
from backend.routers import textos, actividades, respuestas
from backend.config.settings import get_settings, configurar_logging

configurar_logging(get_settings().log_level)

app = FastAPI(
    title="LecturIA API",
    swagger_ui_init_oauth={"usePkceWithAuthorizationCodeGrant": True}
)

security = HTTPBearer()

@app.on_event("startup")
def on_startup():
    crear_tablas()

@app.get("/")
def raiz():
    return {"mensaje": "LecturIA API funcionando"}

app.include_router(textos.router)
app.include_router(actividades.router)
app.include_router(respuestas.router)
app.include_router(auth.router)