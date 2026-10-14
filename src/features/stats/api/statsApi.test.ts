import { vi } from 'vitest'
import { getStats } from './statsApi.ts'

const sdk = vi.hoisted(() => ({ moodTrend: vi.fn(), mostMissedHabits: vi.fn(), findByStatus: vi.fn() }))
vi.mock('../../../api/openapi/sdk.api.ts', () => sdk)

describe('getStats', () => {
  it('always requests the supported weekly period', async () => {
    const response = { data: { success: true, data: [], timestamp: '' } }
    sdk.moodTrend.mockResolvedValue(response)
    sdk.mostMissedHabits.mockResolvedValue(response)
    sdk.findByStatus.mockResolvedValue(response)

    await getStats({} as never)

    expect(sdk.moodTrend).toHaveBeenCalledWith(expect.objectContaining({ query: { period: 'week' } }))
  })
})
