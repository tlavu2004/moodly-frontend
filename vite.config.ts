import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { visualizer } from 'rollup-plugin-visualizer'
import { defineConfig } from 'vitest/config'

// https://vite.dev/config/
export default defineConfig(({ mode }) => ({
  plugins: [
    react(),
    tailwindcss(),
    mode === 'analyze' && visualizer({
      filename: 'reports/bundle.html',
      gzipSize: true,
      brotliSize: true,
      open: false,
    }),
  ],
  test: {
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      include: ['src/**/*.{ts,tsx}'],
      exclude: ['src/api/openapi/**', 'src/main.tsx', 'src/test/**'],
      thresholds: {
        lines: 60,
        functions: 55,
        branches: 50,
        statements: 60,
      },
    },
  },
  build: {
    manifest: true,
    sourcemap: false,
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
}))
