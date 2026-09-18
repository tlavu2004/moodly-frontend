import { createClient } from './openapi/client/index.api.ts'
import { normalizeApiError } from './errors.ts'

type GetAccessToken = () => Promise<string | undefined>

function getApiBaseUrl() {
  const baseUrl = import.meta.env.VITE_API_BASE_URL

  if (!baseUrl) {
    throw new Error('VITE_API_BASE_URL is not configured.')
  }

  return baseUrl.replace(/\/$/, '')
}

/** Creates the shared typed API transport for authenticated Moodly requests. */
export function createApiClient(getAccessToken: GetAccessToken) {
  const client = createClient({
    baseUrl: getApiBaseUrl(),
    auth: getAccessToken,
    throwOnError: true,
  })

  client.interceptors.error.use((error, response) => normalizeApiError(error, response))

  return client
}

export type ApiClient = ReturnType<typeof createApiClient>
