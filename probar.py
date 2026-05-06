import fitz
from backend.generador import generar_actividad

#ruta PDF 
ruta_pdf = "datos/t_corto.pdf"

# Leer el PDF
documento = fitz.open(ruta_pdf)
texto = ""
for pagina in documento:
    texto += pagina.get_text()

texto = texto[:3000]

print(f" Texto cargado: {len(texto.split())} palabras")

# Generar actividad
preguntas = generar_actividad(texto, dificultad="MEDIA")

# Mostrar resultados
print("\n" + "="*50)
print(" ACTIVIDAD GENERADA")
print("="*50)

for i, p in enumerate(preguntas):
    print(f"\nPregunta {i+1}: {p['pregunta']}")
    for j, opcion in enumerate(p["opciones"]):
        marca = "✅" if j == p["correcta"] else "  "
        print(f"  {marca} {j}. {opcion}")