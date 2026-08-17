import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: '/cotizador/',
  build: {
    outDir: '../cotizador',
    emptyOutDir: true,
    // three.js es pesado y solo lo usa la página de Prototipo; se separa en
    // su propio chunk para que no infle el bundle principal ni ralentice el
    // arranque del resto del sistema.
    rollupOptions: {
      output: {
        manualChunks: {
          three: ['three'],
        },
      },
    },
    chunkSizeWarningLimit: 1600,
  },
})
