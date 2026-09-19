import { useEffect, useState } from 'react'
import { useApiClient } from '../../../api/useApiClient.ts'
import type { DailyEntry } from '../../../api/openapi/types.api.ts'
import { getEntries } from '../api/entriesApi.ts'

export function useEntries(from: string, to: string) {
  const client = useApiClient()
  const [entries, setEntries] = useState<DailyEntry[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  useEffect(() => {
    let active = true
    queueMicrotask(() => { setIsLoading(true); setError(null) })
    getEntries(client, from, to).then((data) => { if (active) setEntries(data.toReversed()) }).catch((reason: unknown) => { if (active) setError(reason instanceof Error ? reason.message : 'Unable to load entries.') }).finally(() => { if (active) setIsLoading(false) })
    return () => { active = false }
  }, [client, from, to])
  return { entries, isLoading, error }
}
