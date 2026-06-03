import logging
from pydantic_settings import BaseSettings
from functools import lru_cache

class Settings(BaseSettings):
    database_url: str = "sqlite:///./lecturia.db"
    groq_api_key: str
    um_cloud_api_key: str
    gemini_api_key: str
    log_level: str = "INFO"
    max_reintentos_por_slot: int = 3
    max_reemplazos_actividad: int = 5

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"

@lru_cache()
def get_settings() -> Settings:
    return Settings()

def configurar_logging(level: str = "INFO") -> None:
    logging.basicConfig(
        level=getattr(logging, level.upper(), logging.INFO),
        format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    )