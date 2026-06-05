import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const BACKEND = 'http://localhost:8000'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/auth': BACKEND,
      '/textos': BACKEND,
      '/actividades': BACKEND,
      '/respuestas': BACKEND,
      '/progreso': BACKEND,
    },
  },
})