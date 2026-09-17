import { useAuth0 } from '@auth0/auth0-react'
import { useState } from 'react'
import { ApiRequestError } from './types.ts'
import { useAuthenticatedApi } from './useAuthenticatedApi.ts'

type CheckState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; habitCount: number }
  | { status: 'error'; message: string }

// TODO(auth): Remove this diagnostic once the first authenticated API screen
// uses useAuthenticatedApi and the end-to-end Auth0/CORS integration is verified.
export function ApiConnectionCheck() {
  const { isAuthenticated } = useAuth0()
  const api = useAuthenticatedApi()
  const [state, setState] = useState<CheckState>({ status: 'idle' })

  if (!isAuthenticated) {
    return null
  }

  async function verifyConnection() {
    setState({ status: 'loading' })

    try {
      const habits = await api<unknown[]>('/habits')
      setState({ status: 'success', habitCount: habits.length })
    } catch (error) {
      const message =
        error instanceof ApiRequestError
          ? `${error.status}: ${error.message}`
          : 'The API connection could not be verified.'

      setState({ status: 'error', message })
    }
  }

  return (
    <section
      className="max-w-md rounded-card border border-border bg-surface p-4"
      aria-label="API connection check"
    >
      <button
        type="button"
        className="rounded-control bg-primary px-4 py-2 font-medium text-primary-foreground disabled:cursor-wait disabled:opacity-60"
        disabled={state.status === 'loading'}
        onClick={() => void verifyConnection()}
      >
        {state.status === 'loading' ? 'Checking API…' : 'Verify API connection'}
      </button>

      {state.status === 'success' ? (
        <p className="mt-2 text-sm" role="status">
          API connection verified. Received {state.habitCount} habits.
        </p>
      ) : null}

      {state.status === 'error' ? (
        <p className="mt-2 text-sm text-red-700" role="alert">
          {state.message}
        </p>
      ) : null}
    </section>
  )
}
