import type { APIRequestContext } from '@playwright/test'

// Matches BE E2eResetController: opt-in non-production endpoint, fixed server-owned
// synthetic subject, constant-time reset token validation. FE cannot choose a user.
export function verifyTestConfiguration(): { url: string; token: string } {
  const url = process.env.E2E_DATA_RESET_URL
  const token = process.env.E2E_DATA_RESET_TOKEN
  if (!url || !token || !process.env.E2E_TEST_USER_EMAIL || !process.env.E2E_TEST_USER_PASSWORD) {
    throw new Error('Authenticated E2E requires the four E2E variables in .env.local or CI secrets.')
  }
  const reset = new URL(url)
  const api = new URL(process.env.VITE_API_BASE_URL ?? '')
  for (const endpoint of [reset, api]) {
    if (!['http:', 'https:'].includes(endpoint.protocol) || endpoint.username || endpoint.password || endpoint.search || endpoint.hash) {
      throw new Error('Invalid E2E API/reset endpoint.')
    }
  }
  if (reset.origin !== api.origin || reset.pathname !== '/internal/e2e/reset') {
    throw new Error('Reset must be the configured API origin at /internal/e2e/reset.')
  }
  const loopback = ['localhost', '127.0.0.1', '[::1]'].includes(api.hostname)
  if (process.env.E2E_TARGET === 'remote' || !loopback) {
    if (process.env.E2E_ALLOW_REMOTE_WRITES !== '1' || api.protocol !== 'https:') {
      throw new Error('Remote authenticated E2E requires explicit authorization and HTTPS.')
    }
  }
  return { url: reset.href, token }
}

export async function resetTestData(request: APIRequestContext): Promise<void> {
  const { url, token } = verifyTestConfiguration()
  const response = await request.post(url, {
    headers: { 'X-E2E-Reset-Token': token }, maxRedirects: 0,
  })
  if (!response.ok()) throw new Error(`E2E data reset failed with HTTP ${response.status()}.`)
}
