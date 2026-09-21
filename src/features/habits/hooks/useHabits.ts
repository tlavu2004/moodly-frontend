import { useCallback, useEffect, useState } from 'react'
import { useApiClient } from '../../../api/useApiClient.ts'
import type { CreateHabitRequest, Habit } from '../../../api/openapi/types.api.ts'
import { createHabit, listHabits, listHabitStreaks } from '../api/habitsApi.ts'

export function useHabits() {
  const client = useApiClient()
  const [habits, setHabits] = useState<Habit[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [streaks, setStreaks] = useState<Record<string, number>>({})

  const load = useCallback(async () => {
    setIsLoading(true); setError(null)
    try { const items = await listHabits(client); setHabits(items); setStreaks(await listHabitStreaks(client, items)) } catch (reason) { setError(reason instanceof Error ? reason.message : 'Unable to load habits.') } finally { setIsLoading(false) }
  }, [client])

  useEffect(() => {
    let active = true
    void listHabits(client)
      .then(async (items) => ({ items, nextStreaks: await listHabitStreaks(client, items) }))
      .then(({ items, nextStreaks }) => { if (active) { setHabits(items); setStreaks(nextStreaks) } })
      .catch((reason: unknown) => { if (active) setError(reason instanceof Error ? reason.message : 'Unable to load habits.') })
      .finally(() => { if (active) setIsLoading(false) })
    return () => { active = false }
  }, [client])

  const add = async (input: CreateHabitRequest) => {
    const habit = await createHabit(client, input)
    setHabits((current) => [...current, habit])
    if (habit.id) setStreaks((current) => ({ ...current, [habit.id!]: 0 }))
  }

  return { habits, streaks, isLoading, error, reload: load, add }
}
