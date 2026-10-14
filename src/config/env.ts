export type ClientEnvironment = {
  auth0Domain: string
  auth0ClientId: string
  auth0Audience: string
  apiBaseUrl: string
}

const requiredVariables = [
  'VITE_AUTH0_DOMAIN',
  'VITE_AUTH0_CLIENT_ID',
  'VITE_AUTH0_AUDIENCE',
  'VITE_API_BASE_URL',
] as const

export function getClientEnvironment(source: Record<string, unknown> = import.meta.env): ClientEnvironment {
  const values = Object.fromEntries(requiredVariables.map((name) => [name, typeof source[name] === 'string' ? source[name].trim() : '']))
  const missing = requiredVariables.filter((name) => !values[name])
  if (missing.length > 0) throw new Error(`Missing required frontend environment variables: ${missing.join(', ')}`)
  return {
    auth0Domain: values.VITE_AUTH0_DOMAIN,
    auth0ClientId: values.VITE_AUTH0_CLIENT_ID,
    auth0Audience: values.VITE_AUTH0_AUDIENCE,
    apiBaseUrl: values.VITE_API_BASE_URL.replace(/\/$/, ''),
  }
}
