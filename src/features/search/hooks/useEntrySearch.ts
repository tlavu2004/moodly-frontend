import { useEffect, useState } from 'react'
import { useApiClient } from '../../../api/useApiClient.ts'
import type { EntrySearchResult } from '../../../api/openapi/types.api.ts'
import { searchEntries } from '../api/searchApi.ts'

export function useEntrySearch(q: string, from?: string, to?: string) {
  const client = useApiClient(); const [results, setResults] = useState<EntrySearchResult[]>([]); const [isLoading, setIsLoading] = useState(false); const [error, setError] = useState<string | null>(null)
  useEffect(() => {
    if (!q.trim() || (from && to && from > to)) {
      queueMicrotask(() => { setResults([]); setIsLoading(false); setError(null) })
      return
    }
    const controller = new AbortController()
    let active = true
    queueMicrotask(() => { setIsLoading(true); setError(null) })
    searchEntries(client, { q: q.trim(), from: from || undefined, to: to || undefined }, controller.signal).then((data) => { if (active) setResults(data) }).catch((reason: unknown) => { if (active && !controller.signal.aborted) setError(reason instanceof Error ? reason.message : 'Search failed.') }).finally(() => { if (active) setIsLoading(false) })
    return () => { active = false; controller.abort() }
  }, [client, q, from, to])
  return { results, isLoading, error }
}
