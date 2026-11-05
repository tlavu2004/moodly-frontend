import { useCallback } from 'react'
import { useApiRead } from '../../../api/useApiRead.ts'
import { useMutationTask } from '../../../api/useMutationTask.ts'
import { useApiClient } from '../../../api/useApiClient.ts'
import type { CreateHabitRequest } from '../../../api/openapi/types.api.ts'
import { createHabit, listHabits, listHabitStreaks } from '../api/habitsApi.ts'

export function useHabits() {
  const client = useApiClient()
  const mutate = useMutationTask()
  const load = useCallback(async (signal: AbortSignal) => {
    const habits = await listHabits(client, signal)
    signal.throwIfAborted()
    let streakRetryAt: number | null = null
    const streaks = await listHabitStreaks(client, habits, signal, (error) => { streakRetryAt = Math.max(streakRetryAt ?? 0, error.retryAt ?? 0) })
    return { habits, streaks, streakRetryAt }
  }, [client])
  const { data, setData, isLoading, error, reload, retryAt } = useApiRead(load, 'Unable to load habits.')
  const add = async (input: CreateHabitRequest) => {
    const habit = await mutate((signal) => createHabit(client, input, signal))
    setData((current) => ({ habits: [...(current?.habits ?? []), habit], streaks: { ...current?.streaks, [habit.id]: 0 }, streakRetryAt: current?.streakRetryAt ?? null }))
  }
  return { streakRetryAt: data?.streakRetryAt ?? null, habits: data?.habits ?? [], streaks: data?.streaks ?? {}, isLoading, error, reload, retryAt, add }
}
