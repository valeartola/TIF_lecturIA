import json
import random
import os
from groq import Groq
from dotenv import load_dotenv
from backend.contexto import construir_prompt

load_dotenv()
client = Groq(api_key=os.getenv("GROQ_API_KEY"))


def analizar_texto(texto):
    palabras = len(texto.split())
    
    if palabras < 300:
        cantidad = random.choice([4, 5])
        tipo = "corto"
    elif palabras < 600:
        cantidad = random.choice([5, 6])
        tipo = "mediano"
    else:
        cantidad = random.choice([6, 7])
        tipo = "largo"
    
    return cantidad, tipo

def definir_tipos_pregunta(cantidad):
    tipos = [
        "comprensión literal",
        "comprensión inferencial",
        "vocabulario en contexto",
        "idea principal o global",
        "detalle específico",
        "causa y efecto"
    ]
    obligatorios = tipos[:3]
    extras = tipos[3:]
    
    resultado = obligatorios.copy()
    while len(resultado) < cantidad:
        resultado.append(random.choice(extras))
    
    random.shuffle(resultado)
    return resultado[:cantidad]

def generar_posiciones(cantidad):
    posiciones = list(range(4)) * (cantidad // 4 + 1)
    random.shuffle(posiciones)
    return posiciones[:cantidad]

def validar_preguntas(preguntas, cantidad_esperada):
    errores = []
    
    if len(preguntas) != cantidad_esperada:
        errores.append(f"Se esperaban {cantidad_esperada} preguntas, llegaron {len(preguntas)}")
    
    for i, p in enumerate(preguntas):
        if len(p["opciones"]) != 4:
            errores.append(f"Pregunta {i+1}: tiene {len(p['opciones'])} opciones, se esperaban 4")
        
        if p["correcta"] not in [0, 1, 2, 3]:
            errores.append(f"Pregunta {i+1}: índice {p['correcta']} inválido")
        
        if any(op.strip() == "" for op in p["opciones"]):
            errores.append(f"Pregunta {i+1}: tiene opciones vacías")
    
    return errores


def generar_actividad(texto, dificultad="MEDIA"):
    
    cantidad, tipo_texto = analizar_texto(texto)
    tipos_pregunta = definir_tipos_pregunta(cantidad)
    posiciones = generar_posiciones(cantidad)
    
    print(f" Texto {tipo_texto}: {len(texto.split())} palabras")
    print(f" Generando {cantidad} preguntas")
    print(f" Tipos: {tipos_pregunta}")
    
    preguntas = []
    
    for i, (tipo, pos) in enumerate(zip(tipos_pregunta, posiciones)):
        print(f"   Generando pregunta {i+1}/{cantidad}: {tipo}...")
        
        prompt = construir_prompt(texto, dificultad, tipo, pos, preguntas)
        
        respuesta = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[{"role": "user", "content": prompt}]
        )
        
        contenido = respuesta.choices[0].message.content
        try:
            pregunta = json.loads(contenido)
        except json.JSONDecodeError:
            print(f"   Error de formato, reintentando...")
            respuesta = client.chat.completions.create(
                model="llama-3.3-70b-versatile",
                messages=[{"role": "user", "content": prompt}]
            )
            pregunta = json.loads(respuesta.choices[0].message.content)
        
        preguntas.append(pregunta)
    
    errores = validar_preguntas(preguntas, cantidad)
    
    if errores:
        print("\n Errores encontrados:")
        for e in errores:
            print(f"  - {e}")
    else:
        print(f"\n {cantidad} preguntas generadas y validadas correctamente")
    
    return preguntas