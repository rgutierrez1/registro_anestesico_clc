import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig(({ command }) => ({
  // Rutas relativas al construir: la app se sirve desde una subcarpeta (GitHub Pages: /nombre-del-repo/).
  base: command === 'build' ? './' : '/',
  plugins: [react(), tailwindcss()],
  server: {
    host: true,
  },
}))
