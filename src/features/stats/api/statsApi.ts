import type { ApiClient } from '../../../api/client.ts'
import { findByStatus, moodTrend, mostMissedHabits } from '../../../api/openapi/sdk.api.ts'
import type { HabitResponse as Habit, MoodTrendResponse, MostMissedHabitResponse } from '../../../api/openapi/types.api.ts'

export async function getStats(client: ApiClient, signal?: AbortSignal): Promise<{ trends: MoodTrendResponse[]; missed: MostMissedHabitResponse[]; habits: Habit[] }> {
  const [trendResult, missedResult, habitResult] = await Promise.all([
    moodTrend({ client, signal, query: { period: 'week' }, throwOnError: true }), mostMissedHabits({ client, signal, throwOnError: true }), findByStatus({ client, signal, query: { status: 'active' }, throwOnError: true }),
  ])
  return { trends: trendResult.data.data ?? [], missed: missedResult.data.data ?? [], habits: habitResult.data.data ?? [] }
}
