import { expect, test } from '@playwright/test'

test('public landing is available without authentication', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: /Small habits/ })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Sign in' })).toBeVisible()
  await expect(page).toHaveURL(/\/$/)
})

test('a protected URL starts the Auth0 flow', async ({ page }) => {
  const appOrigin = new URL(process.env.E2E_BASE_URL ?? 'http://127.0.0.1:4173').origin
  let authorizationUrl = ''
  await page.route('**/authorize**', async (route) => {
    authorizationUrl = route.request().url()
    await route.fulfill({ status: 200, contentType: 'text/html', body: '<title>Auth0 sign in</title>' })
  })
  await page.goto('/dashboard')
  await expect.poll(() => authorizationUrl).toContain('/authorize?')
  expect(new URL(authorizationUrl).searchParams.get('redirect_uri')).toBe(appOrigin)
})

test('an unknown URL renders the intentional 404', async ({ page }) => {
  await page.goto('/definitely-not-a-route')
  await expect(page.getByRole('heading', { name: 'Page not found' })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Go to dashboard' })).toBeVisible()
})
