import { request } from '@playwright/test'

export default async function preflight() {
  const context = await request.newContext()
  try {
    const response = await context.get(`${process.env.E2E_BASE_URL}/moodly-config.json`, { maxRedirects: 0 })
    if (response.status() !== 200) throw new Error('Frontend build identity is unavailable.')
    const identity = await response.json()
    const serving = (process.env.E2E_TARGET ?? 'dev') === 'dev' ? 'dev' : 'static'
    if (identity.environment !== 'test' || identity.serving !== serving) throw new Error('E2E requires the selected test frontend serving mode.')
    for (const key of ['VITE_AUTH0_DOMAIN', 'VITE_AUTH0_CLIENT_ID', 'VITE_AUTH0_AUDIENCE', 'VITE_API_BASE_URL']) {
      if (!process.env[key] || identity.values?.[key] !== process.env[key]) throw new Error(`Frontend build identity mismatch: ${key}; rebuild with test configuration.`)
    }
  } finally {
    await context.dispose()
  }
}
