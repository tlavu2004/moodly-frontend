import { safeImageUrl } from './safeImageUrl.ts'

describe('safeImageUrl', () => {
  it('accepts absolute HTTPS image URLs', () => {
    expect(safeImageUrl('https://cdn.example.test/avatar.png')).toBe('https://cdn.example.test/avatar.png')
  })

  it.each([
    'http://cdn.example.test/avatar.png',
    'javascript:alert(1)',
    'data:image/svg+xml,<svg/>',
    '/relative/avatar.png',
    'https://user:password@cdn.example.test/avatar.png',
  ])('rejects an untrusted image URL: %s', (url) => {
    expect(safeImageUrl(url)).toBeNull()
  })
})
