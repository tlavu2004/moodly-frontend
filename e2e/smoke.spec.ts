import { toMoodlyDateKey } from '../src/utils/date.ts'
import { resolve } from 'node:path'
import { expect, test } from '@playwright/test'
import { resetTestData } from './support/reset.ts'
import { restoreAuthSession } from './support/authSession.ts'

test.describe.configure({ mode: 'serial' })

test.beforeAll(async ({ request }) => resetTestData(request))
test.beforeEach(async ({ page }) => restoreAuthSession(page))

test('profile synchronization precedes protected feature requests', async ({ page }) => {
  const requests: string[] = []
  page.on('request', (request) => {
    if (request.isNavigationRequest()) return
    const pathname = new URL(request.url()).pathname
    if (pathname === '/auth/profile' || pathname === '/dashboard') requests.push(pathname)
  })
  await page.goto('/dashboard')
  await expect(page.getByRole('heading', { name: /Good (morning|afternoon|evening)/ })).toBeVisible()
  expect(requests.indexOf('/auth/profile')).toBeGreaterThanOrEqual(0)
  expect(requests.indexOf('/auth/profile')).toBeLessThan(requests.indexOf('/dashboard'))
})

test('critical habit, mood, history, stats, avatar, and search flow', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/habits')
  await page.getByRole('button', { name: 'New habit' }).click()
  await page.getByLabel('Habit name').fill('Morning walk')
  await page.getByRole('button', { name: 'Use 🏃 icon' }).click()
  await page.getByRole('button', { name: 'Create habit' }).click()
  await expect(page.getByRole('heading', { name: 'Morning walk' })).toBeVisible()

  await page.goto('/today')
  await page.getByRole('button', { name: /Great/ }).click()
  await page.getByLabel(/A note to yourself/).fill('A grateful morning walk')
  await page.getByRole('button', { name: 'Grateful' }).click()
  await page.getByRole('button', { name: /Save check-in/ }).click()
  await expect(page.getByText('Your check-in is saved')).toBeVisible()
  const walk = page.getByRole('article').filter({ has: page.getByRole('button', { name: 'Morning walk' }) })
  await walk.getByRole('button', { name: 'Add habit note' }).click()
  await walk.getByLabel('Habit note').fill('Two laps')
  await walk.getByRole('button', { name: 'Save note' }).click()
  await expect(walk.getByText('Two laps')).toBeVisible()
  await walk.getByRole('button', { name: 'Morning walk' }).click()
  await expect(page.getByText('Habit completed')).toBeVisible()

  await page.goto('/dashboard')
  await expect(page.getByText('33%')).toBeVisible()
  await expect(page.getByText('1 of 3 habits')).toBeVisible()

  const today = toMoodlyDateKey(new Date())
  await page.goto(`/entries?from=${today}&to=${today}`)
  await expect(page.getByRole('heading', { name: 'Mood 5 of 5' })).toBeVisible()
  await expect(page.getByText('A grateful morning walk')).toBeVisible()
  await expect(page.getByText('Two laps')).toBeVisible()

  await page.goto('/stats')
  const weeklyTrendRequest = page.waitForRequest((request) => request.url().includes('/stats/mood-trend'))
  await page.reload()
  expect(new URL((await weeklyTrendRequest).url()).searchParams.get('period')).toBe('week')
  await expect(page.getByText('This week, Monday to Sunday')).toBeVisible()
  await expect(page.getByRole('columnheader', { name: 'Check-ins' })).toBeVisible()

  await page.goto('/profile')
  await page.locator('input[type="file"]').setInputFiles({ name: 'avatar.gif', mimeType: 'image/gif', buffer: Buffer.from('not-an-image') })
  await expect(page.getByRole('alert')).toContainText('JPG, PNG, or WebP')
  await page.locator('input[type="file"]').setInputFiles({ name: 'large.png', mimeType: 'image/png', buffer: Buffer.alloc(5 * 1024 * 1024 + 1) })
  await expect(page.getByRole('alert')).toContainText('5 MB or smaller')
  const confirmed = page.waitForResponse((response) => new URL(response.url()).pathname === '/me/avatar/confirm' && response.request().method() === 'POST')
  await page.locator('input[type="file"]').setInputFiles(resolve('src/assets/hero.png'))
  const confirmation = await confirmed
  expect(confirmation.ok()).toBe(true)
  const customPhoto: string = (await confirmation.json()).data.deliveryUrl
  const avatar = page.getByRole('main').getByRole('img', { name: /avatar/ })
  await expect(avatar).toHaveAttribute('src', customPhoto)
  await expect(page.getByRole('img', { name: /avatar/ })).toBeVisible()
  await page.reload()
  await expect(page.getByRole('img', { name: /avatar/ })).toBeVisible()

  await page.getByRole('button', { name: 'Remove photo' }).click()
  await expect(page.getByRole('button', { name: 'Remove photo' })).toHaveCount(0)
  await page.reload()
  await expect(page.getByRole('button', { name: 'Change photo' })).toBeEnabled()
  expect(await page.getByRole('img', { name: /avatar/ }).evaluateAll((images) => images.map((image) => image.getAttribute('src')))).not.toContain(customPhoto)

  await page.goto('/search')
  await page.getByLabel('Search entries').fill('grateful')
  await page.getByRole('button', { name: 'Search' }).click()
  await expect(page).toHaveURL(/\?q=grateful/)
  await page.getByLabel('From').fill(today)
  await expect(page).toHaveURL(new RegExp(`q=grateful.*from=${today}`))
  await page.getByLabel('To').fill(today)
  await expect(page).toHaveURL(new RegExp(`q=grateful.*from=${today}.*to=${today}`))
  await expect(page.getByText('A grateful morning walk')).toBeVisible()
  await expect(page.getByRole('link', { name: 'View in journal' })).toHaveAttribute('href', `/entries?from=${today}&to=${today}`)
})

test('reviews the latest habit after two-tab conflict and an archive race on mobile', async ({ page, context }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  const other = await context.newPage()
  await restoreAuthSession(other)
  try {
    await page.goto('/habits')
    await page.getByRole('button', { name: 'New habit' }).click()
    await page.getByLabel('Habit name').fill('Race test habit')
    await page.getByRole('button', { name: 'Create habit' }).click()
    await expect(page.getByRole('heading', { name: 'Race test habit' })).toBeVisible()
    await other.goto('/habits')
    const card = (target: typeof page, name: string) => target.getByRole('article').filter({ has: target.getByRole('heading', { name, exact: true }) })
    await card(page, 'Race test habit').getByRole('button', { name: 'Edit habit' }).click()
    await card(other, 'Race test habit').getByRole('button', { name: 'Edit habit' }).click()
    await other.getByLabel('Habit name').fill('Renamed in second tab')
    await other.getByRole('button', { name: 'Save habit' }).click()
    await expect(other.getByRole('heading', { name: 'Renamed in second tab' })).toBeVisible()
    await page.getByLabel('Habit name').fill('Stale edit')
    await page.getByRole('button', { name: 'Save habit' }).click()
    await expect(page.getByText(/This habit changed in another request/)).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Renamed in second tab' })).toBeVisible()

    await page.goto('/today')
    const toggle = page.getByRole('button', { name: 'Renamed in second tab' })
    await expect(toggle).toBeEnabled()
    await page.route('**/entries/today', async (route) => {
      if (route.request().method() !== 'PATCH') return route.continue()
      await card(other, 'Renamed in second tab').getByRole('button', { name: 'Archive' }).click()
      await expect(card(other, 'Renamed in second tab')).toHaveCount(0)
      await route.continue()
    }, { times: 1 })
    await toggle.click()
    await expect(page.getByText('This habit is archived and cannot receive new logs.')).toBeVisible()
    await expect(toggle).toHaveCount(0)
  } finally {
    await other.close()
  }
})

test('logout returns to the public landing page', async ({ page }) => {
  await page.goto('/profile')
  await page.getByRole('main').getByRole('button', { name: 'Log out' }).click()
  await expect(page).toHaveURL(/\/$/)
  await expect(page.getByRole('link', { name: 'Sign in' })).toBeVisible()
})
