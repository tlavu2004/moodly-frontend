import { ApiRequestError } from './errors.ts'

const moduleMessages: Record<string, { status: number; message: string }> = {
  HABIT_NOT_FOUND: { status: 404, message: 'This habit is no longer available. Refresh your habits.' },
  HABIT_CONFLICT: { status: 409, message: 'This habit changed in another request. Refresh before trying again.' },
  HABIT_ARCHIVED: { status: 409, message: 'This habit is archived and cannot receive new logs.' },
  AVATAR_CONFLICT: { status: 409, message: 'Your avatar changed in another request. Refresh before uploading again.' },
}

export function getUserFacingError(error: unknown, fallback: string): string {
  if (!(error instanceof ApiRequestError)) {
    return error instanceof Error && error.message ? error.message : fallback
  }
  if (error.status === 429) {
    const seconds = error.retryAt === null ? null : Math.max(0, Math.ceil((error.retryAt - Date.now()) / 1000))
    return seconds ? `Too many requests. Please wait ${seconds} seconds before trying again.` : 'Too many requests. Please wait before trying again.'
  }
  if (error.status === 400 && error.message) return error.message
  if (error.status === 401) return 'Your session has expired. Please sign in again.'
  if (error.status === 403) return 'You do not have permission to perform this action.'
  if (error.status === null) return 'Unable to reach Moodly. Check your connection and try again.'
  if (error.status >= 500) return 'Moodly is having trouble right now. Please try again shortly.'
  const moduleMessage = error.code ? moduleMessages[error.code] : undefined
  if (moduleMessage?.status === error.status) return moduleMessage.message
  return fallback
}
