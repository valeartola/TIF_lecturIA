from dataclasses import dataclass

@dataclass
class Pregunta:
    pregunta: str
    opciones: list[str]
    correcta: int
    tipo: str = ""

    def es_valida(self) -> bool:
        return (
            bool(self.pregunta.strip())
            and len(self.opciones) == 4
            and 0 <= self.correcta <= 3
        )

@dataclass
class ResultadoEvaluacion:
    contenido_texto: int
    respuesta_correcta_unica: int
    nivel_adecuado: int
    no_repeticion: int
    aprobada: bool
    aspecto_cubierto: str
    comentarios: str
    sugerencia_mejora: str = ""