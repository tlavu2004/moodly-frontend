import { vi } from 'vitest'

const sdk = vi.hoisted(() => ({
  archive: vi.fn(), restore: vi.fn(), update: vi.fn(), delete_: vi.fn(),
  confirm: vi.fn(), create: vi.fn(), current: vi.fn(), currentStreak: vi.fn(),
  findBetween: vi.fn(), findByStatus: vi.fn(), getDashboard: vi.fn(), moodTrend: vi.fn(),
  mostMissedHabits: vi.fn(), search: vi.fn(), setTodayMood: vi.fn(), signature: vi.fn(),
  today: vi.fn(), updateTodayHabit: vi.fn(),
}))

vi.mock('./openapi/sdk.api.ts', () => sdk)

const client = {} as never
const envelope = <T,>(data: T) => ({ data: { success: true, data, timestamp: '2026-09-22T00:00:00Z' } })
const habit = { id: 'habit-1', userId: 'user-1', name: 'Walk', targetFrequency: 'DAILY' as const, active: true, version: 0 }

describe('feature API adapters', () => {
  beforeEach(() => vi.clearAllMocks())

  it('unwraps dashboard data and rejects a missing payload', async () => {
    const { getDashboardData } = await import('../features/dashboard/api/dashboardApi.ts')
    const dashboard = { totalHabitCount: 2 }
    sdk.getDashboard.mockResolvedValue(envelope(dashboard))
    await expect(getDashboardData(client)).resolves.toBe(dashboard)
    sdk.getDashboard.mockResolvedValue(envelope(undefined))
    await expect(getDashboardData(client)).rejects.toThrow('dashboard response was empty')
  })

  it('unwraps habit responses and handles missing list data safely', async () => {
    const { createHabit, listHabits, listHabitStreaks } = await import('../features/habits/api/habitsApi.ts')
    sdk.findByStatus.mockResolvedValue(envelope(undefined))
    await expect(listHabits(client)).resolves.toEqual([])
    sdk.create.mockResolvedValue(envelope(habit))
    await expect(createHabit(client, { name: 'Walk', targetFrequency: 'DAILY' })).resolves.toMatchObject({ id: 'habit-1' })
    sdk.currentStreak.mockResolvedValue(envelope({ currentStreak: 4 }))
    await expect(listHabitStreaks(client, [habit])).resolves.toEqual({ 'habit-1': 4 })
    sdk.create.mockResolvedValue(envelope(undefined))
    await expect(createHabit(client, { name: 'Walk', targetFrequency: 'DAILY' })).rejects.toThrow('without a response body')
  })

  it('unwraps entry lists, today data, and mutation responses safely', async () => {
    const { getEntriesPage, getTodayEntry, saveHabitLog, saveMood } = await import('../features/entries/api/entriesApi.ts')
    sdk.findBetween.mockResolvedValue(envelope(undefined))
    sdk.findByStatus.mockResolvedValue(envelope(undefined))
    sdk.today.mockResolvedValue(envelope(undefined))
    await expect(getEntriesPage(client, '2026-09-01', '2026-09-22', 0)).rejects.toThrow('entries response was empty')
    await expect(getTodayEntry(client)).resolves.toBeNull()
    sdk.setTodayMood.mockResolvedValue(envelope({ id: 'entry-1' }))
    sdk.updateTodayHabit.mockResolvedValue(envelope({ id: 'entry-1' }))
    await expect(saveMood(client, { score: 4 })).resolves.toMatchObject({ id: 'entry-1' })
    await expect(saveHabitLog(client, 'habit-1', false, undefined, null)).resolves.toMatchObject({ id: 'entry-1' })
    expect(sdk.updateTodayHabit).toHaveBeenLastCalledWith(expect.objectContaining({ body: { habitId: 'habit-1', done: false, note: null } }))
    sdk.setTodayMood.mockResolvedValue(envelope(undefined))
    await expect(saveMood(client, { score: 4 })).rejects.toThrow('response was empty')
  })

  it('unwraps stats and search collections with empty fallbacks', async () => {
    const { getStats } = await import('../features/stats/api/statsApi.ts')
    const { searchEntriesPage } = await import('../features/search/api/searchApi.ts')
    sdk.moodTrend.mockResolvedValue(envelope(undefined))
    sdk.mostMissedHabits.mockResolvedValue(envelope(undefined))
    sdk.findByStatus.mockResolvedValue(envelope(undefined))
    sdk.search.mockResolvedValue(envelope(undefined))
    await expect(getStats(client)).resolves.toEqual({ trends: [], missed: [], habits: [] })
    await expect(searchEntriesPage(client, { q: 'walk' }, 0)).rejects.toThrow('search response was empty')
  })

  it('returns no avatar for missing data', async () => {
    const { getAvatar } = await import('../features/profile/api/profileApi.ts')
    sdk.current.mockResolvedValue(envelope(undefined))
    await expect(getAvatar(client)).resolves.toBeNull()
  })
})

it('preserves totals and requests later pages for entries and search', async () => {
  const { getEntriesPage } = await import('../features/entries/api/entriesApi.ts')
  const { searchEntriesPage } = await import('../features/search/api/searchApi.ts')
  const page = { items: [{ id: 'entry-21' }], page: 1, size: 20, totalElements: 21, totalPages: 2, hasNext: false }
  sdk.findBetween.mockResolvedValue(envelope(page))
  sdk.search.mockResolvedValue(envelope(page))
  await expect(getEntriesPage(client, '2026-09-01', '2026-09-30', 1)).resolves.toEqual(page)
  await expect(searchEntriesPage(client, { q: 'walk' }, 1)).resolves.toEqual(page)
  expect(sdk.findBetween).toHaveBeenLastCalledWith(expect.objectContaining({ query: { from: '2026-09-01', to: '2026-09-30', page: 1, size: 20 } }))
  expect(sdk.search).toHaveBeenLastCalledWith(expect.objectContaining({ query: { q: 'walk', page: 1, size: 20 } }))
})

it('sends the supplied habit version on update, archive, and restore', async () => {
  const { changeHabit } = await import('../features/habits/api/habitsApi.ts')
  const signal = new AbortController().signal
  const edited = { ...habit, name: 'Read', icon: 'book', version: 4 }
  const archived = { ...edited, active: false, version: 5 }
  const restored = { ...archived, active: true, version: 6 }
  sdk.update.mockResolvedValue(envelope(edited))
  sdk.archive.mockResolvedValue(envelope(archived))
  sdk.restore.mockResolvedValue(envelope(restored))
  await expect(changeHabit(client, { ...habit, version: 3 }, { name: 'Read', icon: 'book' }, signal)).resolves.toBe(edited)
  await expect(changeHabit(client, edited, 'archive', signal)).resolves.toBe(archived)
  await expect(changeHabit(client, archived, 'restore', signal)).resolves.toBe(restored)
  const path = { habitId: habit.id }
  expect(sdk.update).toHaveBeenLastCalledWith(expect.objectContaining({ path, body: { name: 'Read', icon: 'book', version: 3 } }))
  expect(sdk.archive).toHaveBeenLastCalledWith(expect.objectContaining({ path, body: { version: 4 } }))
  expect(sdk.restore).toHaveBeenLastCalledWith(expect.objectContaining({ path, body: { version: 5 } }))
})

it('uses the cleared avatar returned by DELETE', async () => {
  const { removeAvatar } = await import('../features/profile/api/profileApi.ts')
  const signal = new AbortController().signal
  const cleared = {}
  sdk.delete_.mockResolvedValue(envelope(cleared))
  await expect(removeAvatar(client, signal)).resolves.toBe(cleared)
  expect(sdk.delete_).toHaveBeenLastCalledWith({ client, signal, throwOnError: true })
})
