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
  }: {
    message: string
    status?: number | null
    error?: ApiError
    timestamp?: string | null
  }) {
    super(message)
    this.name = 'ApiRequestError'
    this.code = error?.code ?? null
    this.fieldErrors = error?.errors ?? []
    this.path = error?.path ?? null
    this.status = status ?? error?.status ?? null
    this.timestamp = timestamp
  }
}

/** Converts generated-client failures into a stable error type for features. */
export function normalizeApiError(error: unknown, response?: Response): ApiRequestError {
  const status = response?.status ?? null

  if (isApiErrorEnvelope(error)) {
    return new ApiRequestError({
      error: error.error,
      message: error.error?.message ?? `API request failed (${status ?? 'network'}).`,
      status,
      timestamp: error.timestamp ?? null,
    })
  }

  return new ApiRequestError({
    message: getErrorMessage(error, `API request failed (${status ?? 'network'}).`),
    status,
  })
}
