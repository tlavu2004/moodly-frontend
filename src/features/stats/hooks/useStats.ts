import { useEffect, useState } from 'react'
import { useApiClient } from '../../../api/useApiClient.ts'
import type { Habit, MoodTrendResponse, MostMissedHabitResponse } from '../../../api/openapi/types.api.ts'
import { getStats } from '../api/statsApi.ts'

export function useStats(period: string) {
  const client = useApiClient(); const [trends, setTrends] = useState<MoodTrendResponse[]>([]); const [missed, setMissed] = useState<MostMissedHabitResponse[]>([]); const [habits, setHabits] = useState<Habit[]>([]); const [isLoading, setIsLoading] = useState(true); const [error, setError] = useState<string | null>(null)
  useEffect(() => { let active = true; getStats(client, period).then((data) => { if (active) { setTrends(data.trends); setMissed(data.missed); setHabits(data.habits) } }).catch((reason: unknown) => { if (active) setError(reason instanceof Error ? reason.message : 'Unable to load insights.') }).finally(() => { if (active) setIsLoading(false) }); return () => { active = false } }, [client, period])
  return { trends, missed, habits, isLoading, error }
}
