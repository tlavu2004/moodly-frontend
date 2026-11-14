import { afterEach, describe, expect, it } from 'vitest'
import { setLocale } from '../i18n/index.ts'
import { loginOptions, safeReturnTo } from './loginOptions.ts'

afterEach(() => setLocale('en'))
describe('authentication destinations', () => {
  it.each([undefined, null, '', 'https://evil.example', '//evil.example', '/\\evil.example', '/login', '/signup', '/unknown', '/%2f%2fevil.example', '/dashboard\n', '/dashboard/../login'])('rejects unsafe or unsupported return path %s', (value) => {
    expect(safeReturnTo(value)).toBe('/dashboard')
  })
  it('keeps a known app path, query and fragment intact', () => {
    expect(safeReturnTo('/entries?from=2026-11-01&to=2026-11-14#entry-1')).toBe('/entries?from=2026-11-01&to=2026-11-14#entry-1')
  })
  it('reads the current locale when the action starts and only hints signup for signup', () => {
    setLocale('vi')
    expect(loginOptions('signup', '/today')).toEqual({ appState: { returnTo: '/today' }, authorizationParams: { ui_locales: 'vi', screen_hint: 'signup' } })
    setLocale('en')
    expect(loginOptions('signin', '//evil.example')).toEqual({ appState: { returnTo: '/dashboard' }, authorizationParams: { ui_locales: 'en' } })
  })
})
