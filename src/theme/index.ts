import { useSyncExternalStore } from 'react'

export type ThemePreference = 'light' | 'dark' | 'system'
const listeners = new Set<() => void>()
function readPreference(): ThemePreference {
  try {
    const saved = localStorage.getItem('moodly.theme')
    if (saved === 'light' || saved === 'dark') return saved
  } catch { /* Storage is optional. */ }
  return 'system'
}
let preference = readPreference()
const media = window.matchMedia?.('(prefers-color-scheme: dark)')
function applyTheme() {
  const resolved = preference === 'system' ? (media?.matches ? 'dark' : 'light') : preference
  document.documentElement.dataset.theme = resolved
  document.documentElement.style.colorScheme = resolved
}
export function getThemePreference() { return preference }
export function setThemePreference(next: ThemePreference) {
  preference = next
  try { localStorage.setItem('moodly.theme', next) } catch { /* Keep this session's preference. */ }
  applyTheme()
  listeners.forEach((listener) => listener())
}
function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => { listeners.delete(listener) }
}
export function useThemePreference() { return useSyncExternalStore(subscribe, getThemePreference) }
media?.addEventListener('change', applyTheme)
window.addEventListener('storage', (event) => {
  if (event.key !== 'moodly.theme' && event.key !== null) return
  preference = readPreference()
  applyTheme()
  listeners.forEach((listener) => listener())
})
applyTheme()
