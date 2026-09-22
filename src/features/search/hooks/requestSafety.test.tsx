import { act, renderHook, waitFor } from '@testing-library/react'
import { vi } from 'vitest'
import { useEntries } from '../../entries/hooks/useEntries.ts'
import { useEntrySearch } from './useEntrySearch.ts'

const { client, getEntriesMock, searchEntriesMock } = vi.hoisted(() => ({
  client: {},
  getEntriesMock: vi.fn(),
  searchEntriesMock: vi.fn(),
}))

vi.mock('../../../api/useApiClient.ts', () => ({ useApiClient: () => client }))
vi.mock('../../entries/api/entriesApi.ts', () => ({ getEntries: getEntriesMock }))
vi.mock('../api/searchApi.ts', () => ({ searchEntries: searchEntriesMock }))

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
    expect(searchEntriesMock).not.toHaveBeenCalled()
  })

  it('aborts the previous search and ignores its late response', async () => {
    const oldRequest = deferred<Array<{ entryId: string }>>()
    const newRequest = deferred<Array<{ entryId: string }>>()
    searchEntriesMock.mockReturnValueOnce(oldRequest.promise).mockReturnValueOnce(newRequest.promise)
    const { result, rerender } = renderHook(({ q }) => useEntrySearch(q), { initialProps: { q: 'old' } })
    const oldSignal = searchEntriesMock.mock.calls[0][2] as AbortSignal

    rerender({ q: 'new' })

    expect(oldSignal.aborted).toBe(true)
    await act(async () => newRequest.resolve([{ entryId: 'new-result' }]))
    await waitFor(() => expect(result.current.results).toEqual([{ entryId: 'new-result' }]))
    await act(async () => oldRequest.resolve([{ entryId: 'old-result' }]))
    expect(result.current.results).toEqual([{ entryId: 'new-result' }])
  })

  it('aborts the previous date-filtered history request', () => {
    getEntriesMock.mockReturnValue(new Promise(() => undefined))
    const { rerender } = renderHook(({ from, to }) => useEntries(from, to), {
      initialProps: { from: '2026-09-01', to: '2026-09-10' },
    })
    const oldSignal = getEntriesMock.mock.calls[0][3] as AbortSignal

    rerender({ from: '2026-09-02', to: '2026-09-10' })

    expect(oldSignal.aborted).toBe(true)
  })
})
