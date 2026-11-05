import { vi } from 'vitest'
import { createRateLimitedFetch } from './rateLimit.ts'
import { normalizeApiError, parseRetryAfter } from './errors.ts'
import { getUserFacingError } from './errorMessages.ts'

it('blocks new reads and writes until Retry-After expires without replaying a mutation', async () => {
  vi.useFakeTimers()
  try {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValueOnce(new Response(null, { status: 429, headers: { 'Retry-After': '30' } })).mockResolvedValue(new Response(null, { status: 200 }))
    const request = createRateLimitedFetch(fetchMock)
    const response = await request('https://api.example.test/habits', { method: 'POST' })
    const error = normalizeApiError({ success: false, error: { code: 'RATE_LIMIT_EXCEEDED', requestId: 'request-1' } }, response)
    expect(error.requestId).toBe('request-1')
    expect(getUserFacingError(error, 'failed')).toContain('30 seconds')
    await expect(request('https://api.example.test/entries')).rejects.toMatchObject({ status: 429, retryAt: error.retryAt })
    await expect(request('https://api.example.test/habits', { method: 'POST' })).rejects.toMatchObject({ status: 429 })
    expect(fetchMock).toHaveBeenCalledTimes(1)
    await vi.advanceTimersByTimeAsync(30_000)
    expect(fetchMock).toHaveBeenCalledTimes(1)
    await request('https://api.example.test/entries')
    expect(fetchMock).toHaveBeenCalledTimes(2)
  } finally { vi.useRealTimers() }
})

it('handles HTTP dates, absent and malformed Retry-After', () => {
  const now = Date.parse('2026-11-06T00:00:00Z')
  expect(parseRetryAfter('Fri, 06 Nov 2026 00:00:30 GMT', now)).toBe(now + 30_000)
  expect(parseRetryAfter(null, now)).toBeNull()
  expect(parseRetryAfter('invalid', now)).toBeNull()
  expect(parseRetryAfter('-1', now)).toBeNull()
  expect(parseRetryAfter('0', now)).toBe(now)
})

it('preserves an existing API error through generated transport normalization', () => {
  const error = normalizeApiError({}, new Response(null, { status: 429, headers: { 'Retry-After': '5' } }))
  expect(normalizeApiError(error)).toBe(error)
  expect(error.retryAt).not.toBeNull()
})
