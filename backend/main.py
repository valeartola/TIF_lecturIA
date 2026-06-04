import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse

from backend.database import crear_tablas
from backend import models
from backend.routers import auth, textos, actividades, respuestas, progreso
from backend.config.settings import get_settings, configurar_logging

configurar_logging(get_settings().log_level)
logger = logging.getLogger("lecturia")


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Tareas de arranque (reemplaza al on_event("startup") deprecado)
    crear_tablas()
    yield
    # Acá irían tareas de cierre si hicieran falta


app = FastAPI(
    title="LecturIA API",
    lifespan=lifespan,
    swagger_ui_init_oauth={"usePkceWithAuthorizationCodeGrant": True},
)


# Red de seguridad: atrapa cualquier error inesperado que ningún endpoint
# haya manejado. Registra el detalle técnico en el log (para depurar) y le
# devuelve al cliente un mensaje limpio y uniforme, sin filtrar el traceback.
@app.exception_handler(Exception)
async def manejar_error_inesperado(request: Request, exc: Exception):
    logger.error("Error no manejado en %s %s", request.method, request.url.path, exc_info=exc)
    return JSONResponse(
        status_code=500,
        content={"detail": "Ocurrió un error interno. Intentá de nuevo más tarde."},
    )


@app.get("/")
def raiz():
    return {"mensaje": "LecturIA API funcionando"}


app.include_router(auth.router)
app.include_router(textos.router)
app.include_router(actividades.router)
app.include_router(respuestas.router)
app.include_router(progreso.router)