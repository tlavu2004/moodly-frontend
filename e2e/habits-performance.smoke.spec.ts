import { expect, test } from '@playwright/test'
import { resetTestData } from './support/reset.ts'
import { restoreAuthSession } from './support/authSession.ts'

test.skip(process.env.E2E_HABITS_BENCHMARK !== '1', 'Explicit local benchmark opt-in required.')

test('measures Habits with two and ten active habits on mobile', async ({ page, request }) => {
  test.setTimeout(360_000)
  const api = new URL(process.env.VITE_API_BASE_URL ?? '')
  expect(['localhost', '127.0.0.1', '[::1]']).toContain(api.hostname)
  await resetTestData(request)
  await restoreAuthSession(page)
  await page.setViewportSize({ width: 390, height: 844 })

  let streakRequests = 0
  const failures: number[] = []
  page.on('response', (response) => {
    const url = new URL(response.url())
    if (url.origin !== api.origin || !/^\/habits\/[^/]+\/streak$/.test(url.pathname)) return
    streakRequests++
    if (!response.ok()) failures.push(response.status())
  })

  const cards = page.getByRole('button', { name: 'Archive', exact: true })
  async function measure(count: number) {
    const samples: number[] = []
    for (let index = 0; index <= 100; index++) {
      streakRequests = 0
      const started = performance.now()
      await page.goto('/habits', { waitUntil: 'domcontentloaded' })
      await expect(cards).toHaveCount(count)
      const elapsed = performance.now() - started
      expect(streakRequests).toBe(count)
      expect(failures).toEqual([])
      if (index > 0) samples.push(elapsed)
    }
    samples.sort((a, b) => a - b)
    return {
      activeHabits: count,
      samples: samples.length,
      medianMs: Math.round((samples[samples.length / 2 - 1] + samples[samples.length / 2]) / 2),
      p95Ms: Math.round(samples[Math.ceil(0.95 * samples.length) - 1]),
      p99Ms: Math.round(samples[Math.ceil(0.99 * samples.length) - 1]),
      habitRequestsPerLoad: 1 + count,
    }
  }

  const baseline = await measure(2)
  for (let index = 1; index <= 8; index++) {
    const name = `Benchmark habit ${index}`
    await page.getByRole('button', { name: 'New habit' }).click()
    await page.getByLabel('Habit name').fill(name)
    await page.getByRole('button', { name: 'Create habit' }).click()
    await expect(page.getByRole('heading', { name, exact: true })).toBeVisible()
  }
  await page.goto('/today')
  for (let index = 1; index <= 8; index++) {
    const button = page.getByRole('button', { name: `Benchmark habit ${index}`, exact: true })
    await button.click()
    await expect(button).toHaveAttribute('aria-pressed', 'true')
  }

  const result = [baseline, await measure(10)]
  await test.info().attach('habits-performance', { body: JSON.stringify(result, null, 2), contentType: 'application/json' })
  console.table(result)
})
