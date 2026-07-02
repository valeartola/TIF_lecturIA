"""
Abstracción de los clientes LLM.

LLMClient es la clase base abstracta. GroqClient y UMCloudClient son las
implementaciones concretas. El Generador y el Juez reciben un LLMClient
y no saben qué modelo usan por debajo.
"""
import logging
import json
import re
import time
from abc import ABC, abstractmethod

from groq import Groq, RateLimitError as GroqRateLimitError, APIConnectionError as GroqConnectionError, BadRequestError as GroqBadRequestError
from openai import OpenAI, RateLimitError as OpenAIRateLimitError, APIConnectionError as OpenAIConnectionError, InternalServerError as OpenAIInternalServerError
from google import genai
from google.genai import types



class LLMClient(ABC):
    """Clase base abstracta para clientes de modelos de lenguaje."""

    MAX_ESPERA_S = 60
    ESPERA_CONEXION_S = 5

    @abstractmethod
    def llamar(self, prompt: str, temperatura: float = 1.0) -> str:
        """Llama al modelo y devuelve el contenido como string."""
        pass

    def _extraer_espera_segundos(self, mensaje: str) -> float | None:
        m = re.search(r"in\s+(?:(\d+)m)?\s*([\d.]+)s", mensaje)
        if not m:
            return None
        minutos = int(m.group(1)) if m.group(1) else 0
        return minutos * 60 + float(m.group(2))

logger = logging.getLogger(__name__)

class GroqClient(LLMClient):
    """Cliente para Groq (llama-3.3-70b). Usado por el Generador."""

    MODELO = "llama-3.3-70b-versatile"

    def __init__(self, api_key: str):
        self._client = Groq(api_key=api_key)

    def llamar(self, prompt: str, temperatura: float = 1.0) -> str:
        for intento in range(3):
            try:
                respuesta = self._client.chat.completions.create(
                    model=self.MODELO,
                    messages=[{"role": "user", "content": prompt}],
                    response_format={"type": "json_object"},
                    temperature=temperatura,
                )
                return respuesta.choices[0].message.content
            except GroqRateLimitError as e:
                espera = self._extraer_espera_segundos(str(e))
                if espera is None or espera > self.MAX_ESPERA_S:
                    raise
                logger.warning(f"   [groq] rate limit, esperando {espera:.0f}s (intento {intento + 1}/3)...")
                time.sleep(espera + 1)
            except GroqBadRequestError:
                if intento == 2:
                    raise
                logger.warning(f"   [groq] bad request (JSON inválido), reintentando en {self.ESPERA_CONEXION_S}s (intento {intento + 1}/3)...")
                time.sleep(self.ESPERA_CONEXION_S)
            except GroqConnectionError:
                if intento == 2:
                    raise
                logger.warning(f"   [groq] error de conexión, reintentando en {self.ESPERA_CONEXION_S}s...")
                time.sleep(self.ESPERA_CONEXION_S)
        raise RuntimeError("GroqClient: no se pudo conectar tras varios reintentos")


class UMCloudClient(LLMClient):
    """Cliente para UM-Cloud (gemma4-26b). Usado por el Juez."""

    MODELO = "gemma4-26b"
    PAUSA_ENTRE_LLAMADAS_S = 2.0

    def __init__(self, api_key: str):
        self._client = OpenAI(
            api_key=api_key,
            base_url="https://ai.cloud.um.edu.ar/api/v1",
        )

    def llamar(self, prompt: str, temperatura: float = 0.5) -> str:
        time.sleep(self.PAUSA_ENTRE_LLAMADAS_S)
        for intento in range(3):
            try:
                respuesta = self._client.chat.completions.create(
                    model=self.MODELO,
                    messages=[{"role": "user", "content": prompt}],
                    temperature=temperatura,
                    response_format={"type": "json_object"},
                )
                return respuesta.choices[0].message.content
            except OpenAIRateLimitError as e:
                espera = self._extraer_espera_segundos(str(e))
                if espera is None or espera > self.MAX_ESPERA_S:
                    raise
                logger.warning(f"   [um-cloud] rate limit, esperando {espera:.0f}s (intento {intento + 1}/3)...")
                time.sleep(espera + 1)
            except OpenAIConnectionError:
                if intento == 2:
                    raise
                logger.warning(f"   [um-cloud] error de conexión, reintentando en {self.ESPERA_CONEXION_S}s...")
                time.sleep(self.ESPERA_CONEXION_S)
            except OpenAIInternalServerError as e:
                if intento == 2:
                    raise
                logger.warning(f"   [um-cloud] servidor caído (502), reintentando en {self.ESPERA_CONEXION_S}s (intento {intento + 1}/3)...")
                time.sleep(self.ESPERA_CONEXION_S)
        raise RuntimeError("UMCloudClient: no se pudo conectar tras varios reintentos")

    def llamar_texto(self, prompt: str, temperatura: float = 0.7) -> str:
        """Igual que llamar() pero para texto libre, sin esperar JSON."""
        time.sleep(self.PAUSA_ENTRE_LLAMADAS_S)
        for intento in range(3):
            try:
                respuesta = self._client.chat.completions.create(
                    model=self.MODELO,
                    messages=[{"role": "user", "content": prompt}],
                    temperature=temperatura,
                )
                return respuesta.choices[0].message.content.strip()
            except (OpenAIConnectionError, OpenAIInternalServerError):
                if intento == 2:
                    raise
                logger.warning(f"   [um-cloud] error, reintentando en {self.ESPERA_CONEXION_S}s ({intento + 1}/3)...")
                time.sleep(self.ESPERA_CONEXION_S)
        raise RuntimeError("UMCloudClient: no se pudo conectar tras varios reintentos")


class GeminiClient(LLMClient):
    """Cliente para Gemini (gemini-2.0-flash). Usado por el Juez."""

    MODELO = "gemini-3-flash"
    PAUSA_ENTRE_LLAMADAS_S = 1.0

    def __init__(self, api_key: str):
        self._client = genai.Client(api_key=api_key)

    def llamar(self, prompt: str, temperatura: float = 0.5) -> str:
        time.sleep(self.PAUSA_ENTRE_LLAMADAS_S)
        for intento in range(3):
            try:
                respuesta = self._client.models.generate_content(
                    model=self.MODELO,
                    contents=prompt,
                    config=types.GenerateContentConfig(
                        temperature=temperatura,
                        response_mime_type="application/json"
                    )
                )
                return respuesta.text
            except Exception as e:
                if intento == 2:
                    raise
                logger.warning(f"   [gemini] error, reintentando en {self.ESPERA_CONEXION_S}s (intento {intento + 1}/3)...")
                time.sleep(self.ESPERA_CONEXION_S)
        raise RuntimeError("GeminiClient: no se pudo conectar tras varios reintentos")

    def llamar_texto(self, prompt: str, temperatura: float = 0.7) -> str:
        """Igual que llamar() pero devuelve texto libre, sin forzar JSON."""
        time.sleep(self.PAUSA_ENTRE_LLAMADAS_S)
        for intento in range(3):
            try:
                respuesta = self._client.models.generate_content(
                    model=self.MODELO,
                    contents=prompt,
                    config=types.GenerateContentConfig(temperature=temperatura),
                )
                return respuesta.text.strip()
            except Exception:
                if intento == 2:
                    raise
                logger.warning(f"   [gemini] error en llamar_texto, reintentando ({intento + 1}/3)...")
                time.sleep(self.ESPERA_CONEXION_S)
        raise RuntimeError("GeminiClient: no se pudo conectar tras varios reintentos")