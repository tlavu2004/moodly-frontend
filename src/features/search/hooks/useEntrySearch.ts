import { useEffect, useState } from 'react'
import { getUserFacingError } from '../../../api/errorMessages.ts'
import { useApiClient } from '../../../api/useApiClient.ts'
import type { EntrySearchResult } from '../../../api/openapi/types.api.ts'
import { searchEntriesPage } from '../api/searchApi.ts'

export function useEntrySearch(q: string, from?: string, to?: string, page = 0) {
  const [pagination, setPagination] = useState({ totalElements: 0, totalPages: 0 })
  const client = useApiClient(); const [results, setResults] = useState<EntrySearchResult[]>([]); const [isLoading, setIsLoading] = useState(false); const [error, setError] = useState<string | null>(null)
  useEffect(() => {
    if (!q.trim() || (from && to && from > to)) {
      queueMicrotask(() => { setResults([]); setIsLoading(false); setError(null) })
      return
    }
    const controller = new AbortController()
    let active = true
    queueMicrotask(() => { setIsLoading(true); setError(null) })
    searchEntriesPage(client, { q: q.trim(), from: from || undefined, to: to || undefined }, page, controller.signal).then((data) => { if (active) { setResults(data.items); setPagination(data) } }).catch((reason: unknown) => { if (active && !controller.signal.aborted) setError(getUserFacingError(reason, 'Search failed.')) }).finally(() => { if (active) setIsLoading(false) })
    return () => { active = false; controller.abort() }
  }, [client, q, from, to, page])
  return { results, isLoading, error, ...pagination }
}
