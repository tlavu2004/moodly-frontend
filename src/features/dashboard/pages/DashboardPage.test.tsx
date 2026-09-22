import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useAuth0 } from '@auth0/auth0-react'
import { MemoryRouter } from 'react-router'
import { vi } from 'vitest'
import { useDashboard } from '../hooks/useDashboard.ts'
import { DashboardPage } from './DashboardPage.tsx'

vi.mock('@auth0/auth0-react', () => ({ useAuth0: vi.fn() }))
vi.mock('../hooks/useDashboard.ts', () => ({ useDashboard: vi.fn() }))

const reload = vi.fn()
const dashboard = (completionRatio: number, totalHabitCount = 4) => ({
  activeHabits: [],
  completedHabitCount: Math.round(completionRatio * totalHabitCount),
  totalHabitCount,
  completionRatio,
  weeklyMood: { averageScore: 4.25, entryCount: 3 },
  bestCurrentStreak: 7,
})

function renderPage() {
  return render(<MemoryRouter><DashboardPage /></MemoryRouter>)
}

describe('DashboardPage', () => {
  beforeEach(() => {
    vi.mocked(useAuth0).mockReturnValue({ user: { given_name: 'Mai' } } as unknown as ReturnType<typeof useAuth0>)
    vi.mocked(useDashboard).mockReturnValue({ data: null, isLoading: true, error: null, reload })
    reload.mockReset()
  })

  it('renders loading and supports retry after an error', async () => {
    const { rerender } = renderPage()
    expect(screen.getByLabelText('Loading dashboard')).toBeInTheDocument()
    vi.mocked(useDashboard).mockReturnValue({ data: null, isLoading: false, error: 'Server unavailable', reload })
    rerender(<MemoryRouter><DashboardPage /></MemoryRouter>)
    expect(screen.getByRole('alert')).toHaveTextContent('Server unavailable')
    await userEvent.setup().click(screen.getByRole('button', { name: 'Try again' }))
    expect(reload).toHaveBeenCalledOnce()
  })

  it('renders no-habit and no-mood states at zero completion', () => {
    vi.mocked(useDashboard).mockReturnValue({ data: dashboard(0, 0), isLoading: false, error: null, reload })
    renderPage()
    expect(screen.getByText('Start with one small ritual')).toBeInTheDocument()
    expect(screen.getByText('0%')).toBeInTheDocument()
    expect(screen.getByText('Not checked in yet')).toBeInTheDocument()
    expect(screen.getByText('Create a habit')).toBeInTheDocument()
  })

  it.each([[0.5, '50%'], [1, '100%']])('renders completion ratio %s', (ratio, expected) => {
    vi.mocked(useDashboard).mockReturnValue({ data: dashboard(ratio), isLoading: false, error: null, reload })
    renderPage()
    expect(screen.getByText(expected)).toBeInTheDocument()
  })

  it('renders best streak and weekly mood summary', () => {
    vi.mocked(useDashboard).mockReturnValue({ data: dashboard(0.5), isLoading: false, error: null, reload })
    renderPage()
    expect(screen.getByText('7 days')).toBeInTheDocument()
    expect(screen.getByText('4.3 / 5')).toBeInTheDocument()
    expect(screen.getByText('3')).toBeInTheDocument()
  })
})
