import { useAuth0 } from '@auth0/auth0-react'
import { useCallback } from 'react'
import { ApiRequestError, type ApiEnvelope } from './types.ts'

function getApiBaseUrl() {
  const baseUrl = import.meta.env.VITE_API_BASE_URL

  if (!baseUrl) {
    throw new Error('VITE_API_BASE_URL is not configured.')
  }

  return baseUrl.replace(/\/$/, '')
}

function isApiEnvelope<T>(value: unknown): value is ApiEnvelope<T> {
  return (
    typeof value === 'object' &&
    value !== null &&
    'success' in value &&
    typeof value.success === 'boolean' &&
    'data' in value &&
    'timestamp' in value
  )
}

async function readResponse<T>(response: Response): Promise<T> {
  const payload: unknown = await response.json().catch(() => null)

  if (!isApiEnvelope<T>(payload)) {
    throw new ApiRequestError({
      message: `API returned an unexpected response (${response.status}).`,
      status: response.status,
    })
  }

  if (!response.ok || !payload.success) {
    throw new ApiRequestError({
      message: payload.error?.message ?? `API request failed (${response.status}).`,
      status: response.status,
      error: payload.error,
      timestamp: payload.timestamp,
    })
  }

  return payload.data as T
}

/**
 * Sends requests to the Moodly API with an Auth0 access token.
 * The provider's audience configuration determines the token audience.
 */
export function useAuthenticatedApi() {
  const { getAccessTokenSilently } = useAuth0()

  return useCallback(
    async <T>(path: string, init: RequestInit = {}): Promise<T> => {
      const token = await getAccessTokenSilently()
      const headers = new Headers(init.headers)

      headers.set('Accept', 'application/json')
      headers.set('Authorization', `Bearer ${token}`)

      const response = await fetch(`${getApiBaseUrl()}${path}`, {
        ...init,
        headers,
      })

      return readResponse<T>(response)
    },
    [getAccessTokenSilently],
  )
}
