import type { ApiClient } from '../../../api/client.ts'
import { currentStreak, findActive, findBetween, moodTrend } from '../../../api/openapi/sdk.api.ts'
import type { DailyEntry, Habit, MoodTrendResponse } from '../../../api/openapi/types.api.ts'

export type DashboardData = { entries: DailyEntry[]; habits: Habit[]; moodTrend: MoodTrendResponse[]; streaks: Array<{ habitId: string; currentStreak: number }> }

export async function getDashboardData(client: ApiClient, from: string, to: string): Promise<DashboardData> {
  const [entriesResult, habitsResult, trendResult] = await Promise.all([
    findBetween({ client, query: { from, to }, throwOnError: true }),
    findActive({ client, throwOnError: true }),
    moodTrend({ client, query: { period: 'week' }, throwOnError: true }),
  ])
  const habits = habitsResult.data.data ?? []
  const streaks = await Promise.all(habits.filter((habit) => habit.id).map(async (habit) => {
    const result = await currentStreak({ client, path: { habitId: habit.id! }, throwOnError: true })
    return { habitId: habit.id!, currentStreak: result.data.data?.currentStreak ?? 0 }
  }))
  return { entries: entriesResult.data.data ?? [], habits, moodTrend: trendResult.data.data ?? [], streaks }
}
