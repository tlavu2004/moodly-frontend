import { vi } from 'vitest'
import { createRateLimitedFetch } from './rateLimit.ts'
import { getRetryDeadline, normalizeApiError, parseRetryAfter } from './errors.ts'
import { getUserFacingError } from './errorMessages.ts'

it('blocks new reads and writes until Retry-After expires without replaying a mutation', async () => {
  vi.useFakeTimers()
  try {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValueOnce(new Response(null, { status: 429, headers: { 'Retry-After': '30' } })).mockResolvedValue(new Response(null, { status: 200 }))
    const request = createRateLimitedFetch(fetchMock)
    const response = await request('https://api.example.test/habits', { method: 'POST' })
    const error = normalizeApiError({ success: false, error: { code: 'RATE_LIMIT_EXCEEDED', requestId: 'request-1' } }, response)
    expect(error.requestId).toBe('request-1')
    expect(getUserFacingError(error, 'failed')).toContain('Too many requests')
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

it.each([null, '', 'invalid', '-1', '1.5', '9'.repeat(400)])('uses a finite cooldown for missing or invalid header %s', async (header) => {
  vi.useFakeTimers()
  try {
    const network = vi.fn<typeof fetch>().mockResolvedValueOnce(new Response(null, { status: 429, headers: header === null ? {} : { 'Retry-After': header } })).mockResolvedValue(new Response(null))
    const request = createRateLimitedFetch(network)
    const now = Date.now()
    const response = await request('https://api.test/habits', { method: 'POST' })
    const error = normalizeApiError({ success: false, error: { status: 429, code: 'RATE_LIMIT_EXCEEDED', errors: [], requestId: 'r-1', message: 'Too many requests.', path: '/habits' } }, response)
    expect(error).toMatchObject({ code: 'RATE_LIMIT_EXCEEDED', requestId: 'r-1', retryAt: now + 30_000 })
    expect(getRetryDeadline(header, now)).toBe(now + 30_000)
    await vi.advanceTimersByTimeAsync(29_999)
    await expect(request('https://api.test/entries')).rejects.toMatchObject({ status: 429 })
    await vi.advanceTimersByTimeAsync(1)
    expect(network).toHaveBeenCalledTimes(1)
    await request('https://api.test/entries')
    expect(network).toHaveBeenCalledTimes(2)
  } finally { vi.useRealTimers() }
})

it.each([400, 401, 403, 409, 500])('does not retry or rate limit HTTP %s', async (status) => {
  const network = vi.fn<typeof fetch>().mockResolvedValue(new Response(null, { status }))
  const request = createRateLimitedFetch(network)
  await request('https://api.test/habits', { method: 'POST' })
  expect(network).toHaveBeenCalledTimes(1)
  await request('https://api.test/entries')
  expect(network).toHaveBeenCalledTimes(2)
})

it('accepts all HTTP-date wire formats and treats an elapsed date as immediately eligible', () => {
  const now = Date.parse('2026-11-06T00:00:00Z')
  expect(parseRetryAfter('Friday, 06-Nov-26 00:00:30 GMT', now)).toBe(now + 30000)
  expect(parseRetryAfter('Fri Nov  6 00:00:30 2026', now)).toBe(now + 30000)
  expect(parseRetryAfter('Fri, 06 Nov 2026 00:00:00 GMT', now + 1)).toBe(now + 1)
})
