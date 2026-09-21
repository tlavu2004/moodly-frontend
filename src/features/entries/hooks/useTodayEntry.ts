import { useEffect, useState } from 'react'
import { useApiClient } from '../../../api/useApiClient.ts'
import type { DailyEntry, Habit, SetMoodRequest } from '../../../api/openapi/types.api.ts'
import { getActiveHabits, getTodayEntry, saveHabitLog, saveMood } from '../api/entriesApi.ts'

export function useTodayEntry() {
  const client = useApiClient()
  const [entry, setEntry] = useState<DailyEntry | null>(null)
  const [habits, setHabits] = useState<Habit[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    Promise.all([getTodayEntry(client), getActiveHabits(client)]).then(([todayEntry, activeHabits]) => { if (active) { setEntry(todayEntry); setHabits(activeHabits) } }).catch((reason: unknown) => { if (active) setError(reason instanceof Error ? reason.message : 'Unable to load today.') }).finally(() => { if (active) setIsLoading(false) })
    return () => { active = false }
  }, [client])

  async function updateMood(input: SetMoodRequest) { const updated = await saveMood(client, input); setEntry(updated) }
  async function toggleHabit(habitId: string, done: boolean) { const updated = await saveHabitLog(client, habitId, done); setEntry(updated) }
  return { entry, habits, isLoading, error, updateMood, toggleHabit }
}
