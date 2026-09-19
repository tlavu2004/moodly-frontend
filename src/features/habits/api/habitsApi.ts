import type { ApiClient } from '../../../api/client.ts'
import { create, currentStreak, findActive } from '../../../api/openapi/sdk.api.ts'
import type { CreateHabitRequest, Habit } from '../../../api/openapi/types.api.ts'

export async function listHabits(client: ApiClient): Promise<Habit[]> {
  const result = await findActive({ client, throwOnError: true })
  return result.data.data ?? []
}

export async function createHabit(client: ApiClient, input: CreateHabitRequest): Promise<Habit> {
  const result = await create({ client, body: input, throwOnError: true })
  if (!result.data.data) throw new Error('The habit was created without a response body.')
  return result.data.data
}

export async function listHabitStreaks(client: ApiClient, habits: Habit[]): Promise<Record<string, number>> {
  const pairs = await Promise.all(habits.filter((habit) => habit.id).map(async (habit) => {
    const result = await currentStreak({ client, path: { habitId: habit.id! }, throwOnError: true })
    return [habit.id!, result.data.data?.currentStreak ?? 0] as const
  }))
  return Object.fromEntries(pairs)
}
