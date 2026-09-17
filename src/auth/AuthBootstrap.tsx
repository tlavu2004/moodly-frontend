import { useAuth0 } from '@auth0/auth0-react'
import type { ReactNode } from 'react'

type AuthBootstrapProps = {
  children: ReactNode
}

export function AuthBootstrap({ children }: AuthBootstrapProps) {
  const { error, isLoading } = useAuth0()

  if (isLoading) {
    return (
      <main
        className="grid min-h-svh place-items-center p-6"
        aria-busy="true"
        aria-live="polite"
      >
        <p>Starting authentication…</p>
      </main>
    )
  }

  if (error) {
    return (
      <main className="grid min-h-svh place-items-center p-6">
        <section
          className="max-w-md rounded-card border border-border bg-surface p-6"
          role="alert"
        >
          <h1 className="text-lg font-semibold">Unable to start authentication</h1>
          <p className="mt-2 text-sm text-foreground/75">{error.message}</p>
        </section>
      </main>
    )
  }

  return children
}
