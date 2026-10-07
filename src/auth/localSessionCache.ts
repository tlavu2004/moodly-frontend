import { InMemoryCache, type ICache } from '@auth0/auth0-react'

// Local-only: localhost cannot silently skip Auth0 consent. Preserve valid
// SDK entries across reloads of this tab; let the SDK enforce token expiry.
export function createLocalSessionCache(hostname: string): ICache | undefined {
  if (hostname !== 'localhost' && hostname !== '127.0.0.1') return undefined
  try {
    const storage = window.sessionStorage
    const probe = 'moodly:auth:probe'
    storage.setItem(probe, '1')
    storage.removeItem(probe)
    const prefix = 'moodly:auth:'
    return {
      set(key, value) { storage.setItem(prefix + key, JSON.stringify(value)) },
      get<T>(key: string): T | undefined {
        const raw = storage.getItem(prefix + key)
        if (!raw) return undefined
        try { return JSON.parse(raw) as T } catch { storage.removeItem(prefix + key); return undefined }
      },
      remove(key) { storage.removeItem(prefix + key) },
      allKeys() { return Object.keys(storage).filter((key) => key.startsWith(prefix)).map((key) => key.slice(prefix.length)) },
    }
  } catch {
    return new InMemoryCache().enclosedCache
  }
}
