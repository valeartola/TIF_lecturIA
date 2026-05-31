from dataclasses import dataclass, field
from .pregunta import Pregunta

PREGUNTAS_POR_NIVEL = 7  # siempre se generan 5 por dificultad
DIFICULTADES = ["FÁCIL", "MEDIA", "DIFÍCIL"]

@dataclass
class AnalisisTexto:
    palabras: int
    tipo: str
    cantidad_preguntas: int

    @classmethod
    def desde_texto(cls, texto: str) -> "AnalisisTexto":
        palabras = len(texto.split())
        if palabras < 300:
            tipo, cantidad = "corto", 6
        elif palabras < 600:
            tipo, cantidad = "mediano", 8
        else:
            tipo, cantidad = "largo", 10
        return cls(palabras=palabras, tipo=tipo, cantidad_preguntas=cantidad)

@dataclass
class ResultadoActividad:
    preguntas: list[Pregunta]
    metricas: dict = field(default_factory=dict)

    def a_dict(self) -> list[dict]:
        return [
            {"pregunta": p.pregunta, "opciones": p.opciones,
             "correcta": p.correcta, "tipo": p.tipo}
            for p in self.preguntas
        ]