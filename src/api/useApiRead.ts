import { useCallback, useEffect, useRef, useState } from 'react'
import { ApiRequestError } from './errors.ts'
import { getUserFacingError } from './errorMessages.ts'

/** One cancellable read per input revision. Retry is explicit, never scheduled. */
export function useApiRead<T>(load: (signal: AbortSignal) => Promise<T>, fallback: string, enabled = true) {
  const [owner, setOwner] = useState(() => load)
  const [data, setData] = useState<T>()
  const [failure, setFailure] = useState<unknown>(null)
  const [isLoading, setIsLoading] = useState(enabled)
  const [revision, setRevision] = useState(0)
  const loading = useRef(false)
  const reload = useCallback(() => {
    if (loading.current) return
    loading.current = true
    setRevision((value) => value + 1)
  }, [])
  useEffect(() => {
    const controller = new AbortController()
    let active = true
    loading.current = enabled
    queueMicrotask(() => { if (active) { setOwner(() => load); setIsLoading(enabled); setFailure(null); setData(undefined) } })
    if (enabled) {
      void load(controller.signal).then((value) => { if (active && !controller.signal.aborted) setData(value) })
        .catch((reason: unknown) => { if (active && !controller.signal.aborted) { setFailure(reason); controller.abort() } })
        .finally(() => { if (active) { loading.current = false; setIsLoading(false) } })
    }
    return () => { active = false; controller.abort() }
  }, [load, enabled, revision])
  return {
    data: owner === load ? data : undefined, setData, isLoading: enabled && (owner !== load || isLoading), reload,
    error: owner === load && failure ? getUserFacingError(failure, fallback) : null,
    retryAt: owner === load && failure instanceof ApiRequestError ? failure.retryAt : null,
  }
}
