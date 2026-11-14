import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { visualizer } from 'rollup-plugin-visualizer'
import { defineConfig } from 'vitest/config'
import { loadEnvironment, resolveEnvironment } from './scripts/load-environment.mjs'
import { validateBuildEnvironment } from './scripts/validate-build-env.mjs'

const publicKeys = ['VITE_AUTH0_DOMAIN', 'VITE_AUTH0_CLIENT_ID', 'VITE_AUTH0_AUDIENCE', 'VITE_API_BASE_URL']

// https://vite.dev/config/
export default defineConfig(({ mode, command }) => {
  const environment = resolveEnvironment(process.env.VERCEL_ENV === 'production' ? 'production' : (process.env.MOODLY_ENV ?? mode))
  const values = Object.fromEntries(Object.entries(loadEnvironment(environment)).filter(([key]) => publicKeys.includes(key)))
  // Empty configuration still supports CI type/build checks; configured builds/dev
  // must obey the same browser endpoint rules as Docker deploy builds.
  if (Object.keys(values).length > 0) validateBuildEnvironment(values, environment)
  const identity = JSON.stringify({ environment, serving: command === 'serve' ? 'dev' : 'static', values })
  return {
    envDir: false,
    envPrefix: [],
    server: {
      host: '127.0.0.1',
      port: environment === 'test' ? 4173 : 5173,
      strictPort: true,
    },
    define: Object.fromEntries(Object.entries(values)
      .map(([key, value]) => [`import.meta.env.${key}`, JSON.stringify(value)])),
    plugins: [
      {
        name: 'moodly-build-identity',
        configureServer(server) {
          server.middlewares.use('/moodly-config.json', (_request, response) => {
            response.setHeader('Content-Type', 'application/json')
            response.setHeader('Cache-Control', 'no-store')
            response.end(identity)
          })
        },
        generateBundle() { this.emitFile({ type: 'asset', fileName: 'moodly-config.json', source: identity }) },
      },
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
  }
})
