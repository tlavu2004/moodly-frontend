import type { ApiClient } from '../../../api/client.ts'
import { findByStatus, findBetween, setTodayMood, today, updateTodayHabit } from '../../../api/openapi/sdk.api.ts'
import type { DailyEntry, Habit, SetMoodRequest } from '../../../api/openapi/types.api.ts'

export async function getEntries(client: ApiClient, from: string, to: string, signal?: AbortSignal): Promise<DailyEntry[]> {
  const result = await findBetween({ client, query: { from, to }, signal, throwOnError: true })
  return result.data.data?.items ?? []
}

export async function getActiveHabits(client: ApiClient): Promise<Habit[]> {
  const result = await findByStatus({ client, query: { status: 'active' }, throwOnError: true })
  return result.data.data ?? []
}

export async function getTodayEntry(client: ApiClient): Promise<DailyEntry | null> {
  const result = await today({ client, throwOnError: true })
  return result.data.data?.entry ?? null
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
