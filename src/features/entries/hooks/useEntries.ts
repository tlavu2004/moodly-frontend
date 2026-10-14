import { useEffect, useState } from 'react'
import { getUserFacingError } from '../../../api/errorMessages.ts'
import { useApiClient } from '../../../api/useApiClient.ts'
import type { DailyEntry } from '../../../api/openapi/types.api.ts'
import { toLocalDateKey } from '../../../utils/date.ts'
import { getEntries } from '../api/entriesApi.ts'

export function useEntries(from: string, to: string) {
  const client = useApiClient()
  const [entries, setEntries] = useState<DailyEntry[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  useEffect(() => {
    const today = toLocalDateKey(new Date())
    if (from > to || from > today || to > today) {
      queueMicrotask(() => {
        setEntries([])
        setIsLoading(false)
        setError('Choose a valid date range that does not include future dates.')
      })
      return
    }
    const controller = new AbortController()
    let active = true
    queueMicrotask(() => { setIsLoading(true); setError(null) })
    getEntries(client, from, to, controller.signal).then((data) => { if (active) setEntries(data.toReversed()) }).catch((reason: unknown) => { if (active && !controller.signal.aborted) setError(getUserFacingError(reason, 'Unable to load entries.')) }).finally(() => { if (active) setIsLoading(false) })
    return () => { active = false; controller.abort() }
  }, [client, from, to])
  return { entries, isLoading, error }
}
