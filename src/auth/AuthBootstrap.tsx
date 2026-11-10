import { useAuth0 } from '@auth0/auth0-react'
import { useEffect, useMemo, useState, type ReactNode } from 'react'
import type { ApiClient } from '../api/client.ts'
import { ApiRequestError } from '../api/errors.ts'
import { getSessionApiClient } from '../api/useApiClient.ts'
import { RequestRetry } from '../components/ui/RequestRetry.tsx'
import { getUserFacingError } from '../api/errorMessages.ts'
import { synchronizeProfile } from './synchronizeProfile.ts'

type AuthBootstrapProps = {
  children: ReactNode
}

export function AuthBootstrap({ children }: AuthBootstrapProps) {
  const { error, getAccessTokenSilently, isAuthenticated, isLoading, loginWithRedirect, user } = useAuth0()
  const client = useMemo(() => getSessionApiClient(getAccessTokenSilently, user?.sub), [getAccessTokenSilently, user?.sub])
  const [attempt, setAttempt] = useState(0)
  const [profile, setProfile] = useState<{ client: ApiClient; failure?: unknown; ready: boolean } | null>(null)
  const failure = isAuthenticated && profile?.client === client ? profile.failure : null
  const isProfileReady = profile?.client === client && profile.ready
  const profileError = failure ? getUserFacingError(failure, 'Unable to synchronize your profile.') : null
  const profileUnauthorized = failure instanceof ApiRequestError && failure.status === 401
  const retryAt = failure instanceof ApiRequestError ? failure.retryAt : null

  useEffect(() => {
    if (!error) return
    // The SDK has validated/consumed the callback. Never replay it on reload.
    const url = new URL(window.location.href)
    if (!url.searchParams.has('state')) return
    for (const key of ['code', 'state', 'error', 'error_description', 'error_uri']) {
      url.searchParams.delete(key)
    }
    window.history.replaceState(window.history.state, '', url.pathname + url.search + url.hash)
  }, [error])

  useEffect(() => {
    let active = true
    if (!isAuthenticated) { queueMicrotask(() => { if (active) setProfile(null) }); return () => { active = false } }
    synchronizeProfile(client).then(() => { if (active) setProfile({ client, ready: true }) }).catch((failure: unknown) => { if (active) setProfile({ client, ready: false, failure }) })
    return () => { active = false }
  }, [client, isAuthenticated, attempt])

  if (isLoading || (isAuthenticated && !isProfileReady && !profileError)) {
    return (
      <main
        className="grid min-h-svh place-items-center p-6"
        aria-busy="true"
        aria-live="polite"
      >
        <p>{isAuthenticated ? 'Preparing your Moodly space…' : 'Starting authentication…'}</p>
      </main>
    )
  }

  if (error || profileError) {
    return (
      <main className="grid min-h-svh place-items-center p-6">
        <section
          className="max-w-md rounded-card border border-border bg-surface p-6"
          role="alert"
        >
          <h1 className="text-lg font-semibold">Unable to prepare Moodly</h1>
          <p className="mt-2 text-sm text-foreground/75">{error?.message ?? profileError}</p>
          <div className="mt-4 flex flex-wrap gap-3">
            <a className="button-secondary" href="/">Back to home</a>
            {(error || profileUnauthorized) && <button className="button-primary" type="button" onClick={() => loginWithRedirect({ appState: { returnTo: '/dashboard' } })}>Sign in again</button>}
            {profileError && !profileUnauthorized && <RequestRetry retryAt={retryAt} onRetry={() => { setProfile(null); setAttempt((value) => value + 1) }} />}
          </div>
        </section>
      </main>
    )
  }

  return children
}
