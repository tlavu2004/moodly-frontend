import { useCallback, useEffect, useState } from 'react'
import { useApiClient } from '../../../api/useApiClient.ts'
import { getDashboardData, type DashboardData } from '../api/dashboardApi.ts'

function dateKey(date: Date) { return date.toLocaleDateString('en-CA') }

export function useDashboard() {
  const client = useApiClient(); const [data, setData] = useState<DashboardData | null>(null); const [isLoading, setIsLoading] = useState(true); const [error, setError] = useState<string | null>(null)
  const load = useCallback(async () => { setIsLoading(true); setError(null); const from = new Date(); from.setDate(from.getDate() - 6); try { setData(await getDashboardData(client, dateKey(from), dateKey(new Date()))) } catch (reason) { setError(reason instanceof Error ? reason.message : 'Unable to load your dashboard.') } finally { setIsLoading(false) } }, [client])
  useEffect(() => { let active = true; const from = new Date(); from.setDate(from.getDate() - 6); getDashboardData(client, dateKey(from), dateKey(new Date())).then((result) => { if (active) setData(result) }).catch((reason: unknown) => { if (active) setError(reason instanceof Error ? reason.message : 'Unable to load your dashboard.') }).finally(() => { if (active) setIsLoading(false) }); return () => { active = false } }, [client])
  return { data, isLoading, error, reload: load }
}
