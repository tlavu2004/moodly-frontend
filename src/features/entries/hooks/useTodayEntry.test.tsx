import { renderHook, waitFor } from '@testing-library/react'
import { vi } from 'vitest'
import { normalizeApiError } from '../../../api/errors.ts'
import { useTodayEntry } from './useTodayEntry.ts'

const { client, getTodayEntry } = vi.hoisted(() => ({ client: {}, getTodayEntry: vi.fn() }))
vi.mock('../../../api/useApiClient.ts', () => ({ useApiClient: () => client }))
vi.mock('../api/entriesApi.ts', () => ({ getTodayEntry, getActiveHabits: () => Promise.resolve([]) }))

it.each([401, 500, 503])('normalizes Today load failures at HTTP %s', async (status) => {
  getTodayEntry.mockRejectedValue(normalizeApiError({ success: false, error: { code: 'INTERNAL_SERVER_ERROR', message: 'private server detail' } }, new Response(null, { status })))
  const { result } = renderHook(() => useTodayEntry())
  await waitFor(() => expect(result.current.isLoading).toBe(false))
  expect(result.current.error).toContain(status === 401 ? 'session has expired' : 'having trouble')
  expect(result.current.error).not.toContain('private server detail')
})
