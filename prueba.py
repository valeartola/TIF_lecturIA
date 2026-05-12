"""
Uso:
    python probar.py                              # corto + MEDIA (defaults)
    python probar.py datos/t_medio.pdf            # medio + MEDIA
    python probar.py datos/t_largo.pdf DIFICIL    # largo + DIFÍCIL

Dificultades válidas: FACIL, MEDIA, DIFICIL (sin tildes para no pelear con shells)
"""

import sys
import fitz
from backend.generador import generar_actividad


# Argumentos opcionales
ruta_pdf = sys.argv[1] if len(sys.argv) > 1 else "datos/t_corto.pdf"
dificultad_arg = sys.argv[2].upper() if len(sys.argv) > 2 else "MEDIA"

# Mapeo a las dificultades reales (con tildes) que entiende el sistema
mapeo_dificultad = {"FACIL": "FÁCIL", "MEDIA": "MEDIA", "DIFICIL": "DIFÍCIL"}
if dificultad_arg not in mapeo_dificultad:
    print(f"Dificultad inválida: {dificultad_arg}. Usá FACIL, MEDIA o DIFICIL.")
    sys.exit(1)
dificultad = mapeo_dificultad[dificultad_arg]

print(f" Texto: {ruta_pdf}")
print(f" Dificultad: {dificultad}")

# Leer el PDF
documento = fitz.open(ruta_pdf)
texto = ""
for pagina in documento:
    texto += pagina.get_text()
texto = texto[:8000]
print(f" Texto cargado: {len(texto.split())} palabras")

# Generar actividad
resultado = generar_actividad(texto, dificultad=dificultad)

preguntas = resultado["preguntas"]
metricas = resultado["metricas"]
rechazos = resultado["rechazos"]
aspectos = resultado["aspectos_cubiertos"]

print("\n" + "=" * 60)
print(" ACTIVIDAD GENERADA")
print("=" * 60)
print(f" Pedidas: {metricas['pedidas']} | Aprobadas: {metricas['aprobadas']} "
      f"| Reemplazos: {metricas['reemplazos']} | Descartes: {metricas['descartes']} "
      f"| Rechazos totales: {metricas['rechazos_total']}")
print("=" * 60)

for i, p in enumerate(preguntas):
    ev = p["evaluacion"]
    print(f"\nPregunta {i+1} [{p['tipo']}] (intentos: {ev['intentos']})")
    print(f"  Scores: contenido={ev['contenido_texto']} "
          f"respuesta_única={ev['respuesta_correcta_unica']} "
          f"nivel={ev['nivel_adecuado']} "
          f"no_repetición={ev['no_repeticion']}")
    if ev.get("comentarios"):
        print(f"  Juez: {ev['comentarios']}")
    print(f"\n  {p['pregunta']}")
    for j, opcion in enumerate(p["opciones"]):
        marca = "✅" if j == p["correcta"] else "  "
        print(f"    {marca} {j}. {opcion}")

print("\n" + "=" * 60)
print(" COBERTURA TEMÁTICA DE LA ACTIVIDAD")
print("=" * 60)
for i, aspecto in enumerate(aspectos, 1):
    print(f"  {i}. {aspecto}")

if rechazos:
    print("\n" + "=" * 60)
    print(" PREGUNTAS RECHAZADAS POR EL JUEZ (regeneradas después)")
    print("=" * 60)
    for r in rechazos:
        ev = r["evaluacion"]
        p = r["pregunta"]
        print(f"\n  Slot {r['slot']} [{r['tipo']}] — intento {r['intento']}")
        print(f"  Scores: contenido={ev['contenido_texto']} "
              f"respuesta_única={ev['respuesta_correcta_unica']} "
              f"nivel={ev['nivel_adecuado']} "
              f"no_repetición={ev['no_repeticion']}")
        print(f"  Motivo: {ev.get('comentarios', '(sin comentario)')}")
        if ev.get("sugerencia_mejora"):
            print(f"  Feedback al generador: {ev['sugerencia_mejora']}")
        print(f"\n    {p['pregunta']}")
        for j, opcion in enumerate(p["opciones"]):
            marca = "✗correcta-marcada" if j == p["correcta"] else "  "
            print(f"      {marca} {j}. {opcion}")

if resultado["descartes"]:
    print("\n" + "=" * 60)
    print(" DESCARTES (slots sin pregunta aprobada)")
    print("=" * 60)
    for d in resultado["descartes"]:
        ev = d["ultima_evaluacion"]
        print(f"  - Slot {d['indice']+1} ({d['tipo']}): "
              f"intentos={d['intentos']}, "
              f"D1={ev['contenido_texto']} "
              f"D2={ev['respuesta_correcta_unica']} "
              f"D3={ev['nivel_adecuado']} "
              f"D4={ev['no_repeticion']}")
        print(f"    Motivo: {ev.get('comentarios', '(sin comentario)')}")