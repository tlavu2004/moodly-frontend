import { useAuth0 } from '@auth0/auth0-react'
import { useMemo } from 'react'
import { createApiClient } from './client'

/** Provides a stable authenticated API client to feature hooks and API modules. */
export function useApiClient() {
  const { getAccessTokenSilently } = useAuth0()

  return useMemo(
    () => createApiClient(() => getAccessTokenSilently()),
    [getAccessTokenSilently],
  )
}
