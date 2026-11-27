import { expect, test } from '@playwright/test'
import { resetTestData } from './support/reset.ts'
import { restoreAuthSession } from './support/authSession.ts'

test.skip(process.env.E2E_HABITS_BENCHMARK !== '1', 'Explicit local benchmark opt-in required.')

type LoadTiming = {
  pageMs: number
  listMs: number
  streakMs: number[]
  slowestStreakMs: number
  streakGroupMs: number
  afterApiMs: number
}

function summarize(values: number[]) {
  const sorted = [...values].sort((a, b) => a - b)
  const middle = Math.floor(sorted.length / 2)
  const median = sorted.length % 2 === 0 ? (sorted[middle - 1] + sorted[middle]) / 2 : sorted[middle]
  return {
    samples: sorted.length,
    medianMs: Math.round(median),
    p95Ms: Math.round(sorted[Math.ceil(0.95 * sorted.length) - 1]),
    p99Ms: Math.round(sorted[Math.ceil(0.99 * sorted.length) - 1]),
  }
}

test('measures Habits with two and ten active habits on mobile', async ({ page, request }) => {
  test.setTimeout(360_000)
  const api = new URL(process.env.VITE_API_BASE_URL ?? '')
  expect(['localhost', '127.0.0.1', '[::1]']).toContain(api.hostname)
  await resetTestData(request)
  await restoreAuthSession(page)
  await page.setViewportSize({ width: 390, height: 844 })

  // Mark the first DOM update with the expected card count on each navigation.
  // Resource Timing and this mark share the same browser clock.
  await page.addInitScript(() => {
    const seenCounts = new Set<number>()
    const observer = new MutationObserver(() => {
      const count = Array.from(document.querySelectorAll('main button'))
        .filter((button) => button.textContent?.trim() === 'Archive').length
      if (count > 0 && !seenCounts.has(count)) {
        seenCounts.add(count)
        performance.mark(`habits-cards-${count}`)
      }
    })
    observer.observe(document, { childList: true, subtree: true, characterData: true })
  })

  const responses: { startTime: number; status: number }[] = []
  page.on('response', (response) => {
    const url = new URL(response.url())
    if (response.request().method() === 'GET' && url.origin === api.origin &&
        (url.pathname === '/habits' || /^\/habits\/[^/]+\/streak$/.test(url.pathname))) {
      responses.push({ startTime: response.request().timing().startTime, status: response.status() })
    }
  })

  const cards = page.getByRole('button', { name: 'Archive', exact: true })
  async function measure(count: number) {
    const samples: LoadTiming[] = []
    for (let index = 0; index <= 100; index++) {
      responses.length = 0
      const started = performance.now()
      await page.goto('/habits', { waitUntil: 'domcontentloaded' })
      await expect(cards).toHaveCount(count)
      const pageMs = performance.now() - started

      const { timeOrigin, ...timing } = await page.evaluate(({ origin, count }) => {
        const list: PerformanceResourceTiming[] = []
        const streaks: PerformanceResourceTiming[] = []
        for (const entry of performance.getEntriesByType('resource') as PerformanceResourceTiming[]) {
          if (entry.initiatorType !== 'fetch') continue
          const url = new URL(entry.name)
          if (url.origin !== origin) continue
          if (url.pathname === '/habits') list.push(entry)
          if (/^\/habits\/[^/]+\/streak$/.test(url.pathname)) streaks.push(entry)
        }
        const cardsReady = performance.getEntriesByName(`habits-cards-${count}`, 'mark')[0]
        if (list.length !== 1 || streaks.length !== count || !cardsReady) {
          throw new Error(`Incomplete Habits timing: list=${list.length}, streaks=${streaks.length}, DOM mark=${Boolean(cardsReady)}`)
        }
        const lastStreakEnd = Math.max(...streaks.map((entry) => entry.responseEnd))
        const firstStreakStart = Math.min(...streaks.map((entry) => entry.startTime))
        const streakMs = streaks.map((entry) => entry.duration)
        return {
          timeOrigin: performance.timeOrigin,
          listMs: list[0].duration,
          streakMs,
          slowestStreakMs: Math.max(...streakMs),
          streakGroupMs: lastStreakEnd - firstStreakStart,
          afterApiMs: cardsReady.startTime - Math.max(list[0].responseEnd, lastStreakEnd),
        }
      }, { origin: api.origin, count })

      const currentResponses = responses.filter((response) => response.startTime >= timeOrigin)
      expect(currentResponses.every(({ status }) => status >= 200 && status < 300)).toBe(true)
      await expect(page.getByText('Streak unavailable')).toHaveCount(0)
      expect(timing.listMs).toBeGreaterThan(0)
      expect(timing.streakMs.every((duration) => duration > 0)).toBe(true)
      expect(timing.afterApiMs).toBeGreaterThanOrEqual(0)
      if (index > 0) samples.push({ pageMs, ...timing })
    }

    const metrics = [
      { metric: 'Page load', ...summarize(samples.map((sample) => sample.pageMs)) },
      { metric: 'Habit list request', ...summarize(samples.map((sample) => sample.listMs)) },
      { metric: 'Individual streak request', ...summarize(samples.flatMap((sample) => sample.streakMs)) },
      { metric: 'Slowest streak per load', ...summarize(samples.map((sample) => sample.slowestStreakMs)) },
      { metric: 'Parallel streak group', ...summarize(samples.map((sample) => sample.streakGroupMs)) },
      { metric: 'Last response to cards in DOM', ...summarize(samples.map((sample) => sample.afterApiMs)) },
    ]
    return { activeHabits: count, habitRequestsPerLoad: 1 + count, metrics, samples }
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
  console.table(result.flatMap(({ activeHabits, metrics }) => metrics.map((metric) => ({ activeHabits, ...metric }))))
})
