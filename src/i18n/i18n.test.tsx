import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { countMessage, formatDate, formatNumber, getLocale, setLocale, t } from './index.ts'
import { LanguageSelect } from './LanguageSelect.tsx'
import { TodayPage } from '../features/entries/pages/TodayPage.tsx'
import { useTodayEntry } from '../features/entries/hooks/useTodayEntry.ts'

vi.mock('../features/entries/hooks/useTodayEntry.ts', () => ({ useTodayEntry: vi.fn() }))
afterEach(() => { act(() => setLocale('en')); vi.restoreAllMocks() })

describe('localization', () => {
  it('switches accessible labels and persists the preference without losing entered text or API tag values', async () => {
    const updateMood = vi.fn().mockResolvedValue(undefined)
    vi.mocked(useTodayEntry).mockReturnValue({ entry: null, habits: [], isLoading: false, error: null, retryAt: null, reload: vi.fn(), updateMood, toggleHabit: vi.fn() })
    const user = userEvent.setup()
    render(<><LanguageSelect /><TodayPage /></>)
    await user.type(screen.getByRole('textbox'), 'My private note')
    await user.click(screen.getByRole('button', { name: /Good/ }))
    await user.click(screen.getByRole('button', { name: 'Calm' }))
    await user.selectOptions(screen.getByRole('combobox', { name: 'Language' }), 'vi')
    expect(document.documentElement).toHaveAttribute('lang', 'vi')
    expect(localStorage.getItem('moodly.locale')).toBe('vi')
    expect(screen.getByRole('textbox')).toHaveValue('My private note')
    expect(screen.getByRole('button', { name: 'Bình yên' })).toHaveAttribute('aria-pressed', 'true')
    await user.click(screen.getByRole('button', { name: /Lưu ghi nhận/ }))
    expect(updateMood).toHaveBeenCalledWith({ score: 4, note: 'My private note', tags: ['Calm'] })
    expect(await screen.findByText('Đã lưu ghi nhận. Hãy tự hào vì đã dành thời gian cho mình.')).toBeInTheDocument()
    await user.selectOptions(screen.getByRole('combobox', { name: 'Ngôn ngữ' }), 'en')
    expect(screen.getByText('Your check-in is saved. Be proud of showing up.')).toBeInTheDocument()
  })

  it('formats calendar dates and decimal/grouping separators for both locales', () => {
    setLocale('en')
    expect(formatNumber(1234.5)).toBe('1,234.5')
    expect(formatDate('2026-01-01')).toBe('Jan 1, 2026')
    expect(countMessage('{count} day', '{count} days', 1)).toBe('1 day')
    expect(countMessage('{count} day', '{count} days', 2)).toBe('2 days')
    setLocale('vi')
    expect(formatNumber(1234.5)).toBe('1.234,5')
    expect(formatDate('2026-01-01', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'Pacific/Honolulu' })).toBe('01/01/2026')
    expect(countMessage('{count} day', '{count} days', 0)).toBe('0 ngày')
    expect(formatDate('2026-02-30')).toBe('Ngày không xác định')
    expect(formatDate('invalid')).toBe('Ngày không xác định')
  })

  it('keeps unknown text and interpolated content literal, even when storage is unavailable', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('blocked') })
    setLocale('vi')
    expect(getLocale()).toBe('vi')
    expect(t('My private note')).toBe('My private note')
    expect(t('constructor')).toBe('constructor')
    expect(t('toString')).toBe('toString')
    expect(t('No moments matched “{query}”', { query: '<script>{count}</script>' })).toBe('Không có khoảnh khắc khớp với “<script>{count}</script>”')
  })
})

