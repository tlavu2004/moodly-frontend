import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    manifest: true,
    rolldownOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) {
            return undefined
          }

          if (id.includes('@auth0')) {
            return 'auth0'
          }

          if (id.includes('react-router')) {
            return 'react-router'
          }

          if (id.includes('/react/') || id.includes('/react-dom/') || id.includes('react-is')) {
            return 'react'
          }

          return 'vendor'
        },
      },
    },
  },
})
