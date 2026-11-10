import type { ApiError } from './openapi/types.api.ts'

type ApiErrorEnvelope = {
  error?: ApiError
  success?: boolean
  timestamp?: string
}

function isApiErrorEnvelope(value: unknown): value is ApiErrorEnvelope {
  return (
    typeof value === 'object' &&
    value !== null &&
    'success' in value &&
    typeof value.success === 'boolean'
  )
}

function getErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message) {
    return error.message
  }

  return typeof error === 'string' && error ? error : fallback
}

/**
 * A UI-facing error normalized from Moodly's API envelope or a transport
 * failure. Feature code can rely on this shape without parsing responses.
 */
export class ApiRequestError extends Error {
  readonly requestId: string | null
  readonly retryAt: number | null
  readonly code: string | null
  readonly fieldErrors: NonNullable<ApiError['errors']>
  readonly path: string | null
  readonly status: number | null
  readonly timestamp: string | null

  constructor({
    message,
    status = null,
    error,
    timestamp = null,
    retryAt = null,
  }: {
    message: string
    status?: number | null
    error?: ApiError
    retryAt?: number | null
    timestamp?: string | null
  }) {
    super(message)
    this.name = 'ApiRequestError'
    this.requestId = error?.requestId ?? null
    this.retryAt = retryAt
    this.code = error?.code ?? null
    this.fieldErrors = error?.errors ?? []
    this.path = error?.path ?? null
    this.status = status ?? error?.status ?? null
    this.timestamp = timestamp
  }
}

/** Converts generated-client failures into a stable error type for features. */
export function normalizeApiError(error: unknown, response?: Response): ApiRequestError {
  if (error instanceof ApiRequestError) return error
  const status = response?.status ?? null
  const retryAt = status === 429 ? getRetryDeadline(response?.headers.get('Retry-After') ?? null) : null

  if (isApiErrorEnvelope(error)) {
    return new ApiRequestError({
      error: error.error,
      message: error.error?.message ?? `API request failed (${status ?? 'network'}).`,
      status,
      timestamp: error.timestamp ?? null,
      retryAt,
    })
  }

  return new ApiRequestError({
    message: getErrorMessage(error, `API request failed (${status ?? 'network'}).`),
    retryAt,
    status,
  })
}

/** Parse seconds or an HTTP-date without accepting arbitrary date-like strings. */
export function parseRetryAfter(value: string | null, now = Date.now()): number | null {
  if (!value?.trim()) return null
  const text = value.trim()
  if (/^\d+$/.test(text)) {
    const deadline = now + Number(text) * 1000
    return Number.isSafeInteger(deadline) ? deadline : null
  }
  const imf = /^(Mon|Tue|Wed|Thu|Fri|Sat|Sun), \d{2} [A-Z][a-z]{2} \d{4} \d{2}:\d{2}:\d{2} GMT$/
  const rfc850 = /^(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday), \d{2}-[A-Z][a-z]{2}-\d{2} \d{2}:\d{2}:\d{2} GMT$/
  const asctime = /^(Mon|Tue|Wed|Thu|Fri|Sat|Sun) [A-Z][a-z]{2} [ \d]\d \d{2}:\d{2}:\d{2} \d{4}$/
  if (!imf.test(text) && !rfc850.test(text) && !asctime.test(text)) return null
  const deadline = Date.parse(asctime.test(text) ? text + ' GMT' : text)
  return Number.isFinite(deadline) ? Math.max(now, deadline) : null
}

/** A missing/invalid header pauses requests for a finite 30 seconds. */
export function getRetryDeadline(value: string | null, now = Date.now()): number {
  return parseRetryAfter(value, now) ?? now + 30_000
}
