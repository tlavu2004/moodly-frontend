import { vi } from 'vitest'
import { uploadAvatar } from './profileApi.ts'

const sdk = vi.hoisted(() => ({ signature: vi.fn(), confirm: vi.fn(), current: vi.fn() }))
vi.mock('../../../api/openapi/sdk.api.ts', () => sdk)

const signed = {
  uploadUrl: 'https://upload.example.test/image', apiKey: 'api-key', publicId: 'moodly/avatar-1',
  signature: 'signature', timestamp: 1234, uploadPreset: 'preset',
}
const response = <T,>(data: T) => ({ data: { success: true, data, timestamp: '' } })

describe('uploadAvatar', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    sdk.signature.mockReset()
    sdk.confirm.mockReset()
  })

  it('sends signature metadata, an exact multipart payload, and a numeric version', async () => {
    const file = new File(['image'], 'avatar.webp', { type: 'image/webp' })
    sdk.signature.mockResolvedValue(response(signed))
    sdk.confirm.mockResolvedValue(response({ publicId: signed.publicId, deliveryUrl: 'https://cdn/avatar.webp' }))
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({ version: 42 }), { status: 200 }))

    await uploadAvatar({} as never, file)

    expect(sdk.signature).toHaveBeenCalledWith(expect.objectContaining({ body: { contentType: 'image/webp', sizeBytes: file.size } }))
    const init = fetchMock.mock.calls[0][1]
    const body = init?.body as FormData
    expect([...body.keys()]).toEqual(['file', 'api_key', 'public_id', 'signature', 'timestamp', 'upload_preset'])
    expect(body.get('file')).toBe(file)
    expect(sdk.confirm).toHaveBeenCalledWith(expect.objectContaining({ body: { publicId: signed.publicId, version: 42 } }))
  })

  it('omits an unsafe Cloudinary version and rejects a missing confirm payload', async () => {
    sdk.signature.mockResolvedValue(response(signed))
    sdk.confirm.mockResolvedValue(response(undefined))
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({ version: 'not-a-number' }), { status: 200 }))

    await expect(uploadAvatar({} as never, new File(['image'], 'avatar.png', { type: 'image/png' }))).rejects.toThrow('could not be confirmed')
    expect(sdk.confirm).toHaveBeenCalledWith(expect.objectContaining({ body: { publicId: signed.publicId, version: undefined } }))
  })
})
