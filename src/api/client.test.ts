import { afterEach, vi } from 'vitest'

const { createClientMock, errorUseMock } = vi.hoisted(() => ({
  createClientMock: vi.fn(),
  errorUseMock: vi.fn(),
}))

vi.mock('./openapi/client/index.api.ts', () => ({ createClient: createClientMock }))

describe('createApiClient', () => {
  afterEach(() => {
    vi.resetModules()
    vi.unstubAllEnvs()
    vi.restoreAllMocks()
    createClientMock.mockReset()
    errorUseMock.mockReset()
  })

  it('normalizes the base URL and configures bearer-token auth without logging it', async () => {
    vi.stubEnv('VITE_API_BASE_URL', 'https://api.moodly.test/')
    createClientMock.mockReturnValue({ interceptors: { error: { use: errorUseMock } } })
    const getAccessToken = vi.fn().mockResolvedValue('secret-token')
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined)
    const { createApiClient } = await import('./client.ts')

    createApiClient(getAccessToken)

    expect(createClientMock).toHaveBeenCalledWith(expect.objectContaining({
      baseUrl: 'https://api.moodly.test',
      auth: getAccessToken,
      throwOnError: true,
    }))
    expect(consoleSpy).not.toHaveBeenCalled()
    expect(errorUseMock).toHaveBeenCalledOnce()
  })

  it('fails clearly when VITE_API_BASE_URL is missing', async () => {
    vi.stubEnv('VITE_API_BASE_URL', '')
    const { createApiClient } = await import('./client.ts')

    expect(() => createApiClient(vi.fn())).toThrow('VITE_API_BASE_URL is not configured.')
  })
})
