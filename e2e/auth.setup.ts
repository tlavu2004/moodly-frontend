import { mkdir, writeFile } from 'node:fs/promises'
import { dirname } from 'node:path'
import { expect, test as setup } from '@playwright/test'

import { verifyTestContract } from './support/reset.ts'

const authFile = `${process.env.E2E_AUTH_DIR}/user.json`

setup('authenticate synthetic test user', async ({ page, request }) => {
  const email = process.env.E2E_TEST_USER_EMAIL
  const password = process.env.E2E_TEST_USER_PASSWORD
  if (!email || !password) {
    throw new Error('E2E_TEST_USER_EMAIL and E2E_TEST_USER_PASSWORD are required for authenticated E2E tests.')
  }

  await verifyTestContract(request)
  await page.goto('/dashboard')
  await page.locator('input[name="username"], input[type="email"]').first().fill(email)
  await page.locator('input[name="password"], input[type="password"]').first().fill(password)
  await page.locator('button[type="submit"], input[type="submit"]').first().click()
  await expect(page).toHaveURL(/\/dashboard(?:[?#]|$)/)
  await expect(page.getByRole('heading', { name: /Good (morning|afternoon|evening)/ })).toBeVisible()

  await mkdir(dirname(authFile), { recursive: true })
  await page.context().storageState({ path: authFile })
  const entries = await page.evaluate(() => Object.keys(sessionStorage)
    .filter((key) => key.startsWith('moodly:auth:'))
    .map((key) => [key, sessionStorage.getItem(key)] as const)
    .filter((entry): entry is readonly [string, string] => entry[1] !== null))
  if (entries.length === 0) throw new Error('Auth0 session cache was not available after login.')
  await writeFile(`${process.env.E2E_AUTH_DIR}/session.json`, JSON.stringify({ origin: new URL(page.url()).origin, entries }))
})
