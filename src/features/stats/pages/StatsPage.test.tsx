import { render, screen, within } from '@testing-library/react'
import { vi } from 'vitest'
import { useStats } from '../hooks/useStats.ts'
import { StatsPage } from './StatsPage.tsx'

vi.mock('../hooks/useStats.ts', () => ({ useStats: vi.fn() }))

const habit = { id: 'habit-1', userId: 'user-1', name: 'Morning walk', targetFrequency: 'DAILY' as const, active: true, version: 0 }
const state = (overrides: Record<string, unknown> = {}) => ({ trends: [], missed: [], habits: [], isLoading: false, error: null, ...overrides })

describe('StatsPage', () => {
  it('renders the empty state without data', () => {
    vi.mocked(useStats).mockReturnValue(state())
    render(<StatsPage />)
    expect(screen.getByText('Your patterns will bloom here')).toBeInTheDocument()
  })

  it('calculates a weighted mood average and entry count', () => {
    vi.mocked(useStats).mockReturnValue(state({
      trends: [
        { date: '2026-09-21', averageScore: 2, entryCount: 1 },
        { date: '2026-09-22', averageScore: 5, entryCount: 3 },
      ],
      habits: [habit],
    }))
    render(<StatsPage />)
    expect(screen.getByText('4.3')).toBeInTheDocument()
    expect(screen.getByText('4')).toBeInTheDocument()
    const table = screen.getByRole('table', { name: 'Daily mood trend for this week' })
    expect(within(table).getByRole('row', { name: '2026-09-21 2.0 1' })).toBeInTheDocument()
    expect(within(table).getByRole('row', { name: '2026-09-22 5.0 3' })).toBeInTheDocument()
  })

  it('maps missed habit IDs to names and safely falls back for unknown IDs', () => {
    vi.mocked(useStats).mockReturnValue(state({
      missed: [{ habitId: 'habit-1', missedCount: 3 }, { habitId: 'unknown', missedCount: 1 }],
      habits: [habit],
    }))
    render(<StatsPage />)
    expect(screen.getByText('1. Morning walk')).toBeInTheDocument()
    expect(screen.getByText('2. Habit')).toBeInTheDocument()
  })

  it('renders a one-point chart safely', () => {
    vi.mocked(useStats).mockReturnValue(state({ trends: [{ date: '2026-09-22', averageScore: 3, entryCount: 1 }] }))
    render(<StatsPage />)
    expect(within(screen.getByRole('table', { name: 'Daily mood trend for this week' })).getByText('3.0')).toBeInTheDocument()
  })
})
