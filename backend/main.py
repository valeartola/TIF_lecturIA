import logging
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
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

logger = logging.getLogger("lecturia")


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

app.include_router(textos.router)
app.include_router(actividades.router)
app.include_router(respuestas.router)
app.include_router(auth.router)