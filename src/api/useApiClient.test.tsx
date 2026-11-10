import { renderHook } from '@testing-library/react'
import { vi } from 'vitest'
import { useApiClient } from './useApiClient.ts'
import { create, findByStatus } from './openapi/sdk.api.ts'

const auth = vi.hoisted(() => ({ getAccessTokenSilently: vi.fn().mockResolvedValue('test-access-token'), user: { sub: 'user-a' } }))
vi.mock('@auth0/auth0-react', () => ({ useAuth0: () => auth }))

it('shares cooldown across feature clients and isolates a different signed-in subject', async () => {
  vi.stubEnv('VITE_API_BASE_URL', 'https://api.example.test')
  const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(new Response(JSON.stringify({ success: false, error: { status: 429, code: 'RATE_LIMIT_EXCEEDED', message: 'Too many requests.' } }), { status: 429, headers: { 'Content-Type': 'application/json', 'Retry-After': '60' } })).mockResolvedValue(new Response(JSON.stringify({ success: true, data: [] }), { headers: { 'Content-Type': 'application/json' } }))
  try {
    const first = renderHook(() => useApiClient())
    await expect(findByStatus({ client: first.result.current, throwOnError: true })).rejects.toMatchObject({ status: 429 })
    first.unmount()
    const nextFeature = renderHook(() => useApiClient())
    await expect(create({ client: nextFeature.result.current, body: { name: 'Walk', targetFrequency: 'DAILY' }, throwOnError: true })).rejects.toMatchObject({ status: 429 })
    expect(fetchMock).toHaveBeenCalledTimes(1)
    auth.user = { sub: 'user-b' }
    nextFeature.rerender()
    await findByStatus({ client: nextFeature.result.current, throwOnError: true })
    expect(fetchMock).toHaveBeenCalledTimes(2)
  } finally { vi.unstubAllEnvs(); vi.restoreAllMocks() }
})
