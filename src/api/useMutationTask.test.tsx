import { act, renderHook } from '@testing-library/react'
import { vi } from 'vitest'
import { useMutationTask } from './useMutationTask.ts'
import { ApiRequestError } from './errors.ts'

it('guards double submit synchronously and aborts a pending write on unmount', async () => {
  let signal!: AbortSignal
  let finish!: () => void
  const write = vi.fn((next: AbortSignal) => { signal = next; return new Promise<void>((resolve) => { finish = resolve }) })
  const hook = renderHook(() => useMutationTask())
  const pending = hook.result.current(write)
  await expect(hook.result.current(write)).rejects.toThrow('already in progress')
  expect(write).toHaveBeenCalledTimes(1)
  const aborted = expect(pending).rejects.toMatchObject({ name: 'AbortError' })
  hook.unmount()
  expect(signal.aborted).toBe(true)
  await act(async () => finish())
  await aborted
})

it.each([null, 400, 401, 403, 409, 429, 500])('does not replay a mutation failing with %s and releases the submit guard', async (status) => {
  const write = vi.fn().mockRejectedValue(new ApiRequestError({ status, message: 'Failed' }))
  const hook = renderHook(() => useMutationTask())
  await expect(hook.result.current(write)).rejects.toMatchObject({ status })
  hook.rerender()
  expect(write).toHaveBeenCalledTimes(1)
  write.mockResolvedValueOnce('saved')
  await expect(hook.result.current(write)).resolves.toBe('saved')
  expect(write).toHaveBeenCalledTimes(2)
})
