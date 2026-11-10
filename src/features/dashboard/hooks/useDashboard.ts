import { useCallback } from 'react'
import { useApiRead } from '../../../api/useApiRead.ts'
import { useApiClient } from '../../../api/useApiClient.ts'
import { getDashboardData } from '../api/dashboardApi.ts'

export function useDashboard() {
  const client = useApiClient()
  const load = useCallback((signal: AbortSignal) => getDashboardData(client, signal), [client])
  const { data, isLoading, error, reload, retryAt } = useApiRead(load, 'Unable to load your dashboard.')
  return { data: data ?? null, isLoading, error, reload, retryAt }
}
