import { Component, type ErrorInfo, type ReactNode } from 'react'

type Props = { children: ReactNode }
type State = { error: Error | null; resetKey: number }

function isChunkLoadError(error: Error): boolean {
  return /dynamically imported module|loading chunk|chunkloaderror|failed to fetch.*module/i.test(error.message)
}

export class AppErrorBoundary extends Component<Props, State> {
  state: State = { error: null, resetKey: 0 }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    if (import.meta.env.DEV) console.error('Unhandled application error', error, info)
  }

  private retry = () => this.setState(({ resetKey }) => ({ error: null, resetKey: resetKey + 1 }))

  render() {
    const { error, resetKey } = this.state
    if (!error) return <div key={resetKey}>{this.props.children}</div>
    const chunkFailure = isChunkLoadError(error)
    return (
      <main className="grid min-h-svh place-items-center p-6">
        <section className="card max-w-lg p-8 text-center" role="alert">
          <span className="text-4xl" aria-hidden="true">🌦️</span>
          <h1 className="mt-4 text-xl font-bold">Moodly needs a fresh start</h1>
          <p className="mt-2 text-sm text-foreground-muted">
            {chunkFailure ? 'A new version of Moodly is available. Reload to continue.' : 'Something unexpected happened. Your saved data is safe.'}
          </p>
          <div className="mt-6 flex justify-center gap-3">
            {!chunkFailure && <button type="button" className="button-secondary" onClick={this.retry}>Try again</button>}
            <button type="button" className="button-primary" onClick={() => window.location.reload()}>Reload Moodly</button>
          </div>
        </section>
      </main>
    )
  }
}
