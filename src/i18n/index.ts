import { useSyncExternalStore } from 'react'
import { vi } from './vi.ts'

export type Locale = 'en' | 'vi'
const listeners = new Set<() => void>()
function initialLocale(): Locale {
  try { const saved = localStorage.getItem('moodly.locale'); if (saved === 'en' || saved === 'vi') return saved } catch { /* Storage is optional. */ }
  return navigator.language.toLowerCase().startsWith('vi') ? 'vi' : 'en'
}
let locale = initialLocale()
export function getLocale() { return locale }
export function setLocale(next: Locale) {
  locale = next
  document.documentElement.lang = next
  try { localStorage.setItem('moodly.locale', next) } catch { /* Keep the session preference. */ }
  listeners.forEach((listener) => listener())
}
export function useLocale() {
  return useSyncExternalStore((listener) => { listeners.add(listener); return () => { listeners.delete(listener) } }, getLocale)
}
/** English source messages are stable keys; unknown user/API text is never modified. */
export function t(message: string, values: Record<string, string | number> = {}): string {
  const template = locale === 'vi' && Object.hasOwn(vi, message) ? vi[message] : message
  return template.replace(/\{(\w+)\}/g, (match, key: string) => String(values[key] ?? match))
}
export function formatNumber(value: number, options?: Intl.NumberFormatOptions) {
  return new Intl.NumberFormat(locale === 'vi' ? 'vi-VN' : 'en-US', options).format(value)
}
/** API calendar dates are not instants. Parse in UTC and format in UTC to prevent date shifts. */
export function formatDate(value: string, options: Intl.DateTimeFormatOptions = { year: 'numeric', month: 'short', day: 'numeric' }) {
  const date = new Date(`${value}T12:00:00Z`)
  return !/^\d{4}-\d{2}-\d{2}$/.test(value) || Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value ? t('Unknown date') : new Intl.DateTimeFormat(locale === 'vi' ? 'vi-VN' : 'en-US', { ...options, timeZone: 'UTC' }).format(date)
}
document.documentElement.lang = locale

export function countMessage(one: string, other: string, count: number, values: Record<string, string | number> = {}) {
  const form = new Intl.PluralRules(locale).select(count) === 'one' ? one : other
  return t(form, { ...values, count: formatNumber(count) })
}
