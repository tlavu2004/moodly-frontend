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
})
