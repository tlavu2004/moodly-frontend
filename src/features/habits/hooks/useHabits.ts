import { useCallback, useEffect, useState } from 'react'
import { useApiClient } from '../../../api/useApiClient.ts'
import type { CreateHabitRequest, Habit } from '../../../api/openapi/types.api.ts'
import { createHabit, listHabits } from '../api/habitsApi.ts'

export function useHabits() {
  const client = useApiClient()
  const [habits, setHabits] = useState<Habit[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setIsLoading(true); setError(null)
    try { setHabits(await listHabits(client)) } catch (reason) { setError(reason instanceof Error ? reason.message : 'Unable to load habits.') } finally { setIsLoading(false) }
  }, [client])

  useEffect(() => {
    let active = true
    void listHabits(client)
      .then((items) => { if (active) setHabits(items) })
      .catch((reason: unknown) => { if (active) setError(reason instanceof Error ? reason.message : 'Unable to load habits.') })
      .finally(() => { if (active) setIsLoading(false) })
    return () => { active = false }
  }, [client])

  const add = async (input: CreateHabitRequest) => {
    const habit = await createHabit(client, input)
    setHabits((current) => [...current, habit])
  }

  return { habits, isLoading, error, reload: load, add }
}
