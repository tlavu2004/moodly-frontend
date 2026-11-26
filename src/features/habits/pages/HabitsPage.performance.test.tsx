/// <reference types="node" />
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import { mkdirSync, writeFileSync } from 'node:fs'
import { setTimeout as delay } from 'node:timers/promises'
import { vi } from 'vitest'
import { HabitsPage } from './HabitsPage.tsx'

const sdk = vi.hoisted(() => ({ findByStatus: vi.fn(), currentStreak: vi.fn() }))
vi.mock('../../../api/openapi/sdk.api.ts', () => sdk)
const client = vi.hoisted(() => ({}))
vi.mock('../../../api/useApiClient.ts', () => ({ useApiClient: () => client }))

it.skipIf(process.env.MOODLY_HABITS_FIXTURE_BENCHMARK !== '1')(
  'measures the Habits DOM with a timed API fixture',
  async () => {
    const result = []
    for (const count of [2, 10]) {
      const habits = Array.from({ length: count }, (_, index) => ({
        id: `habit-${index}`,
        name: `Benchmark habit ${index + 1}`,
        active: true,
        icon: 'walk',
        targetFrequency: 'DAILY',
        version: 4,
      }))
      sdk.findByStatus.mockImplementation(async () => {
        await delay(100)
        return { data: { data: habits } }
      })
      sdk.currentStreak.mockImplementation(async ({ path }) => {
        const index = Number(path.habitId.split('-')[1])
        await delay(100 + index * 20)
        return { data: { data: { currentStreak: index * 3 } } }
      })

      const samples: number[] = []
      for (let index = 0; index <= 100; index++) {
        sdk.findByStatus.mockClear()
        sdk.currentStreak.mockClear()
        const started = performance.now()
        render(<HabitsPage />)
        await waitFor(() => expect(screen.getAllByRole('button', { name: 'Archive' })).toHaveLength(count), { interval: 10 })
        if (index > 0) samples.push(performance.now() - started)
        expect(sdk.findByStatus).toHaveBeenCalledOnce()
        expect(sdk.currentStreak).toHaveBeenCalledTimes(count)
        expect(screen.queryByText('Streak unavailable')).toBeNull()
        cleanup()
      }
      samples.sort((a, b) => a - b)
      result.push({
        habits: count,
        samples: samples.length,
        medianMs: Math.round((samples[samples.length / 2 - 1] + samples[samples.length / 2]) / 2),
        p95Ms: Math.round(samples[Math.ceil(0.95 * samples.length) - 1]),
        p99Ms: Math.round(samples[Math.ceil(0.99 * samples.length) - 1]),
        requestsPerLoad: 1 + count,
      })
    }
    mkdirSync('reports', { recursive: true })
    writeFileSync('reports/habits-fixture-performance.json', JSON.stringify(result, null, 2) + '\n')
  },
  120_000,
)
