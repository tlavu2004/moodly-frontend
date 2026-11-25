import { useCallback } from 'react'
import { useApiRead } from '../../../api/useApiRead.ts'
import { useApiClient } from '../../../api/useApiClient.ts'
import { toMoodlyDateKey } from '../../../utils/date.ts'
import { listHabits } from '../../habits/api/habitsApi.ts'
import { getEntriesPage } from '../api/entriesApi.ts'

export function useEntries(from: string, to: string, page = 0) {
  const client = useApiClient()
  const today = toMoodlyDateKey(new Date())
  const valid = from <= to && from <= today && to <= today
  const load = useCallback((signal: AbortSignal) => getEntriesPage(client, from, to, page, signal), [client, from, to, page])
  const { data, isLoading, error, reload, retryAt } = useApiRead(load, 'Unable to load entries.', valid)
  const loadHabits = useCallback((signal: AbortSignal) => listHabits(client, signal, 'all'), [client])
  const habitRead = useApiRead(loadHabits, 'Unable to load habit names.', valid)
  return { isLoading: isLoading || (valid && habitRead.isLoading), reload, retryAt,
    habits: habitRead.data ?? [], habitError: habitRead.error, reloadHabits: habitRead.reload, habitRetryAt: habitRead.retryAt, entries: valid ? data?.items ?? [] : [], totalElements: data?.totalElements ?? 0, totalPages: data?.totalPages ?? 0,
    error: valid ? error : 'Choose a valid date range that does not include future dates.' }
}
