import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { vi } from 'vitest'
import { useTodayEntry } from '../hooks/useTodayEntry.ts'
import { TodayPage } from './TodayPage.tsx'

vi.mock('../hooks/useTodayEntry.ts', () => ({ useTodayEntry: vi.fn() }))

const updateMood = vi.fn()
const toggleHabit = vi.fn()
const habit = { id: 'habit-1', userId: 'user-1', name: 'Walk', targetFrequency: 'DAILY' as const, active: true, version: 0 }
const entry = {
  id: 'entry-1', userId: 'user-1', date: '2026-09-22', createdAt: '', updatedAt: '',
  mood: { score: 4, tags: ['Calm'], note: 'A good day' }, habits: [{ habitId: 'habit-1', done: true }],
}

describe('TodayPage', () => {
  beforeEach(() => {
    updateMood.mockReset()
    toggleHabit.mockReset()
    vi.mocked(useTodayEntry).mockReturnValue({ entry: null, habits: [habit], isLoading: false, error: null, updateMood, toggleHabit })
  })

  it('hydrates the current mood, tags, and note', async () => {
    vi.mocked(useTodayEntry).mockReturnValue({ entry, habits: [habit], isLoading: false, error: null, updateMood, toggleHabit })
    render(<TodayPage />)
    await waitFor(() => expect(screen.getByRole('button', { name: /Good/ })).toHaveAttribute('aria-pressed', 'true'))
    expect(screen.getByRole('button', { name: 'Calm' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByLabelText(/A note to yourself/)).toHaveValue('A good day')
  })

  it('requires a score and submits only scores from the offered 1–5 controls', async () => {
    const user = userEvent.setup()
    render(<TodayPage />)
    await user.click(screen.getByRole('button', { name: /Save check-in/ }))
    expect(screen.getByRole('status')).toHaveTextContent('Choose how you feel first.')
    await user.click(screen.getByRole('button', { name: /Great/ }))
    await user.click(screen.getByRole('button', { name: 'Grateful' }))
    await user.type(screen.getByLabelText(/A note to yourself/), '  Thankful  ')
    await user.click(screen.getByRole('button', { name: /Save check-in/ }))
    expect(updateMood).toHaveBeenCalledWith({ score: 5, note: 'Thankful', tags: ['Grateful'] })
  })

  it('selects and removes mood tags', async () => {
    const user = userEvent.setup()
    render(<TodayPage />)
    const calm = screen.getByRole('button', { name: 'Calm' })

    await user.click(calm)
    expect(calm).toHaveAttribute('aria-pressed', 'true')
    await user.click(calm)
    expect(calm).toHaveAttribute('aria-pressed', 'false')
  })

  it('surfaces mood-save and habit-toggle failures', async () => {
    updateMood.mockRejectedValue(new Error('Mood save failed'))
    toggleHabit.mockRejectedValue(new Error('Habit update failed'))
    const user = userEvent.setup()
    render(<TodayPage />)
    await user.click(screen.getByRole('button', { name: /Okay/ }))
    await user.click(screen.getByRole('button', { name: /Save check-in/ }))
    expect(await screen.findByRole('status')).toHaveTextContent('Mood save failed')
    await user.click(screen.getByRole('button', { name: /Walk/ }))
    expect(await screen.findByText('Habit update failed')).toBeInTheDocument()
  })

  it('toggles a habit successfully', async () => {
    const user = userEvent.setup()
    render(<TodayPage />)

    await user.click(screen.getByRole('button', { name: /Walk/ }))

    expect(toggleHabit).toHaveBeenCalledWith('habit-1', true)
    expect(await screen.findByText('Habit completed—nice work.')).toBeInTheDocument()
  })

  it('locks repeated mood mutations while saving', async () => {
    updateMood.mockReturnValue(new Promise(() => undefined))
    const user = userEvent.setup()
    render(<TodayPage />)
    await user.click(screen.getByRole('button', { name: /Good/ }))
    await user.click(screen.getByRole('button', { name: /Save check-in/ }))
    expect(screen.getByRole('button', { name: /Saving/ })).toBeDisabled()
    expect(updateMood).toHaveBeenCalledOnce()
  })
})
