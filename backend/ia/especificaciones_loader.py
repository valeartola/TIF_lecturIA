"""
Cargador de especificaciones pedagógicas.

Punto único de acceso a los documentos en backend/especificaciones/.
Cada consumidor (generador, juez) usa la función que le corresponde.

Si un archivo no existe, falla rápido en el import: queremos enterarnos al
arrancar la app, no en producción cuando el docente cargue un texto.
"""

from pathlib import Path

# Ruta absoluta a la carpeta de especificaciones, independiente de desde dónde
# se ejecute el script.
_BASE = Path(__file__).parent / "especificaciones"

_PEDAGOGIA = _BASE / "pedagogia.md"
_RUBRICA = _BASE / "rubrica_juez.md"
_EJEMPLOS = _BASE / "ejemplos.md"


def _leer(ruta: Path) -> str:
    """Lee un archivo de especificaciones. Falla si no existe."""
    if not ruta.exists():
        raise FileNotFoundError(
            f"Falta archivo de especificaciones: {ruta}. "
            f"Verificar carpeta backend/especificaciones/."
        )
    return ruta.read_text(encoding="utf-8")


def specs_para_generador() -> str:
    """
    Especificaciones que recibe el generador.

    Solo pedagogía: el generador NO debe ver la rúbrica del juez para evitar
    sesgo de "escribir para aprobar el examen" en lugar de seguir los
    criterios pedagógicos genuinos.
    """
    return _leer(_PEDAGOGIA)


def specs_para_juez(incluir_ejemplos: bool = True) -> str:
    """
    Especificaciones que recibe el juez.

    Pedagogía (criterios contra los que evalúa) + rúbrica (cómo evalúa).
    Opcionalmente incluye ejemplos calibrados como few-shot.
    """
    pedagogia = _leer(_PEDAGOGIA)
    rubrica = _leer(_RUBRICA)
    bloques = [pedagogia, rubrica]

    if incluir_ejemplos:
        bloques.append(_leer(_EJEMPLOS))

    return "\n\n---\n\n".join(bloques)