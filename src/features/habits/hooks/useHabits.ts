import { ApiRequestError } from '../../../api/errors.ts'
import { useCallback } from 'react'
import { useApiRead } from '../../../api/useApiRead.ts'
import { useMutationTask } from '../../../api/useMutationTask.ts'
import { useApiClient } from '../../../api/useApiClient.ts'
import type { CreateHabitRequest, HabitResponse } from '../../../api/openapi/types.api.ts'
import { changeHabit, createHabit, listHabits, listHabitStreaks } from '../api/habitsApi.ts'

export function useHabits() {
  const client = useApiClient()
  const mutate = useMutationTask()
  const load = useCallback(async (signal: AbortSignal) => {
    const habits = await listHabits(client, signal, 'all')
    signal.throwIfAborted()
    let streakRetryAt: number | null = null
    const streaks = await listHabitStreaks(client, habits.filter((habit) => habit.active), signal, (error) => { streakRetryAt = Math.max(streakRetryAt ?? 0, error.retryAt ?? 0) })
    return { habits, streaks, streakRetryAt }
  }, [client])
  const { data, setData, isLoading, error, reload, retryAt } = useApiRead(load, 'Unable to load habits.')
  async function refresh() {
    const latest = await mutate(load)
    setData(latest)
    return latest
  }

  const add = async (input: CreateHabitRequest) => {
    const habit = await mutate((signal) => createHabit(client, input, signal))
    setData((current) => ({ habits: [...(current?.habits ?? []), habit], streaks: { ...current?.streaks, [habit.id]: 0 }, streakRetryAt: current?.streakRetryAt ?? null }))
  }
  async function change(id: string, action: Parameters<typeof changeHabit>[2]) {
    const habit = data?.habits.find((item) => item.id === id)
    if (!habit || isLoading || error) return
    try {
      const updated = await mutate((signal) => changeHabit(client, habit, action, signal))
      setData((current) => current && {
        ...current,
        habits: current.habits.map((item) => item.id === id ? updated : item),
      })
      if (action === 'restore') reload()
    } catch (reason) {
      if (reason instanceof ApiRequestError && reason.status === 409 && reason.code === 'HABIT_CONFLICT') reload()
      throw reason
    }
  }
  const habits: HabitResponse[] = data?.habits ?? []
  return { change, refresh, archived: habits.filter((habit) => !habit.active), streakRetryAt: data?.streakRetryAt ?? null, habits: habits.filter((habit) => habit.active), streaks: data?.streaks ?? {}, isLoading, error, reload, retryAt, add }
}
