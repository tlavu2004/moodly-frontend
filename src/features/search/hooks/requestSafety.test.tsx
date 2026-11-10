import { normalizeApiError } from '../../../api/errors.ts'
import { act, renderHook, waitFor } from '@testing-library/react'
import { vi } from 'vitest'
import { useEntries } from '../../entries/hooks/useEntries.ts'
import { useEntrySearch } from './useEntrySearch.ts'

const { client, getEntriesPageMock, searchEntriesPageMock } = vi.hoisted(() => ({
  client: {},
  getEntriesPageMock: vi.fn(),
  searchEntriesPageMock: vi.fn(),
}))

vi.mock('../../../api/useApiClient.ts', () => ({ useApiClient: () => client }))
vi.mock('../../entries/api/entriesApi.ts', () => ({ getEntriesPage: getEntriesPageMock }))
vi.mock('../api/searchApi.ts', () => ({ searchEntriesPage: searchEntriesPageMock }))

function deferred<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((next) => { resolve = next })
  return { promise, resolve }
}

describe('request cancellation and stale response protection', () => {
  beforeEach(() => vi.clearAllMocks())

  it('does not request blank queries or inverted date ranges', () => {
    renderHook(() => useEntrySearch('   '))
    renderHook(() => useEntrySearch('walk', '2026-09-22', '2026-09-01'))
    expect(searchEntriesPageMock).not.toHaveBeenCalled()
  })

  it('aborts the previous search and ignores its late response', async () => {
    const oldRequest = deferred<{ items: Array<{ entryId: string }>; totalElements: number; totalPages: number }>()
    const newRequest = deferred<{ items: Array<{ entryId: string }>; totalElements: number; totalPages: number }>()
    searchEntriesPageMock.mockReturnValueOnce(oldRequest.promise).mockReturnValueOnce(newRequest.promise)
    const { result, rerender } = renderHook(({ q }) => useEntrySearch(q), { initialProps: { q: 'old' } })
    const oldSignal = searchEntriesPageMock.mock.calls[0][3] as AbortSignal

    rerender({ q: 'new' })

    expect(oldSignal.aborted).toBe(true)
    await act(async () => newRequest.resolve({ items: [{ entryId: 'new-result' }], totalElements: 21, totalPages: 2 }))
    await waitFor(() => expect(result.current.results).toEqual([{ entryId: 'new-result' }]))
    await act(async () => oldRequest.resolve({ items: [{ entryId: 'old-result' }], totalElements: 1, totalPages: 1 }))
    expect(result.current.results).toEqual([{ entryId: 'new-result' }])
  })

  it('aborts the previous date-filtered history request', () => {
    getEntriesPageMock.mockReturnValue(new Promise(() => undefined))
    const { rerender } = renderHook(({ from, to }) => useEntries(from, to), {
      initialProps: { from: '2026-09-01', to: '2026-09-10' },
    })
    const oldSignal = getEntriesPageMock.mock.calls[0][4] as AbortSignal

    rerender({ from: '2026-09-02', to: '2026-09-10' })

    expect(oldSignal.aborted).toBe(true)
  })

  it('does not request inverted or future history ranges', async () => {
    const inverted = renderHook(() => useEntries('2026-09-22', '2026-09-01'))
    const future = renderHook(() => useEntries('2999-01-01', '2999-01-02'))

    await waitFor(() => expect(inverted.result.current.isLoading).toBe(false))
    await waitFor(() => expect(future.result.current.isLoading).toBe(false))
    expect(getEntriesPageMock).not.toHaveBeenCalled()
    expect(inverted.result.current.error).toContain('valid date range')
    expect(future.result.current.error).toContain('future dates')
  })
})

it.each([[500, 'INTERNAL_SERVER_ERROR'], [503, 'SEARCH_UNAVAILABLE']] as const)('shows a safe search error without automatically retrying %s / %s', async (status, code) => {
  vi.useFakeTimers()
  try {
    searchEntriesPageMock.mockReset().mockRejectedValue(normalizeApiError({ success: false, error: { status, code, message: 'hit has no source' } }, new Response(null, { status })))
    const { result, rerender } = renderHook(() => useEntrySearch('walk'))
    await act(async () => { await vi.advanceTimersByTimeAsync(60_000) })
    expect(result.current.error).toContain('having trouble')
    expect(result.current.error).not.toContain('source')
    expect(result.current.isLoading).toBe(false)
    rerender()
    await act(async () => { await vi.advanceTimersByTimeAsync(60_000) })
    expect(searchEntriesPageMock).toHaveBeenCalledTimes(1)
  } finally {
    vi.useRealTimers()
  }
})
