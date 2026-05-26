# LecturIA

LecturIA es una API para generar actividades de comprensión lectora con apoyo de IA.

## Funcionalidades principales
- Carga de textos en PDF.
- Extracción automática del contenido.
- Generación de preguntas de opción múltiple.
- Evaluación automática mediante un LLM juez.
- Validación docente.
- Registro de respuestas de estudiantes.

## Cómo ejecutar


- Instalar dependencias
```bash
pip install -r requirements.txt
```

- Ejecutar la API
```bash
uvicorn backend.main:app --reload
```