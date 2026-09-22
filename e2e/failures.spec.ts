import { expect, test, type Page, type Route } from '@playwright/test'
import { resetTestData } from './support/reset.ts'

test.describe.configure({ mode: 'serial' })
test.beforeAll(async ({ request }) => resetTestData(request))

const envelope = (data: unknown) => ({ success: true, data, timestamp: new Date().toISOString() })
const errorEnvelope = (status: number, message: string) => ({
  success: false,
  error: { status, code: `HTTP_${status}`, message, path: '/test', errors: [] },
  timestamp: new Date().toISOString(),
})

async function fulfillJson(route: Route, status: number, json: unknown) {
  await route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(json) })
}

async function mockEmptyHabits(page: Page) {
  await page.route('**/habits?**', (route) => fulfillJson(route, 200, envelope([])))
}

for (const [status, expected] of [
  [401, 'session has expired'],
  [403, 'do not have permission'],
  [500, 'having trouble'],
] as const) {
  test(`shows a safe message for HTTP ${status}`, async ({ page }) => {
    await page.route('**/dashboard', (route) => fulfillJson(route, status, errorEnvelope(status, 'internal implementation detail')))
    await page.goto('/dashboard')
    await expect(page.getByRole('alert')).toContainText(expected)
    await expect(page.getByRole('alert')).not.toContainText('internal implementation detail')
  })
}

test('shows a connection message when a request times out', async ({ page }) => {
  await page.route('**/dashboard', (route) => route.abort('timedout'))
  await page.goto('/dashboard')
  await expect(page.getByRole('alert')).toContainText('Check your connection')
})

test('renders backend validation errors on habit creation', async ({ page }) => {
  await mockEmptyHabits(page)
  await page.route('**/habits', async (route) => {
    if (route.request().method() !== 'POST') return route.fallback()
    await fulfillJson(route, 400, {
      ...errorEnvelope(400, 'Please fix the highlighted fields.'),
      error: { status: 400, code: 'VALIDATION_FAILED', message: 'Name is already in use.', errors: [{ field: 'name', message: 'Already exists.' }] },
    })
  })
  await page.goto('/habits')
  await page.getByRole('button', { name: 'New habit' }).click()
  await page.getByLabel('Habit name').fill('Duplicate')
  await page.getByRole('button', { name: 'Create habit' }).click()
  await expect(page.getByRole('alert')).toContainText('Name is already in use.')
})

test('locks a mutation while its request is in flight', async ({ page }) => {
  await mockEmptyHabits(page)
  let createCount = 0
  await page.route('**/habits', async (route) => {
    if (route.request().method() !== 'POST') return route.fallback()
    createCount += 1
    await new Promise((resolve) => setTimeout(resolve, 300))
    await fulfillJson(route, 201, envelope({ id: 'habit-1', userId: 'user-1', name: 'Walk', targetFrequency: 'DAILY', active: true, version: 0 }))
  })
  await page.goto('/habits')
  await page.getByRole('button', { name: 'New habit' }).click()
  await page.getByLabel('Habit name').fill('Walk')
  const submit = page.getByRole('button', { name: 'Create habit' })
  const pendingClick = submit.click()
  await expect(page.getByRole('button', { name: 'Creating…' })).toBeDisabled()
  await pendingClick
  expect(createCount).toBe(1)
})

test('reports Cloudinary success followed by backend confirm failure', async ({ page }) => {
  await page.route('**/me/avatar', (route) => fulfillJson(route, 200, envelope(null)))
  await page.route('**/me/avatar/upload-signature', (route) => fulfillJson(route, 200, envelope({
    uploadUrl: 'https://upload.test/avatar', apiKey: 'key', publicId: 'avatar-1', signature: 'signature', timestamp: 1234,
  })))
  await page.route('https://upload.test/avatar', (route) => fulfillJson(route, 200, { version: 1 }))
  await page.route('**/me/avatar/confirm', (route) => fulfillJson(route, 500, errorEnvelope(500, 'database details')))
  await page.goto('/profile')
  await page.locator('input[type="file"]').setInputFiles('src/assets/hero.png')
  await expect(page.getByRole('alert')).toContainText('having trouble')
  await expect(page.getByRole('alert')).not.toContainText('database details')
})

test('renders empty states for habits, entries, stats, and search', async ({ page }) => {
  await mockEmptyHabits(page)
  await page.route('**/entries?**', (route) => fulfillJson(route, 200, envelope({ items: [], page: 0, size: 20, totalElements: 0, totalPages: 0, hasNext: false })))
  await page.route('**/stats/mood-trend?**', (route) => fulfillJson(route, 200, envelope([])))
  await page.route('**/stats/most-missed-habits', (route) => fulfillJson(route, 200, envelope([])))
  await page.route('**/entries/search?**', (route) => fulfillJson(route, 200, envelope({ items: [], page: 0, size: 20, totalElements: 0, totalPages: 0, hasNext: false })))

  await page.goto('/habits')
  await expect(page.getByText('Plant your first tiny habit')).toBeVisible()
  await page.goto('/entries')
  await expect(page.getByText('Your story starts today')).toBeVisible()
  await page.goto('/stats')
  await expect(page.getByText('Your patterns will bloom here')).toBeVisible()
  await page.goto('/search?q=no-match')
  await expect(page.getByText(/No moments matched/)).toBeVisible()
})
