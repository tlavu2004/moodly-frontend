import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { useAuth0 } from '@auth0/auth0-react'
import { vi } from 'vitest'
import App from './App.tsx'

vi.mock('@auth0/auth0-react', () => ({ useAuth0: vi.fn() }))
vi.mock('./features/auth/pages/AuthWelcomePage.tsx', () => ({ AuthWelcomePage: ({ mode }: { mode: string }) => <h1>Public {mode}</h1> }))
vi.mock('./features/dashboard/pages/DashboardPage.tsx', () => ({ DashboardPage: () => <h1>Dashboard page</h1> }))
vi.mock('./features/habits/pages/HabitsPage.tsx', () => ({ HabitsPage: () => <h1>Habits page</h1> }))
vi.mock('./features/entries/pages/EntriesPage.tsx', () => ({ EntriesPage: () => <h1>Entries page</h1> }))
vi.mock('./features/entries/pages/TodayPage.tsx', () => ({ TodayPage: () => <h1>Today page</h1> }))
vi.mock('./features/stats/pages/StatsPage.tsx', () => ({ StatsPage: () => <h1>Insights page</h1> }))
vi.mock('./features/profile/pages/ProfilePage.tsx', () => ({ ProfilePage: () => <h1>Profile page</h1> }))
vi.mock('./features/search/pages/SearchPage.tsx', () => ({ SearchPage: () => <h1>Search page</h1> }))

beforeEach(() => vi.mocked(useAuth0).mockReturnValue({ isAuthenticated: false } as ReturnType<typeof useAuth0>))
describe('application routes', () => {
  it('renders the public landing route without authentication', async () => {
    render(<MemoryRouter initialEntries={['/']}><App /></MemoryRouter>)
    expect(await screen.findByRole('link', { name: 'Start your journey' })).toHaveAttribute('href', '/signup')
    expect(screen.getByRole('link', { name: 'Sign in' })).toHaveAttribute('href', '/login')
    expect(screen.queryByRole('navigation', { name: 'Primary navigation' })).not.toBeInTheDocument()
  })
  it('offers dashboard access and logout on the landing page for an existing session', async () => {
    const logout = vi.fn<ReturnType<typeof useAuth0>['logout']>()
    vi.mocked(useAuth0).mockReturnValue({ isAuthenticated: true, logout } as unknown as ReturnType<typeof useAuth0>)
    render(<MemoryRouter><App /></MemoryRouter>)

    expect(await screen.findByRole('link', { name: 'Go to your dashboard' })).toHaveAttribute('href', '/dashboard')
    expect(screen.queryByRole('link', { name: 'Sign in' })).not.toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Log out' }))
    expect(logout).toHaveBeenCalledWith({ logoutParams: { returnTo: window.location.origin } })
  })
  it('shows the public introduction for a protected route', async () => {
    render(<MemoryRouter initialEntries={['/dashboard']}><App /></MemoryRouter>)
    expect(await screen.findByRole('heading', { name: 'Public signin' })).toBeInTheDocument()
    expect(screen.queryByRole('navigation', { name: 'Primary navigation' })).not.toBeInTheDocument()
  })
  it.each([
    ['/dashboard', 'Dashboard page'],
    ['/habits', 'Habits page'],
    ['/entries', 'Entries page'],
    ['/today', 'Today page'],
    ['/stats', 'Insights page'],
    ['/profile', 'Profile page'],
    ['/search', 'Search page'],
  ])('renders %s inside the application shell for an existing session', async (path, heading) => {
    vi.mocked(useAuth0).mockReturnValue({ isAuthenticated: true } as ReturnType<typeof useAuth0>)
    render(<MemoryRouter initialEntries={[path]}><App /></MemoryRouter>)
    expect(await screen.findByRole('heading', { name: heading })).toBeInTheDocument()
    expect(screen.getByRole('navigation', { name: 'Primary navigation' })).toBeInTheDocument()
  })
  it.each([['/login', 'signin'], ['/signup', 'signup']])('exposes %s as a public route', async (path, mode) => {
    render(<MemoryRouter initialEntries={[path]}><App /></MemoryRouter>)
    expect(await screen.findByRole('heading', { name: `Public ${mode}` })).toBeInTheDocument()
  })
  it('renders the intentional catch-all route', async () => {
    render(<MemoryRouter initialEntries={['/missing-route']}><App /></MemoryRouter>)
    expect(await screen.findByRole('heading', { name: 'Page not found' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Go to dashboard' })).toHaveAttribute('href', '/dashboard')
  })
})
