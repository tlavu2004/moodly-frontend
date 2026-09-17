import { useAuth0 } from '@auth0/auth0-react'
import { useState } from 'react'
import { ApiRequestError } from './types.ts'
import { useAuthenticatedApi } from './useAuthenticatedApi.ts'

type HabitSummary = {
  id: string
  name: string
  icon?: string | null
  targetFrequency: string
}

type CheckState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; habits: HabitSummary[] }
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
      const habits = await api<HabitSummary[]>('/habits')
      setState({ status: 'success', habits })
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
        <div className="mt-2 text-left text-sm" role="status">
          <p>API connection verified. Received {state.habits.length} habits.</p>
          {state.habits.length > 0 ? (
            <ul className="mt-2 space-y-1">
              {state.habits.map((habit) => (
                <li key={habit.id}>
                  {habit.icon ? `${habit.icon} ` : ''}
                  {habit.name} · {habit.targetFrequency}
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}

      {state.status === 'error' ? (
        <p className="mt-2 text-sm text-red-700" role="alert">
          {state.message}
        </p>
      ) : null}
    </section>
  )
}
