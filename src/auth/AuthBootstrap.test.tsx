import { render, screen, waitFor } from '@testing-library/react'
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
    expect(screen.getByRole('alert')).toHaveTextContent('Auth initialization failed')

    synchronizeMock.mockRejectedValue(new Error('Profile synchronization failed'))
    vi.mocked(useAuth0).mockReturnValue(authState({ isAuthenticated: true }) as unknown as ReturnType<typeof useAuth0>)
    rerender(<AuthBootstrap><p>Child</p></AuthBootstrap>)
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('Profile synchronization failed'))
  })
})
