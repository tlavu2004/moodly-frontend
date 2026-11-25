import { act, renderHook, waitFor } from '@testing-library/react'
import { vi } from 'vitest'
import { normalizeApiError } from '../../../api/errors.ts'
import { useHabits } from './useHabits.ts'

const { client, changeHabitMock, createHabitMock, listHabitsMock, listHabitStreaksMock } = vi.hoisted(() => ({
  client: {},
  changeHabitMock: vi.fn(),
  createHabitMock: vi.fn(),
  listHabitsMock: vi.fn(),
  listHabitStreaksMock: vi.fn(),
}))

vi.mock('../../../api/useApiClient.ts', () => ({ useApiClient: () => client }))
vi.mock('../api/habitsApi.ts', () => ({
  createHabit: createHabitMock,
  changeHabit: changeHabitMock,
  listHabits: listHabitsMock,
  listHabitStreaks: listHabitStreaksMock,
}))

describe('useHabits', () => {
  it('appends a successfully created habit to the current list', async () => {
    const created = { id: 'habit-1', userId: 'user-1', name: 'Walk', targetFrequency: 'DAILY' as const, active: true, version: 0 }
    listHabitsMock.mockResolvedValue([])
    listHabitStreaksMock.mockResolvedValue({})
    createHabitMock.mockResolvedValue(created)
    const { result } = renderHook(() => useHabits())
    await waitFor(() => expect(result.current.isLoading).toBe(false))

    await act(() => result.current.add({ name: 'Walk', targetFrequency: 'DAILY' }))

    expect(result.current.habits).toEqual([created])
    expect(result.current.streaks).toEqual({ 'habit-1': 0 })
  })
})

it('does not fan out streak reads after the habits page unmounts', async () => {
  let finish!: (habits: never[]) => void
  listHabitStreaksMock.mockClear()
  listHabitsMock.mockReturnValue(new Promise<never[]>((done) => { finish = done }))
  const hook = renderHook(() => useHabits())
  const signal = listHabitsMock.mock.lastCall?.[1] as AbortSignal
  hook.unmount()
  expect(signal.aborted).toBe(true)
  await act(async () => finish([]))
  expect(listHabitStreaksMock).not.toHaveBeenCalled()
})

it('reloads on conflict and uses the refreshed version on an explicit resubmission', async () => {
  const original = { id: 'habit-1', name: 'Walk', active: true, version: 1 }
  const latest = { ...original, name: 'Morning walk', version: 2 }
  listHabitsMock.mockReset().mockResolvedValueOnce([original]).mockResolvedValue([latest])
  changeHabitMock.mockReset().mockRejectedValueOnce(normalizeApiError({ success: false, error: { code: 'HABIT_CONFLICT', message: 'Conflict' } }, new Response(null, { status: 409 }))).mockResolvedValueOnce({ ...latest, active: false, version: 3 })
  const { result } = renderHook(() => useHabits())
  await waitFor(() => expect(result.current.habits).toEqual([original]))
  await act(async () => {
    await expect(result.current.change(original.id, 'archive')).rejects.toThrow('Conflict')
  })
  await waitFor(() => expect(result.current.habits).toEqual([latest]))
  expect(changeHabitMock).toHaveBeenCalledTimes(1)
  await act(() => result.current.change(latest.id, 'archive'))
  expect(changeHabitMock.mock.lastCall?.[1]).toEqual(latest)
  expect(result.current.archived[0]?.version).toBe(3)
})
