import type { ApiClient } from '../../../api/client.ts'
import { create, currentStreak, findByStatus } from '../../../api/openapi/sdk.api.ts'
import type { CreateHabitRequest, Habit } from '../../../api/openapi/types.api.ts'

export async function listHabits(client: ApiClient): Promise<Habit[]> {
  const result = await findByStatus({ client, query: { status: 'active' }, throwOnError: true })
  return result.data.data ?? []
}

export async function createHabit(client: ApiClient, input: CreateHabitRequest): Promise<Habit> {
  const result = await create({ client, body: input, throwOnError: true })
  if (!result.data.data) throw new Error('The habit was created without a response body.')
  return result.data.data
}

export async function listHabitStreaks(client: ApiClient, habits: Habit[]): Promise<Record<string, number>> {
  const settled = await Promise.allSettled(habits.filter((habit) => habit.id).map(async (habit) => {
    const result = await currentStreak({ client, path: { habitId: habit.id }, throwOnError: true })
    const streak = result.data.data?.currentStreak
    if (streak === undefined) throw new Error('The habit streak response was empty.')
    return [habit.id, streak] as const
  }))
  return Object.fromEntries(settled.flatMap((result) => result.status === 'fulfilled' ? [result.value] : []))
}
