import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { getThemePreference, setThemePreference } from './index.ts'
import { ThemeSelect } from './ThemeSelect.tsx'

const media = vi.hoisted(() => {
  const listeners = new Set<() => void>()
  const query = { matches: false, addEventListener: (_: string, listener: () => void) => listeners.add(listener) }
  Object.defineProperty(window, 'matchMedia', { configurable: true, value: () => query })
  return { query, change: (dark: boolean) => { query.matches = dark; listeners.forEach((listener) => listener()) } }
})
afterEach(() => { vi.restoreAllMocks(); media.change(false); act(() => setThemePreference('system')) })

describe('theme preferences', () => {
  it('follows OS changes only when system is selected', () => {
    setThemePreference('system')
    media.change(true)
    expect(document.documentElement).toHaveAttribute('data-theme', 'dark')
    setThemePreference('light')
    media.change(false)
    media.change(true)
    expect(document.documentElement).toHaveAttribute('data-theme', 'light')
    expect(document.documentElement.style.colorScheme).toBe('light')
    setThemePreference('system')
    expect(document.documentElement).toHaveAttribute('data-theme', 'dark')
  })

  it('exposes an accessible control and persists an explicit preference', async () => {
    render(<ThemeSelect />)
    await userEvent.setup().selectOptions(screen.getByRole('combobox', { name: 'Theme' }), 'dark')
    expect(getThemePreference()).toBe('dark')
    expect(localStorage.getItem('moodly.theme')).toBe('dark')
    expect(document.documentElement.style.colorScheme).toBe('dark')
  })

  it('keeps working with blocked storage', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('blocked') })
    setThemePreference('dark')
    expect(document.documentElement).toHaveAttribute('data-theme', 'dark')
  })

  it('synchronizes other tabs and handles cleared or invalid preferences', () => {
    render(<ThemeSelect />)
    localStorage.setItem('moodly.theme', 'dark')
    act(() => window.dispatchEvent(new StorageEvent('storage', { key: 'moodly.theme' })))
    expect(screen.getByRole('combobox', { name: 'Theme' })).toHaveValue('dark')
    localStorage.setItem('moodly.theme', 'invalid')
    act(() => window.dispatchEvent(new StorageEvent('storage', { key: 'moodly.theme' })))
    expect(getThemePreference()).toBe('system')
    localStorage.clear()
    act(() => window.dispatchEvent(new StorageEvent('storage', { key: null })))
    expect(document.documentElement).toHaveAttribute('data-theme', 'light')
  })
})
