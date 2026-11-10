import { useCallback } from 'react'
import { useApiRead } from '../../../api/useApiRead.ts'
import { useApiClient } from '../../../api/useApiClient.ts'
import { searchEntriesPage } from '../api/searchApi.ts'

export function useEntrySearch(q: string, from?: string, to?: string, page = 0) {
  const client = useApiClient()
  const valid = Boolean(q.trim()) && !(from && to && from > to)
  const load = useCallback((signal: AbortSignal) => searchEntriesPage(client, { q: q.trim(), from: from || undefined, to: to || undefined }, page, signal), [client, q, from, to, page])
  const { data, isLoading, error, reload, retryAt } = useApiRead(load, 'Search failed.', valid)
  return { isLoading, error, reload, retryAt, results: valid ? data?.items ?? [] : [], totalElements: data?.totalElements ?? 0, totalPages: data?.totalPages ?? 0 }
}
