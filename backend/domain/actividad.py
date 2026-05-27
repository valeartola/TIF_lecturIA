from dataclasses import dataclass, field
from .pregunta import Pregunta

@dataclass
class AnalisisTexto:
    palabras: int
    tipo: str
    cantidad_preguntas: int

    @classmethod
    def desde_texto(cls, texto: str) -> "AnalisisTexto":
        palabras = len(texto.split())
        if palabras < 300:
            tipo, cantidad = "corto", 4
        elif palabras < 600:
            tipo, cantidad = "mediano", 5
        else:
            tipo, cantidad = "largo", 6
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