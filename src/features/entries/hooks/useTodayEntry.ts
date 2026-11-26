import { toMoodlyDateKey } from '../../../utils/date.ts'
import { ApiRequestError } from '../../../api/errors.ts'
import { listHabits } from '../../habits/api/habitsApi.ts'
import { useCallback } from 'react'
import { useApiRead } from '../../../api/useApiRead.ts'
import { useMutationTask } from '../../../api/useMutationTask.ts'
import { useApiClient } from '../../../api/useApiClient.ts'
import type { SetMoodRequest } from '../../../api/openapi/types.api.ts'
import { getTodayEntry, saveHabitLog, saveMood } from '../api/entriesApi.ts'

export class CheckInDateChanged extends Error {}

export function useTodayEntry() {
  const client = useApiClient()
  const mutate = useMutationTask()
  const load = useCallback(async (signal: AbortSignal) => {
    const [today, habits] = await Promise.all([getTodayEntry(client, signal), listHabits(client, signal, 'all')])
    return { date: today.date, entry: today.entry ?? null, habits }
  }, [client])
  const { data, setData, isLoading, error, reload, retryAt } = useApiRead(load, 'Unable to load today.')
  async function refresh() {
    const latest = await mutate(load)
    setData(latest)
    return latest
  }

  function assertCurrentDate() {
    if (data?.date === toMoodlyDateKey(new Date())) return
    reload()
    throw new CheckInDateChanged('The calendar day changed. Review today before saving.')
  }

  async function updateMood(input: SetMoodRequest) {
    assertCurrentDate()
    const updated = await mutate((signal) => saveMood(client, input, signal))
    setData((current) => current ? { ...current, date: updated.date, entry: updated } : current)
  }
  async function toggleHabit(habitId: string, done: boolean, note?: string | null) {
    assertCurrentDate()
    const currentNote = data?.entry?.habits?.find((log) => log.habitId === habitId)?.note
    try {
      const updated = await mutate((signal) => saveHabitLog(client, habitId, done, signal, note === undefined ? currentNote : note))
      setData((current) => current && { ...current, date: updated.date, entry: updated })
    } catch (reason) {
      if (reason instanceof ApiRequestError && reason.status === 409 && reason.code === 'HABIT_ARCHIVED') reload()
      throw reason
    }
  }
  const loggedIds = new Set(data?.entry?.habits?.map((log) => log.habitId))
  return { refresh, date: data?.date, entry: data?.entry ?? null, habits: data?.habits.filter((habit) => habit.active || loggedIds.has(habit.id)) ?? [], isLoading, error, reload, retryAt, updateMood, toggleHabit }
}
