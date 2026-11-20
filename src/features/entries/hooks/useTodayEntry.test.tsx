import { act, renderHook, waitFor } from '@testing-library/react'
import { vi } from 'vitest'
import { normalizeApiError } from '../../../api/errors.ts'
import { useTodayEntry } from './useTodayEntry.ts'

const { client, getTodayEntry, getActiveHabits, saveMood, saveHabitLog } = vi.hoisted(() => ({
  client: {},
  getTodayEntry: vi.fn(),
  getActiveHabits: vi.fn(),
  saveMood: vi.fn(),
  saveHabitLog: vi.fn(),
}))
vi.mock('../../../api/useApiClient.ts', () => ({ useApiClient: () => client }))
vi.mock('../api/entriesApi.ts', () => ({ getTodayEntry, getActiveHabits, saveMood, saveHabitLog }))

beforeEach(() => {
  vi.resetAllMocks()
  getActiveHabits.mockResolvedValue([])
})

it.each([401, 500, 503])('normalizes Today load failures at HTTP %s', async (status) => {
  getTodayEntry.mockRejectedValue(normalizeApiError({ success: false, error: { code: 'INTERNAL_SERVER_ERROR', message: 'private server detail' } }, new Response(null, { status })))
  const { result } = renderHook(() => useTodayEntry())
  await waitFor(() => expect(result.current.isLoading).toBe(false))
  expect(result.current.error).toContain(status === 401 ? 'session has expired' : 'having trouble')
  expect(result.current.error).not.toContain('private server detail')
})

it('applies the saved mood and habit log while preserving the active habits', async () => {
  const habits = [{ id: 'walk', name: 'Walk' }]
  const input = { score: 4, note: 'A good day' }
  const savedMood = { mood: input }
  const savedLog = { ...savedMood, habitLogs: [{ habitId: 'walk', done: true }] }
  getTodayEntry.mockResolvedValue(null)
  getActiveHabits.mockResolvedValue(habits)
  saveMood.mockResolvedValue(savedMood)
  saveHabitLog.mockResolvedValue(savedLog)
  const { result } = renderHook(() => useTodayEntry())

  await waitFor(() => expect(result.current.habits).toEqual(habits))
  await act(() => result.current.updateMood(input))
  expect(saveMood).toHaveBeenCalledWith(client, input, expect.any(AbortSignal))
  expect(result.current.entry).toEqual(savedMood)

  await act(() => result.current.toggleHabit('walk', true))
  expect(saveHabitLog).toHaveBeenCalledWith(client, 'walk', true, expect.any(AbortSignal))
  expect(result.current).toMatchObject({ entry: savedLog, habits })
})
