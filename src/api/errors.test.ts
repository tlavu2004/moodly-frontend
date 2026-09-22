import { ApiRequestError, normalizeApiError } from './errors.ts'

describe('normalizeApiError', () => {
  it('preserves backend envelope metadata and field errors', () => {
    const normalized = normalizeApiError({
      success: false,
      timestamp: '2026-09-22T01:02:03Z',
      error: {
        status: 400,
        code: 'VALIDATION_FAILED',
        message: 'Please fix the highlighted fields.',
        path: '/habits',
        errors: [{ field: 'name', message: 'Name is required.' }],
      },
    }, new Response(null, { status: 400 }))

    expect(normalized).toBeInstanceOf(ApiRequestError)
    expect(normalized).toMatchObject({
      message: 'Please fix the highlighted fields.',
      status: 400,
      code: 'VALIDATION_FAILED',
      path: '/habits',
      timestamp: '2026-09-22T01:02:03Z',
      fieldErrors: [{ field: 'name', message: 'Name is required.' }],
    })
  })

  it('normalizes a network error without inventing response metadata', () => {
    const normalized = normalizeApiError(new TypeError('Failed to fetch'))

    expect(normalized).toMatchObject({
      message: 'Failed to fetch',
      status: null,
      code: null,
      timestamp: null,
      fieldErrors: [],
    })
  })
})
