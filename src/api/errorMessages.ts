import { ApiRequestError } from './errors.ts'

export function getUserFacingError(error: unknown, fallback: string): string {
  if (!(error instanceof ApiRequestError)) {
    return error instanceof Error && error.message ? error.message : fallback
  }
  if (error.status === 400 && error.message) return error.message
  if (error.status === 401) return 'Your session has expired. Please sign in again.'
  if (error.status === 403) return 'You do not have permission to perform this action.'
  if (error.status === null) return 'Unable to reach Moodly. Check your connection and try again.'
  if (error.status >= 500) return 'Moodly is having trouble right now. Please try again shortly.'
  return fallback
}
