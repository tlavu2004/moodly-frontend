import type { ApiClient } from '../../../api/client.ts'
import { findByStatus, moodTrend, mostMissedHabits } from '../../../api/openapi/sdk.api.ts'
import type { Habit, MoodTrendResponse, MostMissedHabitResponse } from '../../../api/openapi/types.api.ts'

export async function getStats(client: ApiClient): Promise<{ trends: MoodTrendResponse[]; missed: MostMissedHabitResponse[]; habits: Habit[] }> {
  const [trendResult, missedResult, habitResult] = await Promise.all([
    moodTrend({ client, query: { period: 'week' }, throwOnError: true }), mostMissedHabits({ client, throwOnError: true }), findByStatus({ client, query: { status: 'active' }, throwOnError: true }),
  ])
  return { trends: trendResult.data.data ?? [], missed: missedResult.data.data ?? [], habits: habitResult.data.data ?? [] }
}
