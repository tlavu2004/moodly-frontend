import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { vi } from 'vitest'
import App from './App.tsx'

vi.mock('@auth0/auth0-react', () => ({
  withAuthenticationRequired: () => () => <div>Protected application shell</div>,
}))
vi.mock('./features/landing/pages/LandingPage.tsx', () => ({ LandingPage: () => <h1>Public landing</h1> }))
vi.mock('./features/not-found/pages/NotFoundPage.tsx', () => ({ NotFoundPage: () => <h1>Intentional 404</h1> }))

describe('application routes', () => {
  it('renders the public landing route without the authentication guard', async () => {
    render(<MemoryRouter initialEntries={['/']}><App /></MemoryRouter>)
    expect(await screen.findByRole('heading', { name: 'Public landing' })).toBeInTheDocument()
    expect(screen.queryByText('Protected application shell')).not.toBeInTheDocument()
  })

  it('wraps protected routes with the Auth0 guard', () => {
    render(<MemoryRouter initialEntries={['/dashboard']}><App /></MemoryRouter>)
    expect(screen.getByText('Protected application shell')).toBeInTheDocument()
  })

  it('renders the intentional catch-all route', async () => {
    render(<MemoryRouter initialEntries={['/missing-route']}><App /></MemoryRouter>)
    expect(await screen.findByRole('heading', { name: 'Intentional 404' })).toBeInTheDocument()
  })
})
