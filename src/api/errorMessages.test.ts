import { ApiRequestError } from './errors.ts'
import { getUserFacingError } from './errorMessages.ts'

describe('getUserFacingError', () => {
  it.each([
    [401, 'Your session has expired'],
    [403, 'do not have permission'],
    [500, 'having trouble'],
  ])('maps HTTP %s without exposing internal details', (status, expected) => {
    expect(getUserFacingError(new ApiRequestError({ message: 'internal stack detail', status }), 'Fallback')).toContain(expected)
  })

  it('distinguishes network errors and preserves safe validation messages', () => {
    expect(getUserFacingError(new ApiRequestError({ message: 'Failed to fetch' }), 'Fallback')).toContain('Check your connection')
    expect(getUserFacingError(new ApiRequestError({ message: 'Name is required.', status: 400 }), 'Fallback')).toBe('Name is required.')
  })

  it.each([
    [404, 'HABIT_NOT_FOUND', 'no longer available'],
    [409, 'HABIT_CONFLICT', 'Refresh before'],
    [409, 'HABIT_ARCHIVED', 'archived'],
    [409, 'AVATAR_CONFLICT', 'Refresh before'],
  ])('handles %s / %s independently of message text', (status, code, expected) => {
    const error = new ApiRequestError({ message: 'unrelated wording', status, error: { code, status, message: 'Safe message', path: '/test', errors: [], requestId: 'test' } })
    expect(getUserFacingError(error, 'Fallback')).toContain(expected)
  })

  it.each(['AVATAR_CONTENT_TYPE_UNSUPPORTED', 'AVATAR_FILE_TOO_LARGE', 'AVATAR_UPLOAD_NOT_FOUND', 'AVATAR_ASSET_INVALID', 'AVATAR_VERSION_INVALID', 'HABIT_INVALID_STATUS', 'ENTRY_INVALID_RANGE', 'STATS_INVALID_PERIOD', 'SEARCH_INVALID_REQUEST'])('preserves safe 400 messages for %s', (code) => {
    expect(getUserFacingError(new ApiRequestError({ message: 'Safe validation message.', status: 400, error: { code, status: 400, message: 'Safe message', path: '/test', errors: [], requestId: 'test' } }), 'Fallback')).toBe('Safe validation message.')
  })

  it.each([404, 409, 418])('falls back safely for an unknown code at %s', (status) => {
    expect(getUserFacingError(new ApiRequestError({ message: 'HABIT_ARCHIVED', status, error: { code: 'FUTURE_CODE', status, message: 'Safe message', path: '/test', errors: [], requestId: 'test' } }), 'Fallback')).toBe('Fallback')
  })
})
