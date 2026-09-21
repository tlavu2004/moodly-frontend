import { useAuth0 } from '@auth0/auth0-react'
import { useEffect, useState, type ReactNode } from 'react'
import { createApiClient } from '../api/client.ts'
import { synchronize } from '../api/openapi/sdk.api.ts'

type AuthBootstrapProps = {
  children: ReactNode
}

export function AuthBootstrap({ children }: AuthBootstrapProps) {
  const { error, getAccessTokenSilently, isAuthenticated, isLoading } = useAuth0()
  const [isProfileReady, setIsProfileReady] = useState(false)
  const [profileError, setProfileError] = useState<string | null>(null)

  useEffect(() => {
    if (!isAuthenticated) return
    let active = true
    const client = createApiClient(() => getAccessTokenSilently())
    synchronize({ client, throwOnError: true }).then(() => { if (active) setIsProfileReady(true) }).catch((reason: unknown) => { if (active) setProfileError(reason instanceof Error ? reason.message : 'Unable to synchronize your profile.') })
    return () => { active = false }
  }, [getAccessTokenSilently, isAuthenticated])

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
        </section>
      </main>
    )
  }

  return children
}
