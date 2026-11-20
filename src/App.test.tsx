import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { useAuth0 } from '@auth0/auth0-react'
import { vi } from 'vitest'
import App from './App.tsx'

vi.mock('@auth0/auth0-react', () => ({ useAuth0: vi.fn() }))
vi.mock('./components/layout/AppShell.tsx', () => ({ AppShell: () => <div>Protected application shell</div> }))
vi.mock('./features/landing/pages/LandingPage.tsx', () => ({ LandingPage: () => <h1>Public landing</h1> }))
vi.mock('./features/not-found/pages/NotFoundPage.tsx', () => ({ NotFoundPage: () => <h1>Intentional 404</h1> }))
vi.mock('./features/auth/pages/AuthWelcomePage.tsx', () => ({ AuthWelcomePage: ({ mode }: { mode: string }) => <h1>Public {mode}</h1> }))

beforeEach(() => vi.mocked(useAuth0).mockReturnValue({ isAuthenticated: false } as ReturnType<typeof useAuth0>))
describe('application routes', () => {
  it('renders the public landing route without authentication', async () => {
    render(<MemoryRouter initialEntries={['/']}><App /></MemoryRouter>)
    expect(await screen.findByRole('heading', { name: 'Public landing' })).toBeInTheDocument()
    expect(screen.queryByText('Protected application shell')).not.toBeInTheDocument()
  })
  it('shows the public introduction for a protected route', async () => {
    render(<MemoryRouter initialEntries={['/dashboard']}><App /></MemoryRouter>)
    expect(await screen.findByRole('heading', { name: 'Public signin' })).toBeInTheDocument()
    expect(screen.queryByText('Protected application shell')).not.toBeInTheDocument()
  })
  it('renders the application shell for an existing session', () => {
    vi.mocked(useAuth0).mockReturnValue({ isAuthenticated: true } as ReturnType<typeof useAuth0>)
    render(<MemoryRouter initialEntries={['/dashboard']}><App /></MemoryRouter>)
    expect(screen.getByText('Protected application shell')).toBeInTheDocument()
  })
  it.each([['/login', 'signin'], ['/signup', 'signup']])('exposes %s as a public route', async (path, mode) => {
    render(<MemoryRouter initialEntries={[path]}><App /></MemoryRouter>)
    expect(await screen.findByRole('heading', { name: `Public ${mode}` })).toBeInTheDocument()
  })
  it('renders the intentional catch-all route', async () => {
    render(<MemoryRouter initialEntries={['/missing-route']}><App /></MemoryRouter>)
    expect(await screen.findByRole('heading', { name: 'Intentional 404' })).toBeInTheDocument()
  })
})
