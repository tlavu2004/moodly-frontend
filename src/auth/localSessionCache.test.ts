import { createLocalSessionCache } from './localSessionCache.ts'

describe('local session cache', () => {
  beforeEach(() => sessionStorage.clear())

  it('preserves SDK entries across cache recreation and removes them on logout', () => {
    const cache = createLocalSessionCache('localhost')!
    cache.set('@@auth0spajs@@::client', { expiresAt: 123, body: { access_token: 'test' } })
    sessionStorage.setItem('unrelated', 'keep')
    const restored = createLocalSessionCache('localhost')!
    expect(restored.get('@@auth0spajs@@::client')).toEqual({ expiresAt: 123, body: { access_token: 'test' } })
    expect(restored.allKeys!()).toEqual(['@@auth0spajs@@::client'])
    restored.remove('@@auth0spajs@@::client')
    expect(restored.get('@@auth0spajs@@::client')).toBeUndefined()
    expect(sessionStorage.getItem('unrelated')).toBe('keep')
  })

  it('keeps production on the SDK default memory cache', () => {
    expect(createLocalSessionCache('moodly.example')).toBeUndefined()
  })
})
