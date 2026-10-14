import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { vi } from 'vitest'
import { AppErrorBoundary } from './AppErrorBoundary.tsx'

function Broken({ fail }: { fail: boolean }) {
  if (fail) throw new Error('Unexpected render failure')
  return <p>Recovered content</p>
}

describe('AppErrorBoundary', () => {
  it('shows a safe fallback and can retry rendering', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    let fail = true
    const { rerender } = render(<AppErrorBoundary><Broken fail={fail} /></AppErrorBoundary>)
    expect(screen.getByRole('alert')).toHaveTextContent('Something unexpected happened')
    fail = false
    rerender(<AppErrorBoundary><Broken fail={fail} /></AppErrorBoundary>)
    await userEvent.setup().click(screen.getByRole('button', { name: 'Try again' }))
    expect(screen.getByText('Recovered content')).toBeInTheDocument()
    consoleSpy.mockRestore()
  })

  it('recognizes deployment chunk mismatches', () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined)
    const ChunkFailure = () => { throw new Error('Failed to fetch dynamically imported module') }
    render(<AppErrorBoundary><ChunkFailure /></AppErrorBoundary>)
    expect(screen.getByRole('alert')).toHaveTextContent('new version of Moodly')
    expect(screen.queryByRole('button', { name: 'Try again' })).not.toBeInTheDocument()
  })
})
