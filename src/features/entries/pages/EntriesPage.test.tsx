import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { vi } from 'vitest'
import { useEntries } from '../hooks/useEntries.ts'
import { EntriesPage } from './EntriesPage.tsx'

vi.mock('../hooks/useEntries.ts', () => ({ useEntries: vi.fn() }))

describe('EntriesPage', () => {
  beforeEach(() => vi.mocked(useEntries).mockReturnValue({ reload: vi.fn(), retryAt: null, habits: [], habitError: null, reloadHabits: vi.fn(), habitRetryAt: null, entries: [], totalElements: 1, totalPages: 1, isLoading: false, error: null }))

  it('uses from/to URL parameters and prevents future dates', () => {
    render(<MemoryRouter initialEntries={['/entries?from=2026-09-01&to=2026-09-20']}><EntriesPage /></MemoryRouter>)
    expect(useEntries).toHaveBeenCalledWith('2026-09-01', '2026-09-20', 0)
    const inputs = screen.getAllByDisplayValue(/2026-09-/)
    expect(inputs[0]).toHaveAttribute('max', '2026-09-20')
    expect(inputs[1]).toHaveAttribute('max')
  })

  it('renders an entry that contains habit logs without a mood', () => {
    vi.mocked(useEntries).mockReturnValue({ reload: vi.fn(), retryAt: null, habits: [{ id: 'habit-1', userId: 'user-1', name: 'Renamed reading', icon: 'book', active: false, version: 2, targetFrequency: 'DAILY' }], habitError: null, reloadHabits: vi.fn(), habitRetryAt: null,
      entries: [{ id: 'entry-1', userId: 'user-1', date: '2026-09-20', habits: [{ habitId: 'habit-1', done: true, note: 'One page' }, { habitId: 'missing', done: false }], createdAt: '', updatedAt: '' }],
      totalElements: 1, totalPages: 1, isLoading: false,
      error: null,
    })
    render(<MemoryRouter><EntriesPage /></MemoryRouter>)
    expect(screen.getByText('Habit check-in')).toBeInTheDocument()
    expect(screen.getByText('1 habits complete')).toBeInTheDocument()
    expect(screen.getByText('Renamed reading')).toBeInTheDocument()
    expect(screen.getByText('📖')).toBeInTheDocument()
    expect(screen.getByText('Completed')).toBeInTheDocument()
    expect(screen.getByText('One page')).toBeInTheDocument()
    expect(screen.getByText('Unknown habit')).toBeInTheDocument()
    expect(screen.getByText('Incomplete')).toBeInTheDocument()
  })
})
