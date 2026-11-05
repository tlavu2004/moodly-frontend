import { useCallback } from 'react'
import { useApiRead } from '../../../api/useApiRead.ts'
import { useMutationTask } from '../../../api/useMutationTask.ts'
import { useApiClient } from '../../../api/useApiClient.ts'
import type { SetMoodRequest } from '../../../api/openapi/types.api.ts'
import { getActiveHabits, getTodayEntry, saveHabitLog, saveMood } from '../api/entriesApi.ts'

export function useTodayEntry() {
  const client = useApiClient()
  const mutate = useMutationTask()
  const load = useCallback(async (signal: AbortSignal) => {
    const [entry, habits] = await Promise.all([getTodayEntry(client, signal), getActiveHabits(client, signal)])
    return { entry, habits }
  }, [client])
  const { data, setData, isLoading, error, reload, retryAt } = useApiRead(load, 'Unable to load today.')
  async function updateMood(input: SetMoodRequest) {
    const updated = await mutate((signal) => saveMood(client, input, signal))
    setData((current) => current ? { ...current, entry: updated } : current)
  }
  async function toggleHabit(habitId: string, done: boolean) {
    const updated = await mutate((signal) => saveHabitLog(client, habitId, done, signal))
    setData((current) => current ? { ...current, entry: updated } : current)
  }
  return { entry: data?.entry ?? null, habits: data?.habits ?? [], isLoading, error, reload, retryAt, updateMood, toggleHabit }
}
