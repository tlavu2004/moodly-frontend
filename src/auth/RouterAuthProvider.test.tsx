import { fireEvent, render, screen } from '@testing-library/react'
import { BrowserRouter, Route, Routes } from 'react-router'
import { vi } from 'vitest'
import { RouterAuthProvider } from './RouterAuthProvider.tsx'

vi.mock('@auth0/auth0-react', () => ({
  Auth0Provider: ({ children, onRedirectCallback }: { children: React.ReactNode; onRedirectCallback: (state: { returnTo: string }) => void }) => <>
    <button onClick={() => onRedirectCallback({ returnTo: '/dashboard' })}>Finish login</button>
    {children}
  </>,
}))
vi.mock('./localSessionCache.ts', () => ({ createLocalSessionCache: () => undefined }))

it('updates the rendered route and URL immediately after an Auth0 callback', () => {
  window.history.replaceState({}, '', '/?code=test&state=test')
  render(<BrowserRouter><RouterAuthProvider environment={{ auth0Domain: 'test', auth0ClientId: 'test', auth0Audience: 'test', apiBaseUrl: '/api' }}>
    <Routes>
      <Route path="/" element={<h1>Landing</h1>} />
      <Route path="/dashboard" element={<h1>Dashboard</h1>} />
    </Routes>
  </RouterAuthProvider></BrowserRouter>)
  expect(screen.getByRole('heading', { name: 'Landing' })).toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: 'Finish login' }))
  expect(window.location.pathname).toBe('/dashboard')
  expect(window.location.search).toBe('')
  expect(screen.getByRole('heading', { name: 'Dashboard' })).toBeInTheDocument()
  expect(screen.queryByRole('heading', { name: 'Landing' })).not.toBeInTheDocument()
  window.history.replaceState({}, '', '/')
})
