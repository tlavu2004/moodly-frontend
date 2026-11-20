import { ApiRequestError } from '../api/errors.ts'
import userEvent from '@testing-library/user-event'
import { StrictMode } from 'react'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { useAuth0 } from '@auth0/auth0-react'
import { vi } from 'vitest'
import { AuthBootstrap } from './AuthBootstrap.tsx'

const { synchronizeMock, createApiClientMock } = vi.hoisted(() => ({
  synchronizeMock: vi.fn(),
  createApiClientMock: vi.fn(() => ({ transport: 'test' })),
}))

vi.mock('@auth0/auth0-react', () => ({ useAuth0: vi.fn() }))
vi.mock('../api/client.ts', () => ({ createApiClient: createApiClientMock }))
vi.mock('../api/openapi/sdk.api.ts', () => ({ synchronize: synchronizeMock }))

const authState = (overrides: Record<string, unknown> = {}) => ({
  error: undefined,
  getAccessTokenSilently: vi.fn(),
  isAuthenticated: false,
  isLoading: false,
  ...overrides,
})

describe('AuthBootstrap', () => {
  beforeEach(() => {
    vi.mocked(useAuth0).mockReturnValue(authState() as unknown as ReturnType<typeof useAuth0>)
    synchronizeMock.mockReset()
    createApiClientMock.mockClear()
  })

  it('shows authentication loading state', () => {
    vi.mocked(useAuth0).mockReturnValue(authState({ isLoading: true }) as unknown as ReturnType<typeof useAuth0>)
    render(<AuthBootstrap><p>Protected child</p></AuthBootstrap>)
    expect(screen.getByText('Starting authentication…')).toBeInTheDocument()
    expect(screen.queryByText('Protected child')).not.toBeInTheDocument()
  })

  it('removes consumed error callback parameters and provides recovery actions', () => {
    window.history.replaceState({}, '', '/?error=access_denied&error_description=Denied&state=used&keep=1')
    vi.mocked(useAuth0).mockReturnValue(authState({ error: new Error('Denied') }) as unknown as ReturnType<typeof useAuth0>)
    render(<AuthBootstrap><p>Child</p></AuthBootstrap>)
    expect(window.location.search).toBe('?keep=1')
    expect(screen.getByRole('link', { name: 'Back to home' })).toHaveAttribute('href', '/')
    expect(screen.getByRole('button', { name: 'Sign in again' })).toBeInTheDocument()
    window.history.replaceState({}, '', '/')
  })

  it('renders public children without profile synchronization', () => {
    render(<AuthBootstrap><p>Public child</p></AuthBootstrap>)
    expect(screen.getByText('Public child')).toBeInTheDocument()
    expect(synchronizeMock).not.toHaveBeenCalled()
  })

  it('waits for profile synchronization before rendering authenticated children', async () => {
    let resolveSync!: () => void
    synchronizeMock.mockReturnValue(new Promise<void>((resolve) => { resolveSync = resolve }))
    vi.mocked(useAuth0).mockReturnValue(authState({ isAuthenticated: true }) as unknown as ReturnType<typeof useAuth0>)
    render(<AuthBootstrap><p>Protected child</p></AuthBootstrap>)
    expect(screen.getByText('Preparing your Moodly space…')).toBeInTheDocument()
    expect(screen.queryByText('Protected child')).not.toBeInTheDocument()

    resolveSync()

    await waitFor(() => expect(screen.getByText('Protected child')).toBeInTheDocument())
    expect(synchronizeMock).toHaveBeenCalledWith(expect.objectContaining({ throwOnError: true }))
  })

  it('renders Auth0 and profile synchronization errors', async () => {
    vi.mocked(useAuth0).mockReturnValue(authState({ error: new Error('Auth initialization failed') }) as unknown as ReturnType<typeof useAuth0>)
    const { rerender } = render(<AuthBootstrap><p>Child</p></AuthBootstrap>)
    expect(screen.getByRole('alert')).toHaveTextContent('Sign-in failed. Please try again.')

    synchronizeMock.mockRejectedValue(new Error('Profile synchronization failed'))
    vi.mocked(useAuth0).mockReturnValue(authState({ isAuthenticated: true }) as unknown as ReturnType<typeof useAuth0>)
    rerender(<AuthBootstrap><p>Child</p></AuthBootstrap>)
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('Profile synchronization failed'))
  })
})

it('provides sign-in recovery when the backend rejects profile sync with 401', async () => {
  const loginWithRedirect = vi.fn()
  synchronizeMock.mockRejectedValue(new ApiRequestError({ status: 401, message: 'Unauthorized' }))
  vi.mocked(useAuth0).mockReturnValue(authState({ isAuthenticated: true, loginWithRedirect }) as unknown as ReturnType<typeof useAuth0>)
  render(<AuthBootstrap><p>Child</p></AuthBootstrap>)
  await userEvent.setup().click(await screen.findByRole('button', { name: 'Sign in again' }))
  expect(loginWithRedirect).toHaveBeenCalledWith({ appState: { returnTo: '/dashboard' }, authorizationParams: { ui_locales: 'en' } })
  expect(screen.queryByRole('button', { name: 'Try again' })).not.toBeInTheDocument()
})

it('does not redirect or retry automatically after a profile 403', async () => {
  const loginWithRedirect = vi.fn()
  synchronizeMock.mockRejectedValue(new ApiRequestError({ status: 403, message: 'Forbidden' }))
  vi.mocked(useAuth0).mockReturnValue(authState({ isAuthenticated: true, loginWithRedirect }) as unknown as ReturnType<typeof useAuth0>)
  render(<AuthBootstrap><p>Child</p></AuthBootstrap>)
  expect(await screen.findByRole('alert')).toHaveTextContent('permission')
  expect(screen.queryByRole('button', { name: 'Sign in again' })).not.toBeInTheDocument()
  expect(loginWithRedirect).not.toHaveBeenCalled()
  expect(synchronizeMock).toHaveBeenCalledTimes(1)
})

it('shares overlapping StrictMode profile synchronization without replaying the PUT', async () => {
  let finish!: () => void
  synchronizeMock.mockReturnValue(new Promise<void>((done) => { finish = done }))
  vi.mocked(useAuth0).mockReturnValue(authState({ isAuthenticated: true }) as unknown as ReturnType<typeof useAuth0>)
  render(<StrictMode><AuthBootstrap><p>Ready child</p></AuthBootstrap></StrictMode>)
  expect(synchronizeMock).toHaveBeenCalledTimes(1)
  await act(async () => finish())
  expect(screen.getByText('Ready child')).toBeInTheDocument()
})

it('waits for Retry-After and retries profile sync only after an explicit click', async () => {
  vi.useFakeTimers()
  try {
    synchronizeMock.mockRejectedValueOnce(new ApiRequestError({ status: 429, message: 'Limited', retryAt: Date.now() + 5000 })).mockResolvedValueOnce(undefined)
    vi.mocked(useAuth0).mockReturnValue(authState({ isAuthenticated: true }) as unknown as ReturnType<typeof useAuth0>)
    render(<AuthBootstrap><p>Ready child</p></AuthBootstrap>)
    await act(async () => {})
    expect(screen.getByRole('button')).toBeDisabled()
    await act(async () => { await vi.advanceTimersByTimeAsync(5000) })
    expect(screen.getByRole('button')).toBeEnabled()
    expect(synchronizeMock).toHaveBeenCalledTimes(1)
    await act(async () => fireEvent.click(screen.getByRole('button')))
    expect(synchronizeMock).toHaveBeenCalledTimes(2)
    expect(screen.getByText('Ready child')).toBeInTheDocument()
  } finally { vi.useRealTimers() }
})


it('recovers when the explicit sign-in retry cannot open Auth0', async () => {
  const loginWithRedirect = vi.fn().mockRejectedValueOnce(new Error('provider details')).mockReturnValueOnce(new Promise(() => {}))
  vi.mocked(useAuth0).mockReturnValue(authState({ error: new Error('Auth error'), loginWithRedirect }) as unknown as ReturnType<typeof useAuth0>)
  render(<AuthBootstrap><p>Child</p></AuthBootstrap>)
  const user = userEvent.setup()
  await user.click(screen.getByRole('button', { name: 'Sign in again' }))
  expect(await screen.findByRole('alert')).toHaveTextContent('We could not open sign-in. Please try again.')
  await user.dblClick(screen.getByRole('button', { name: 'Sign in again' }))
  expect(loginWithRedirect).toHaveBeenCalledTimes(2)
  expect(screen.getByRole('button', { name: 'Opening secure sign-in…' })).toBeDisabled()
})
