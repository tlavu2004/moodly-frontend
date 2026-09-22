import { resolve } from 'node:path'
import { expect, test } from '@playwright/test'
import { resetTestData } from './support/reset.ts'

test.describe.configure({ mode: 'serial' })

const todayKey = () => {
  const today = new Date()
  return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
}

test.beforeAll(async ({ request }) => resetTestData(request))

test('profile synchronization precedes protected feature requests', async ({ page }) => {
  const requests: string[] = []
  page.on('request', (request) => {
    const pathname = new URL(request.url()).pathname
    if (pathname === '/auth/profile' || pathname === '/dashboard') requests.push(pathname)
  })
  await page.goto('/dashboard')
  await expect(page.getByRole('heading', { name: /Good (morning|afternoon|evening)/ })).toBeVisible()
  expect(requests.indexOf('/auth/profile')).toBeGreaterThanOrEqual(0)
  expect(requests.indexOf('/auth/profile')).toBeLessThan(requests.indexOf('/dashboard'))
})

test('critical habit, mood, history, stats, avatar, and search flow', async ({ page }) => {
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
  await page.getByRole('button', { name: /Morning walk/ }).click()
  await expect(page.getByText('Habit completed')).toBeVisible()

  await page.goto('/dashboard')
  await expect(page.getByText('100%')).toBeVisible()

  const today = todayKey()
  await page.goto(`/entries?from=${today}&to=${today}`)
  await expect(page.getByRole('heading', { name: 'Mood 5 of 5' })).toBeVisible()
  await expect(page.getByText('A grateful morning walk')).toBeVisible()

  await page.goto('/stats')
  await expect(page.getByText('This week')).toBeVisible()
  await expect(page.getByText('Check-ins')).toBeVisible()

  await page.goto('/profile')
  await page.locator('input[type="file"]').setInputFiles(resolve('src/assets/hero.png'))
  await expect(page.getByRole('img', { name: /avatar/ })).toBeVisible()
  await page.reload()
  await expect(page.getByRole('img', { name: /avatar/ })).toBeVisible()

  await page.goto('/search')
  await page.getByLabel('Search entries').fill('grateful')
  await page.getByRole('button', { name: 'Search' }).click()
  await expect(page).toHaveURL(/\?q=grateful/)
  await expect(page.getByText('A grateful morning walk')).toBeVisible()
  await expect(page.getByRole('link', { name: 'View in journal' })).toHaveAttribute('href', `/entries?from=${today}&to=${today}`)
})

test('logout returns to the public landing page', async ({ page }) => {
  await page.goto('/profile')
  await page.getByRole('button', { name: /Log out/ }).click()
  await expect(page).toHaveURL(/\/$/)
  await expect(page.getByRole('button', { name: 'Sign in' })).toBeVisible()
})
