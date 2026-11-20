import type { RedirectLoginOptions } from '@auth0/auth0-react'
import { getLocale } from '../i18n/index.ts'

const appPaths = new Set(['/dashboard', '/today', '/habits', '/entries', '/stats', '/profile', '/search'])
/** Only known application routes may be restored after authentication. */
export function safeReturnTo(value: unknown): string {
  if (typeof value !== 'string' || !value.startsWith('/') || value.startsWith('//') || value.includes('\\') || [...value].some((character) => character.charCodeAt(0) <= 32)) return '/dashboard'
  try {
    const url = new URL(value, 'https://moodly.invalid')
    if (url.origin !== 'https://moodly.invalid' || !appPaths.has(url.pathname)) return '/dashboard'
    return url.pathname + url.search + url.hash
  } catch { return '/dashboard' }
}

export function loginOptions(mode: 'signin' | 'signup', returnTo: unknown = '/dashboard'): RedirectLoginOptions {
  return {
    appState: { returnTo: safeReturnTo(returnTo) },
    authorizationParams: { ui_locales: getLocale(), ...(mode === 'signup' ? { screen_hint: 'signup' } : {}) },
  }
}
