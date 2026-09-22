import type { APIRequestContext } from '@playwright/test'

export async function resetTestData(request: APIRequestContext): Promise<void> {
  const url = process.env.E2E_DATA_RESET_URL
  const token = process.env.E2E_DATA_RESET_TOKEN
  if (!url || !token) {
    throw new Error('E2E_DATA_RESET_URL and E2E_DATA_RESET_TOKEN are required for authenticated E2E tests.')
  }
  const response = await request.post(url, { headers: { Authorization: `Bearer ${token}` } })
  if (!response.ok()) throw new Error(`E2E data reset failed with HTTP ${response.status()}.`)
}
