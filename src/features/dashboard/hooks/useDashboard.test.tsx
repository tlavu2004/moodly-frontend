import { act, renderHook, waitFor } from '@testing-library/react'
import { vi } from 'vitest'
import { ApiRequestError } from '../../../api/errors.ts'
import { getDashboardData } from '../api/dashboardApi.ts'
import { useDashboard } from './useDashboard.ts'

const client = {}
vi.mock('../../../api/useApiClient.ts', () => ({ useApiClient: () => client }))
vi.mock('../api/dashboardApi.ts', () => ({ getDashboardData: vi.fn() }))

it('exposes a rate-limited dashboard read and recovers after a manual refresh', async () => {
  const retryAt = Date.now() + 30_000
  const dashboard = {
    activeHabits: [],
    completedHabitCount: 0,
    totalHabitCount: 0,
    completionRatio: 0,
    weeklyMood: { entryCount: 0 },
    bestCurrentStreak: 0,
  }
  vi.mocked(getDashboardData)
    .mockRejectedValueOnce(new ApiRequestError({ message: 'rate limited', status: 429, retryAt }))
    .mockResolvedValueOnce(dashboard)

  const { result } = renderHook(() => useDashboard())
  await waitFor(() => expect(result.current).toMatchObject({
    data: null,
    isLoading: false,
    retryAt,
    error: 'Too many requests. Please wait before trying again.',
  }))

  act(() => result.current.reload())
  await waitFor(() => expect(result.current).toMatchObject({ data: dashboard, error: null, retryAt: null }))
  expect(getDashboardData).toHaveBeenCalledTimes(2)
  expect(getDashboardData).toHaveBeenLastCalledWith(client, expect.any(AbortSignal))
})
