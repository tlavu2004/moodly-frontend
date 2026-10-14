import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { vi } from 'vitest'
import { useHabits } from '../hooks/useHabits.ts'
import { HabitsPage } from './HabitsPage.tsx'

vi.mock('../hooks/useHabits.ts', () => ({ useHabits: vi.fn() }))

const add = vi.fn()
const reload = vi.fn()
const habit = { id: 'habit-1', userId: 'user-1', name: 'Morning walk', icon: '🏃', targetFrequency: 'DAILY' as const, active: true, version: 0 }
const state = (overrides: Record<string, unknown> = {}) => ({
  habits: [], streaks: {}, isLoading: false, error: null, reload, add, ...overrides,
})

describe('HabitsPage', () => {
  beforeEach(() => {
    add.mockReset()
    reload.mockReset()
    vi.mocked(useHabits).mockReturnValue(state())
  })

  it('renders loading, error with retry, and empty states', async () => {
    vi.mocked(useHabits).mockReturnValue(state({ isLoading: true }))
    const { rerender } = render(<HabitsPage />)
    expect(screen.getByLabelText('Loading habits')).toBeInTheDocument()
    vi.mocked(useHabits).mockReturnValue(state({ error: 'Network failed' }))
    rerender(<HabitsPage />)
    expect(screen.getByRole('alert')).toHaveTextContent('Network failed')
    await userEvent.setup().click(screen.getByRole('button', { name: 'Try again' }))
    expect(reload).toHaveBeenCalledOnce()
    vi.mocked(useHabits).mockReturnValue(state())
    rerender(<HabitsPage />)
    expect(screen.getByText('Plant your first tiny habit')).toBeInTheDocument()
  })

  it('renders habits and maps streaks by habit ID', () => {
    vi.mocked(useHabits).mockReturnValue(state({ habits: [habit], streaks: { 'habit-1': 6 } }))
    render(<HabitsPage />)
    expect(screen.getByText('Morning walk')).toBeInTheDocument()
    expect(screen.getByText('6-day streak')).toBeInTheDocument()
  })

  it('validates a blank name and submits trimmed values', async () => {
    const user = userEvent.setup()
    render(<HabitsPage />)
    await user.click(screen.getByRole('button', { name: 'New habit' }))
    await user.click(screen.getByRole('button', { name: 'Create habit' }))
    expect(screen.getByRole('alert')).toHaveTextContent('Give your habit a name.')
    await user.type(screen.getByLabelText('Habit name'), '  Read  ')
    await user.click(screen.getByRole('button', { name: 'Use 📖 icon' }))
    await user.click(screen.getByRole('button', { name: 'Create habit' }))
    expect(add).toHaveBeenCalledWith({ name: 'Read', icon: '📖', targetFrequency: 'DAILY' })
  })

  it('moves focus into the create form and restores it on cancel', async () => {
    const user = userEvent.setup()
    render(<HabitsPage />)
    const trigger = screen.getByRole('button', { name: 'New habit' })
    await user.click(trigger)
    expect(screen.getByLabelText('Habit name')).toHaveFocus()
    await user.click(screen.getByRole('button', { name: 'Cancel' }))
    await new Promise(requestAnimationFrame)
    expect(trigger).toHaveFocus()
  })

  it('shows API validation errors while creating', async () => {
    add.mockRejectedValue(new Error('A habit with this name already exists.'))
    const user = userEvent.setup()
    render(<HabitsPage />)
    await user.click(screen.getByRole('button', { name: 'New habit' }))
    await user.type(screen.getByLabelText('Habit name'), 'Walk')
    await user.click(screen.getByRole('button', { name: 'Create habit' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('already exists')
  })
})
