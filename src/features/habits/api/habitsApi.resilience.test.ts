import { vi } from 'vitest'
import { listHabitStreaks } from './habitsApi.ts'

const currentStreak = vi.hoisted(() => vi.fn())
vi.mock('../../../api/openapi/sdk.api.ts', () => ({ currentStreak }))

const habit = (id: string) => ({ id, userId: 'user-1', name: id, targetFrequency: 'DAILY' as const, active: true, version: 0 })

describe('listHabitStreaks resilience', () => {
  beforeEach(() => currentStreak.mockReset())

  it('keeps successful streaks when another request fails', async () => {
    currentStreak
      .mockResolvedValueOnce({ data: { success: true, data: { currentStreak: 5 }, timestamp: '' } })
      .mockRejectedValueOnce(new Error('streak unavailable'))

    await expect(listHabitStreaks({} as never, [habit('one'), habit('two')])).resolves.toEqual({ one: 5 })
    expect(currentStreak).toHaveBeenCalledTimes(2)
  })

  it('distinguishes a zero streak from a missing response', async () => {
    currentStreak
      .mockResolvedValueOnce({ data: { success: true, data: { currentStreak: 0 }, timestamp: '' } })
      .mockResolvedValueOnce({ data: { success: true, data: undefined, timestamp: '' } })

    await expect(listHabitStreaks({} as never, [habit('zero'), habit('missing')])).resolves.toEqual({ zero: 0 })
  })
})
