import { useEffect, useState } from 'react'
import { getUserFacingError } from '../../../api/errorMessages.ts'
import { useApiClient } from '../../../api/useApiClient.ts'
import type { DailyEntryResponse as DailyEntry } from '../../../api/openapi/types.api.ts'
import { toMoodlyDateKey } from '../../../utils/date.ts'
import { getEntriesPage } from '../api/entriesApi.ts'

export function useEntries(from: string, to: string, page = 0) {
  const client = useApiClient()
  const [entries, setEntries] = useState<DailyEntry[]>([])
  const [pagination, setPagination] = useState({ totalElements: 0, totalPages: 0 })
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  useEffect(() => {
    const today = toMoodlyDateKey(new Date())
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
    getEntriesPage(client, from, to, page, controller.signal).then((data) => { if (active) { setEntries(data.items); setPagination(data) } }).catch((reason: unknown) => { if (active && !controller.signal.aborted) setError(getUserFacingError(reason, 'Unable to load entries.')) }).finally(() => { if (active) setIsLoading(false) })
    return () => { active = false; controller.abort() }
  }, [client, from, to, page])
  return { entries, isLoading, error, ...pagination }
}
