import { useCallback, useEffect, useState } from 'react'
import { useApiClient } from '../../../api/useApiClient.ts'
import { getDashboardData, type DashboardData } from '../api/dashboardApi.ts'

export function useDashboard() {
  const client = useApiClient(); const [data, setData] = useState<DashboardData | null>(null); const [isLoading, setIsLoading] = useState(true); const [error, setError] = useState<string | null>(null)
  const load = useCallback(async () => { setIsLoading(true); setError(null); try { setData(await getDashboardData(client)) } catch (reason) { setError(reason instanceof Error ? reason.message : 'Unable to load your dashboard.') } finally { setIsLoading(false) } }, [client])
  useEffect(() => { let active = true; getDashboardData(client).then((result) => { if (active) setData(result) }).catch((reason: unknown) => { if (active) setError(reason instanceof Error ? reason.message : 'Unable to load your dashboard.') }).finally(() => { if (active) setIsLoading(false) }); return () => { active = false } }, [client])
  return { data, isLoading, error, reload: load }
}
