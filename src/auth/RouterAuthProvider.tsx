import { Auth0Provider, type AppState } from '@auth0/auth0-react'
import { useCallback, type ReactNode } from 'react'
import { useNavigate } from 'react-router'
import type { ClientEnvironment } from '../config/env.ts'
import { createLocalSessionCache } from './localSessionCache.ts'

const localCache = createLocalSessionCache(window.location.hostname)

export function RouterAuthProvider({ environment, children }: { environment: ClientEnvironment; children: ReactNode }) {
  const navigate = useNavigate()
  const onRedirectCallback = useCallback((appState?: AppState) => {
    const returnTo = appState?.returnTo
    const path = typeof returnTo === 'string' && returnTo.startsWith('/') && !returnTo.startsWith('//')
      ? returnTo
      : window.location.pathname
    navigate(path, { replace: true })
  }, [navigate])

  return <Auth0Provider
    domain={environment.auth0Domain}
    clientId={environment.auth0ClientId}
    cache={localCache}
    authorizationParams={{ audience: environment.auth0Audience, redirect_uri: window.location.origin }}
    onRedirectCallback={onRedirectCallback}
  >{children}</Auth0Provider>
}
