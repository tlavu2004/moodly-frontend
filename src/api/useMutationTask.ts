import { useCallback, useEffect, useRef } from 'react'

/** A synchronous submit guard; unmount cancels transport, never replays a write. */
export function useMutationTask() {
  const pending = useRef<AbortController | null>(null)
  useEffect(() => () => { pending.current?.abort() }, [])
  return useCallback(async <T,>(operation: (signal: AbortSignal) => Promise<T>): Promise<T> => {
    if (pending.current) throw new Error('A request is already in progress. Please wait.')
    const controller = new AbortController()
    pending.current = controller
    try {
      const result = await operation(controller.signal)
      controller.signal.throwIfAborted()
      return result
    } finally { if (pending.current === controller) pending.current = null }
  }, [])
}
