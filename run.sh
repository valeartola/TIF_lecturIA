#!/bin/bash
cd "$(dirname "$0")"

# Activar virtualenv
source venv/bin/activate

# Backend
uvicorn backend.main:app --reload &
PID_BACK=$!

# Frontend
cd lecturia-app && npm run dev &
PID_FRONT=$!

trap "kill $PID_BACK $PID_FRONT 2>/dev/null" EXIT

echo "Backend y frontend corriendo. Ctrl+C para parar ambos."
wait