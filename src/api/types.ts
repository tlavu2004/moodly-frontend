export type ApiError = {
  code?: string
  message?: string
  [key: string]: unknown
}

export type ApiEnvelope<T> = {
  success: boolean
  data: T | null
  error?: ApiError | null
  timestamp: string
}

export class ApiRequestError extends Error {
  readonly status: number
  readonly error: ApiError | null
  readonly timestamp: string | null

  constructor({
    message,
    status,
    error = null,
    timestamp = null,
  }: {
    message: string
    status: number
    error?: ApiError | null
    timestamp?: string | null
  }) {
    super(message)
    this.name = 'ApiRequestError'
    this.status = status
    this.error = error
    this.timestamp = timestamp
  }
}
