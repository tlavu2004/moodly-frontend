import { ApiRequestError, getRetryDeadline } from './errors.ts'

/** Reject user retries during the server cooldown; never queue or replay requests. */
export function createRateLimitedFetch(fetchRequest: typeof fetch = (input, init) => globalThis.fetch(input, init)): typeof fetch {
  let blockedUntil = 0
  return async (input, init) => {
    if (Date.now() < blockedUntil) {
      throw new ApiRequestError({ status: 429, message: 'Too many requests.', retryAt: blockedUntil })
    }
    const response = await fetchRequest(input, init)
    if (response.status === 429) {
      blockedUntil = Math.max(blockedUntil, getRetryDeadline(response.headers.get('Retry-After')))
    }
    return response
  }
}
