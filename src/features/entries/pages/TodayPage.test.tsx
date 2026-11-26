import { ApiRequestError } from '../../../api/errors.ts'
import { toMoodlyDateKey } from '../../../utils/date.ts'
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
    vi.mocked(useTodayEntry).mockReturnValue({ reload: vi.fn(), retryAt: null, refresh: vi.fn(), entry: null, habits: [habit], isLoading: false, error: null, updateMood, toggleHabit })
  })

  it('hydrates the current mood, tags, and note', async () => {
    vi.mocked(useTodayEntry).mockReturnValue({ reload: vi.fn(), retryAt: null, refresh: vi.fn(), entry, habits: [habit], isLoading: false, error: null, updateMood, toggleHabit })
    render(<TodayPage />)
    await waitFor(() => expect(screen.getByRole('button', { name: /Good/ })).toHaveAttribute('aria-pressed', 'true'))
    expect(screen.getByRole('button', { name: 'Calm' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: /Walk/ })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByLabelText(/A note to yourself/)).toHaveValue('A good day')
  })

  it('requires a score and submits only scores from the offered 1–5 controls', async () => {
    const user = userEvent.setup()
    render(<TodayPage />)
    await user.click(screen.getByRole('button', { name: /Save check-in/ }))
    expect(screen.getByLabelText('Check-in update')).toHaveAttribute('aria-live', 'assertive')
    expect(screen.getByLabelText('Check-in update')).toHaveTextContent('Choose how you feel first.')
    await user.click(screen.getByRole('button', { name: /Great/ }))
    await user.click(screen.getByRole('button', { name: 'Grateful' }))
    await user.type(screen.getByLabelText(/A note to yourself/), '  Thankful  ')
    await user.click(screen.getByRole('button', { name: /Save check-in/ }))
    expect(updateMood).toHaveBeenCalledWith({ score: 5, note: 'Thankful', tags: ['Grateful'] })
    expect(screen.getByLabelText('Check-in update')).toHaveAttribute('aria-live', 'polite')
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
    expect(await screen.findByText('Mood save failed')).toBeInTheDocument()
    expect(screen.getByLabelText('Check-in update')).toHaveAttribute('aria-live', 'assertive')
    await user.click(screen.getByRole('button', { name: /Walk/ }))
    expect(await screen.findByText('Habit update failed')).toBeInTheDocument()
  })

  it('toggles a habit successfully', async () => {
    const user = userEvent.setup()
    render(<TodayPage />)

    const habitButton = screen.getByRole('button', { name: /Walk/ })
    expect(habitButton).toHaveAttribute('aria-pressed', 'false')
    await user.click(habitButton)

    expect(toggleHabit).toHaveBeenCalledWith('habit-1', true)
    expect(await screen.findByText('Habit completed—nice work.')).toBeInTheDocument()
    expect(screen.getByLabelText('Habit update')).toHaveAttribute('aria-live', 'polite')
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

it('opens the note editor via the keyboard and saves with an explicit completion state', async () => {
  toggleHabit.mockReset()
  vi.mocked(useTodayEntry).mockReturnValue({ reload: vi.fn(), retryAt: null, refresh: vi.fn(), entry: null, habits: [habit], isLoading: false, error: null, updateMood, toggleHabit })
  const user = userEvent.setup()
  render(<TodayPage />)
  const trigger = screen.getByRole('button', { name: 'Add habit note' })
  trigger.focus()
  await user.keyboard('{Enter}')
  const field = screen.getByRole('textbox', { name: 'Habit note' })
  expect(field).toHaveFocus()
  await user.type(field, '  One page  ')
  await user.click(screen.getByRole('button', { name: 'Save note' }))
  expect(toggleHabit).toHaveBeenCalledWith('habit-1', false, 'One page')
  expect(await screen.findByText('Habit note saved.')).toBeInTheDocument()
  await new Promise(requestAnimationFrame)
  expect(trigger).toHaveFocus()
})

it('keeps a mood draft when server values differ after a timeout', async () => {
  const today = { ...entry, date: toMoodlyDateKey(new Date()) }
  const refresh = vi.fn().mockResolvedValue({ entry: today, habits: [habit] })
  const updateMood = vi.fn().mockRejectedValue(new ApiRequestError({ message: 'Timed out' }))
  vi.mocked(useTodayEntry).mockReturnValue({ reload: vi.fn(), retryAt: null, refresh, entry: today, habits: [habit], isLoading: false, error: null, updateMood, toggleHabit })
  const user = userEvent.setup()
  render(<TodayPage />)
  const draft = screen.getByLabelText(/A note to yourself/)
  await user.clear(draft)
  await user.type(draft, 'Unconfirmed draft')
  await user.click(screen.getByRole('button', { name: 'Save check-in' }))
  expect(screen.getByRole('button', { name: 'Save check-in' })).toBeDisabled()
  await user.click(screen.getByRole('button', { name: 'Check saved state' }))
  expect(await screen.findByText('The server has different values. Review the saved data before saving again.')).toBeVisible()
  expect(screen.getByText('A good day')).toBeVisible()
  expect(draft).toHaveValue('Unconfirmed draft')
  expect(screen.getByRole('button', { name: 'Save check-in' })).toBeEnabled()
  expect(updateMood).toHaveBeenCalledOnce()
})

it('detects a saved habit note after a lost response without repeating PATCH', async () => {
  const today = { ...entry, date: toMoodlyDateKey(new Date()) }
  const latest = { ...today, habits: [{ habitId: habit.id, done: true, note: 'Already saved' }] }
  const refresh = vi.fn().mockResolvedValue({ entry: latest, habits: [habit] })
  const toggleHabit = vi.fn().mockRejectedValue(new ApiRequestError({ message: 'Offline' }))
  vi.mocked(useTodayEntry).mockReturnValue({ reload: vi.fn(), retryAt: null, refresh, entry: today, habits: [habit], isLoading: false, error: null, updateMood, toggleHabit })
  const user = userEvent.setup()
  render(<TodayPage />)
  await user.click(screen.getByRole('button', { name: 'Add habit note' }))
  await user.type(screen.getByRole('textbox', { name: 'Habit note' }), 'Already saved')
  await user.click(screen.getByRole('button', { name: 'Save note' }))
  expect(screen.getByRole('textbox', { name: 'Habit note' })).toHaveValue('Already saved')
  await user.click(screen.getByRole('button', { name: 'Check saved state' }))
  expect(await screen.findByText('The submitted values are already on the server.')).toBeVisible()
  expect(screen.queryByRole('textbox', { name: 'Habit note' })).not.toBeInTheDocument()
  expect(toggleHabit).toHaveBeenCalledOnce()
})
