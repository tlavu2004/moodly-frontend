import { useCallback } from 'react'
import { useApiRead } from '../../../api/useApiRead.ts'
import { useApiClient } from '../../../api/useApiClient.ts'
import { toMoodlyDateKey } from '../../../utils/date.ts'
import { getEntriesPage } from '../api/entriesApi.ts'

export function useEntries(from: string, to: string, page = 0) {
  const client = useApiClient()
  const today = toMoodlyDateKey(new Date())
  const valid = from <= to && from <= today && to <= today
  const load = useCallback((signal: AbortSignal) => getEntriesPage(client, from, to, page, signal), [client, from, to, page])
  const { data, isLoading, error, reload, retryAt } = useApiRead(load, 'Unable to load entries.', valid)
  return { isLoading, reload, retryAt, entries: valid ? data?.items ?? [] : [], totalElements: data?.totalElements ?? 0, totalPages: data?.totalPages ?? 0,
    error: valid ? error : 'Choose a valid date range that does not include future dates.' }
}
