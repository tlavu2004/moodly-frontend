import { getClientEnvironment } from './env.ts'

describe('getClientEnvironment', () => {
  it('normalizes required frontend configuration', () => {
    expect(getClientEnvironment({
      VITE_AUTH0_DOMAIN: ' tenant.auth0.com ',
      VITE_AUTH0_CLIENT_ID: 'client-id',
      VITE_AUTH0_AUDIENCE: 'https://api.moodly.test',
      VITE_API_BASE_URL: 'https://api.moodly.test/',
    })).toEqual({
      auth0Domain: 'tenant.auth0.com',
      auth0ClientId: 'client-id',
      auth0Audience: 'https://api.moodly.test',
      apiBaseUrl: 'https://api.moodly.test',
    })
  })

  it('reports every missing variable together', () => {
    expect(() => getClientEnvironment({})).toThrow('VITE_AUTH0_DOMAIN, VITE_AUTH0_CLIENT_ID, VITE_AUTH0_AUDIENCE, VITE_API_BASE_URL')
  })
})
