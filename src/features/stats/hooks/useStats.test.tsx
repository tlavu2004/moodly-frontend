import { renderHook, waitFor } from '@testing-library/react'
import { vi } from 'vitest'
import { getStats } from '../api/statsApi.ts'
import { useStats } from './useStats.ts'

const client = {}
vi.mock('../../../api/useApiClient.ts', () => ({ useApiClient: () => client }))
vi.mock('../api/statsApi.ts', () => ({ getStats: vi.fn() }))

it('exposes empty insights while loading and replaces them with the returned data', async () => {
  const stats = {
    trends: [{ date: '2026-01-01', averageScore: 4, entryCount: 1 }],
    missed: [],
    habits: [],
  }
  vi.mocked(getStats).mockResolvedValueOnce(stats)
  const { result } = renderHook(() => useStats())

  expect(result.current).toMatchObject({ isLoading: true, trends: [], missed: [], habits: [] })
  await waitFor(() => expect(result.current).toMatchObject({ ...stats, isLoading: false, error: null }))
  expect(getStats).toHaveBeenCalledWith(client, expect.any(AbortSignal))
})
