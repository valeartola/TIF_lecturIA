# LecturIA

LecturIA es una plataforma educativa que integra Inteligencia Artificial para fortalecer la comprensión lectora en estudiantes de nivel primario, mediante la generación de actividades adaptativas y el seguimiento del progreso lector.

## Funcionalidades principales
- Carga de textos en PDF.
- Extracción automática del contenido.
- Generación de preguntas de opción múltiple con IA (Groq / Llama 3.3).
- Evaluación automática mediante un LLM juez independiente (UM-Cloud / Gemma 4).
- Adaptación dinámica de dificultad según el desempeño del alumno.
- Dashboard docente con métricas de progreso individual y grupal.
- Validación docente de preguntas generadas.
- Registro de respuestas de estudiantes.

## Requisitos previos
- Python 3.12+
- Node.js 18+
- Claves de API configuradas en `.env` (ver sección Configuración)

## Configuración

Crear un archivo `.env` en la raíz del proyecto con las siguientes variables:

```env
GROQ_API_KEY=tu_clave_de_groq
UM_CLOUD_API_KEY=tu_clave_de_um_cloud
GEMINI_API_KEY=tu_clave_de_gemini
DATABASE_URL=sqlite:///./lecturia.db
```

## Cómo ejecutar

### Opción 1: Script unificado (recomendado)

Levanta backend y frontend juntos:

```bash
./run.sh
```

Para detener ambos: `Ctrl+C`.

### Opción 2: Por separado

Terminal 1 — Backend:
```bash
source venv/bin/activate
uvicorn backend.main:app --reload
```

Terminal 2 — Frontend:
```bash
cd lecturia-app
npm run dev
```

## Instalación desde cero

```bash
# Clonar el repositorio
git clone <url-del-repo>
cd TIF_lecturIA

# Backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# Frontend
cd lecturia-app
npm install
cd ..

# Configurar variables de entorno
cp .env.example .env
# Editar .env con las claves de API

# Ejecutar
./run.sh
```

## Arquitectura

- **Frontend:** React (Vite) en `lecturia-app/`
- **Backend:** FastAPI en `backend/`
- **Generador:** Llama 3.3 70B vía Groq
- **Juez:** Gemma 4 26B vía UM-Cloud (Universidad de Mendoza)
- **Base de datos:** SQLite con SQLModel