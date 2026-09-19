import type { ApiClient } from '../../../api/client.ts'
import { findActive, moodTrend, mostMissedHabits } from '../../../api/openapi/sdk.api.ts'
import type { Habit, MoodTrendResponse, MostMissedHabitResponse } from '../../../api/openapi/types.api.ts'

export async function getStats(client: ApiClient, period: string): Promise<{ trends: MoodTrendResponse[]; missed: MostMissedHabitResponse[]; habits: Habit[] }> {
  const [trendResult, missedResult, habitResult] = await Promise.all([
    moodTrend({ client, query: { period }, throwOnError: true }), mostMissedHabits({ client, throwOnError: true }), findActive({ client, throwOnError: true }),
  ])
  return { trends: trendResult.data.data ?? [], missed: missedResult.data.data ?? [], habits: habitResult.data.data ?? [] }
}
