import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useAuth0 } from '@auth0/auth0-react'
import { MemoryRouter, Route, Routes } from 'react-router'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { AuthWelcomePage } from './AuthWelcomePage.tsx'
import { setLocale } from '../../../i18n/index.ts'

vi.mock('@auth0/auth0-react', () => ({ useAuth0: vi.fn() }))
const loginWithRedirect = vi.fn()
beforeEach(() => { loginWithRedirect.mockReset(); vi.mocked(useAuth0).mockReturnValue({ isAuthenticated: false, loginWithRedirect } as unknown as ReturnType<typeof useAuth0>) })
afterEach(() => act(() => setLocale('en')))
function renderWelcome(mode: 'signin' | 'signup' = 'signin', path = '/login?returnTo=%2Fentries%3Fpage%3D2%23entry') {
  return render(<MemoryRouter initialEntries={[path]}><Routes><Route path="/login" element={<AuthWelcomePage mode={mode} />} /><Route path="/entries" element={<h1>Requested journal</h1>} /><Route path="/dashboard" element={<h1>Dashboard</h1>} /></Routes></MemoryRouter>)
}
it('explains the secure transition without requesting credentials and preserves the next destination', async () => {
  renderWelcome()
  expect(screen.queryByRole('textbox')).not.toBeInTheDocument()
  expect(screen.getByText(/Moodly never receives your password/)).toBeInTheDocument()
  expect(screen.getByRole('link', { name: 'Create account' })).toHaveAttribute('href', '/signup?returnTo=%2Fentries%3Fpage%3D2%23entry')
  await userEvent.setup().click(screen.getByRole('button', { name: 'Continue to sign in' }))
  expect(loginWithRedirect).toHaveBeenCalledWith({ appState: { returnTo: '/entries?page=2#entry' }, authorizationParams: { ui_locales: 'en', 'ext-moodly-theme': 'light' } })
})
it('uses the current Vietnamese locale and signup hint, and locks duplicate clicks', async () => {
  loginWithRedirect.mockReturnValue(new Promise(() => {}))
  renderWelcome('signup')
  const user = userEvent.setup()
  await user.selectOptions(screen.getByRole('combobox', { name: 'Language' }), 'vi')
  const button = screen.getByRole('button', { name: 'Tiếp tục tạo tài khoản' })
  await user.dblClick(button)
  expect(loginWithRedirect).toHaveBeenCalledTimes(1)
  expect(loginWithRedirect).toHaveBeenCalledWith({ appState: { returnTo: '/entries?page=2#entry' }, authorizationParams: { ui_locales: 'vi', 'ext-moodly-theme': 'light', screen_hint: 'signup' } })
  expect(button).toBeDisabled()
})
it('shows a localizable generic failure and allows retry without exposing provider details', async () => {
  loginWithRedirect.mockRejectedValueOnce(new Error('sensitive provider detail')).mockResolvedValueOnce(undefined)
  renderWelcome()
  const user = userEvent.setup()
  await user.click(screen.getByRole('button', { name: 'Continue to sign in' }))
  expect(await screen.findByRole('alert')).toHaveTextContent('We could not open sign-in. Please try again.')
  expect(screen.queryByText(/sensitive provider detail/)).not.toBeInTheDocument()
  await user.click(screen.getByRole('button', { name: 'Continue to sign in' }))
  expect(loginWithRedirect).toHaveBeenCalledTimes(2)
})
it('sends an existing session directly to the safe requested page', () => {
  vi.mocked(useAuth0).mockReturnValue({ isAuthenticated: true } as ReturnType<typeof useAuth0>)
  renderWelcome()
  expect(screen.getByRole('heading', { name: 'Requested journal' })).toBeInTheDocument()
  expect(loginWithRedirect).not.toHaveBeenCalled()
})
it('replaces an external requested destination with the dashboard', async () => {
  renderWelcome('signin', '/login?returnTo=https%3A%2F%2Fevil.example')
  await userEvent.setup().click(screen.getByRole('button', { name: 'Continue to sign in' }))
  expect(loginWithRedirect).toHaveBeenCalledWith(expect.objectContaining({ appState: { returnTo: '/dashboard' } }))
})
