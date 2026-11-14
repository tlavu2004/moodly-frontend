import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'

// A self-contained bundle loaded by Auth0, never by the Moodly SPA.
export default defineConfig({
  plugins: [react(), tailwindcss()],
  publicDir: false,
  define: { 'process.env.NODE_ENV': JSON.stringify('production') },
  build: {
    outDir: 'dist-acul',
    emptyOutDir: true,
    sourcemap: false,
    minify: true,
    lib: { entry: 'src/auth-hosted/main.tsx', name: 'MoodlyAuth', formats: ['iife'], fileName: () => 'moodly-auth.js', cssFileName: 'moodly-auth' },
  },
})
