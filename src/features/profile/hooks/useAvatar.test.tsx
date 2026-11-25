import { act, renderHook, waitFor } from '@testing-library/react'
import { vi } from 'vitest'
import { ApiRequestError } from '../../../api/errors.ts'
import type { AvatarResponse } from '../../../api/openapi/types.api.ts'
import { getAvatar, removeAvatar, uploadAvatar } from '../api/profileApi.ts'
import { useAvatar } from './useAvatar.ts'

const client = {}
vi.mock('../../../api/useApiClient.ts', () => ({ useApiClient: () => client }))
vi.mock('../api/profileApi.ts', () => ({ getAvatar: vi.fn(), removeAvatar: vi.fn(), uploadAvatar: vi.fn() }))

const previousAvatar = { publicId: 'previous' }
const file = new File(['image'], 'avatar.png', { type: 'image/png' })

async function renderLoadedAvatar() {
  const hook = renderHook(() => useAvatar())
  await waitFor(() => expect(hook.result.current.avatar).toEqual(previousAvatar))
  return hook
}

beforeEach(() => {
  vi.resetAllMocks()
  vi.mocked(getAvatar).mockResolvedValue(previousAvatar)
})

describe('useAvatar', () => {
  it('suppresses duplicate submissions and displays the confirmed avatar', async () => {
    const uploaded = { publicId: 'confirmed' }
    let finish!: (avatar: AvatarResponse) => void
    vi.mocked(uploadAvatar).mockReturnValue(new Promise((resolve) => { finish = resolve }))
    const { result } = await renderLoadedAvatar()

    let pending!: Promise<void>
    act(() => { pending = result.current.upload(file) })
    await act(() => result.current.upload(file))

    expect(result.current.isUploading).toBe(true)
    expect(uploadAvatar).toHaveBeenCalledTimes(1)
    expect(uploadAvatar).toHaveBeenCalledWith(client, file, expect.any(AbortSignal))

    await act(async () => {
      finish(uploaded)
      await pending
    })
    expect(result.current).toMatchObject({ avatar: uploaded, isUploading: false, error: null })
  })

  it('keeps the current avatar on rate limit and clears the error on refresh', async () => {
    const retryAt = Date.now() + 30_000
    vi.mocked(uploadAvatar).mockRejectedValue(new ApiRequestError({ message: 'rate limited', status: 429, retryAt }))
    const { result } = await renderLoadedAvatar()

    await act(() => result.current.upload(file))
    expect(result.current).toMatchObject({
      avatar: previousAvatar,
      isUploading: false,
      retryAt,
      error: 'Too many requests. Please wait before trying again.',
    })

    act(() => result.current.reload())
    await waitFor(() => expect(result.current).toMatchObject({ avatar: previousAvatar, retryAt: null, error: null }))
    expect(getAvatar).toHaveBeenCalledTimes(2)
  })

  it('clears the uploading state without showing an error after cancellation', async () => {
    vi.mocked(uploadAvatar).mockRejectedValue(new DOMException('Cancelled', 'AbortError'))
    const { result } = await renderLoadedAvatar()

    await act(() => result.current.upload(file))

    expect(result.current).toMatchObject({ avatar: previousAvatar, isUploading: false, error: null })
  })
})

it('replaces old avatar metadata with the cleared response', async () => {
  vi.mocked(removeAvatar).mockResolvedValue({})
  const { result } = await renderLoadedAvatar()
  await act(() => result.current.remove())
  expect(removeAvatar).toHaveBeenCalledWith(client, expect.any(AbortSignal))
  expect(result.current.avatar).toEqual({})
})
