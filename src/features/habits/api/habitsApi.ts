import type { ApiClient } from '../../../api/client.ts'
import { ApiRequestError } from '../../../api/errors.ts'
import { create, currentStreak, findByStatus } from '../../../api/openapi/sdk.api.ts'
import type { CreateHabitRequest, HabitResponse as Habit } from '../../../api/openapi/types.api.ts'

export async function listHabits(client: ApiClient, signal?: AbortSignal): Promise<Habit[]> {
  const result = await findByStatus({ client, signal, query: { status: 'active' }, throwOnError: true })
  return result.data.data ?? []
}

export async function createHabit(client: ApiClient, input: CreateHabitRequest, signal?: AbortSignal): Promise<Habit> {
  const result = await create({ client, signal, body: input, throwOnError: true })
  if (!result.data.data) throw new Error('The habit was created without a response body.')
  return result.data.data
}

export async function listHabitStreaks(client: ApiClient, habits: Habit[], signal?: AbortSignal, onRateLimit?: (error: ApiRequestError) => void): Promise<Record<string, number>> {
  signal?.throwIfAborted()
  const settled = await Promise.allSettled(habits.filter((habit) => habit.id).map(async (habit) => {
    const result = await currentStreak({ client, signal, path: { habitId: habit.id }, throwOnError: true })
    const streak = result.data.data?.currentStreak
    if (streak === undefined) throw new Error('The habit streak response was empty.')
    return [habit.id, streak] as const
  }))
  signal?.throwIfAborted()
  for (const result of settled) {
    if (result.status === 'rejected' && result.reason instanceof ApiRequestError && result.reason.status === 429) onRateLimit?.(result.reason)
  }
  return Object.fromEntries(settled.flatMap((result) => result.status === 'fulfilled' ? [result.value] : []))
}
