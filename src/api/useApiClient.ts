import { useAuth0 } from '@auth0/auth0-react'
import { useMemo } from 'react'
import { createApiClient, type ApiClient } from './client'

const sessionClients = new WeakMap<object, Map<string | undefined, ApiClient>>()

/** Provides a stable authenticated API client to feature hooks and API modules. */
export function getSessionApiClient(getAccessTokenSilently: ReturnType<typeof useAuth0>['getAccessTokenSilently'], subject?: string): ApiClient {
  let clients = sessionClients.get(getAccessTokenSilently)
  if (!clients) { clients = new Map(); sessionClients.set(getAccessTokenSilently, clients) }
  let client = clients.get(subject)
  if (!client) { client = createApiClient(() => getAccessTokenSilently()); clients.set(subject, client) }
  return client
}

export function useApiClient() {
  const { getAccessTokenSilently, user } = useAuth0()

  return useMemo(
    () => getSessionApiClient(getAccessTokenSilently, user?.sub),
    [getAccessTokenSilently, user?.sub],
  )
}
