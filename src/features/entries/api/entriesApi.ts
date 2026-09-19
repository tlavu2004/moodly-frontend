import type { ApiClient } from '../../../api/client.ts'
import { findActive, findBetween, setTodayMood, updateTodayHabit } from '../../../api/openapi/sdk.api.ts'
import type { DailyEntry, Habit, SetMoodRequest } from '../../../api/openapi/types.api.ts'

export async function getEntries(client: ApiClient, from: string, to: string): Promise<DailyEntry[]> {
  const result = await findBetween({ client, query: { from, to }, throwOnError: true })
  return result.data.data ?? []
}

export async function getActiveHabits(client: ApiClient): Promise<Habit[]> {
  const result = await findActive({ client, throwOnError: true })
  return result.data.data ?? []
}

export async function saveMood(client: ApiClient, body: SetMoodRequest): Promise<DailyEntry> {
  const result = await setTodayMood({ client, body, throwOnError: true })
  if (!result.data.data) throw new Error('The check-in response was empty.')
  return result.data.data
}

export async function saveHabitLog(client: ApiClient, habitId: string, done: boolean): Promise<DailyEntry> {
  const result = await updateTodayHabit({ client, body: { habitId, done }, throwOnError: true })
  if (!result.data.data) throw new Error('The habit response was empty.')
  return result.data.data
}
