import type { ApiClient } from '../../../api/client.ts'
import { findBetween, setTodayMood, today, updateTodayHabit } from '../../../api/openapi/sdk.api.ts'
import type { DailyEntryResponse as DailyEntry, SetMoodRequest } from '../../../api/openapi/types.api.ts'

export async function getEntriesPage(client: ApiClient, from: string, to: string, page: number, signal?: AbortSignal) {
  const result = await findBetween({ client, query: { from, to, page, size: 20 }, signal, throwOnError: true })
  if (!result.data.data) throw new Error("The entries response was empty.")
  return result.data.data
}


export async function getTodayEntry(client: ApiClient, signal?: AbortSignal): Promise<DailyEntry | null> {
  const result = await today({ client, signal, throwOnError: true })
  return result.data.data?.entry ?? null
}

export async function saveMood(client: ApiClient, body: SetMoodRequest, signal?: AbortSignal): Promise<DailyEntry> {
  const result = await setTodayMood({ client, signal, body, throwOnError: true })
  if (!result.data.data) throw new Error('The check-in response was empty.')
  return result.data.data
}

export async function saveHabitLog(client: ApiClient, habitId: string, done: boolean, signal?: AbortSignal, note?: string | null): Promise<DailyEntry> {
  const result = await updateTodayHabit({ client, signal, body: { habitId, done, note }, throwOnError: true })
  if (!result.data.data) throw new Error('The habit response was empty.')
  return result.data.data
}
