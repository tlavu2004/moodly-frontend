import { act, fireEvent, render, renderHook, screen } from '@testing-library/react'
import { useCallback } from 'react'
import { vi } from 'vitest'
import { useApiRead } from './useApiRead.ts'
import { ApiRequestError } from './errors.ts'
import { RequestRetry } from '../components/ui/RequestRetry.tsx'

it('enables one manual retry after cooldown, never sends from a timer, and renders one recovery control', async () => {
  vi.useFakeTimers()
  try {
    const load = vi.fn<(signal: AbortSignal) => Promise<string>>().mockRejectedValueOnce(new ApiRequestError({ status: 429, message: 'limited', retryAt: Date.now() + 5000 })).mockResolvedValue('fresh')
    function Page() {
      const request = useApiRead(load, 'Failed')
      return <>{request.error && <div role="alert">{request.error}<RequestRetry retryAt={request.retryAt} onRetry={request.reload} /></div>}<p>{request.data}</p></>
    }
    render(<Page />)
    await act(async () => {})
    expect(screen.getAllByRole('alert')).toHaveLength(1)
    expect(screen.getAllByRole('button')).toHaveLength(1)
    expect(screen.getByRole('button')).toBeDisabled()
    await act(async () => { await vi.advanceTimersByTimeAsync(4999) })
    expect(load).toHaveBeenCalledTimes(1)
    await act(async () => { await vi.advanceTimersByTimeAsync(1) })
    expect(screen.getByRole('button')).toBeEnabled()
    expect(load).toHaveBeenCalledTimes(1)
    await act(async () => { fireEvent.click(screen.getByRole('button')); fireEvent.click(screen.getByRole('button')) })
    expect(load).toHaveBeenCalledTimes(2)
    expect(screen.getByText('fresh')).toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    await act(async () => { await vi.advanceTimersByTimeAsync(120000) })
    expect(load).toHaveBeenCalledTimes(2)
  } finally { vi.useRealTimers() }
})

it('aborts old reads on input change and unmount and ignores late results', async () => {
  const signals: AbortSignal[] = []
  const resolve: Array<(value: string) => void> = []
  const load = vi.fn((_id: number, signal: AbortSignal) => { signals.push(signal); return new Promise<string>((done) => resolve.push(done)) })
  const hook = renderHook(({ id }) => useApiRead(useCallback((signal) => load(id, signal), [id]), 'Failed'), { initialProps: { id: 1 } })
  hook.rerender({ id: 2 })
  expect(signals[0].aborted).toBe(true)
  await act(async () => { resolve[1]('new') })
  await act(async () => { resolve[0]('old') })
  expect(hook.result.current.data).toBe('new')
  hook.unmount()
  expect(signals[1].aborted).toBe(true)
})

it.each([400, 401, 403, 409])('keeps HTTP %s as a failure with no automatic retry', async (status) => {
  const load = vi.fn().mockRejectedValue(new ApiRequestError({ status, message: 'safe validation message' }))
  const hook = renderHook(() => useApiRead(load, 'Operation failed'))
  await act(async () => {})
  expect(load).toHaveBeenCalledTimes(1)
  expect(hook.result.current.error).toContain(status === 401 ? 'session has expired' : status === 403 ? 'permission' : status === 400 ? 'safe validation message' : 'Operation failed')
  hook.rerender()
  expect(load).toHaveBeenCalledTimes(1)
})
