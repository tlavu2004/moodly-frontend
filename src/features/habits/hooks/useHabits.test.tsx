import { act, renderHook, waitFor } from '@testing-library/react'
import { vi } from 'vitest'
import { useHabits } from './useHabits.ts'

const { client, createHabitMock, listHabitsMock, listHabitStreaksMock } = vi.hoisted(() => ({
  client: {},
  createHabitMock: vi.fn(),
  listHabitsMock: vi.fn(),
  listHabitStreaksMock: vi.fn(),
}))

vi.mock('../../../api/useApiClient.ts', () => ({ useApiClient: () => client }))
vi.mock('../api/habitsApi.ts', () => ({
  createHabit: createHabitMock,
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
