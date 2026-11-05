import { useCallback } from 'react'
import { useApiRead } from '../../../api/useApiRead.ts'
import { useApiClient } from '../../../api/useApiClient.ts'
import { getStats } from '../api/statsApi.ts'

export function useStats() {
  const client = useApiClient()
  const load = useCallback((signal: AbortSignal) => getStats(client, signal), [client])
  const { data, isLoading, error, reload, retryAt } = useApiRead(load, 'Unable to load insights.')
  return { isLoading, error, reload, retryAt, trends: data?.trends ?? [], missed: data?.missed ?? [], habits: data?.habits ?? [] }
}
