import { expect, test, type Page } from '@playwright/test'

async function openHosted(page: Page, name = 'login', locale = 'en', dark = false) {
  const context = {
    screen: { name, links: { signup: '/u/signup?state=synthetic', login: '/u/login?state=synthetic', reset_password: '/u/reset?state=synthetic' } },
    prompt: { name }, client: { id: 'synthetic-client', name: 'Moodly' }, user: {},
    tenant: { enabled_locales: ['en', 'vi'] },
    untrusted_data: { authorization_params: { 'ext-moodly-theme': dark ? 'dark' : 'light' } },
    transaction: { locale, state: 'synthetic-state', connection: { name: 'Username-Password-Authentication', strategy: 'auth0', options: { signup_enabled: true, forgot_password_enabled: true, authentication_methods: { password: { enabled: true, policy: 'none', min_length: 1 }, passkey: { enabled: false } } } } },
  }
  await page.route('**/acul-preview', (route) => route.fulfill({ contentType: 'text/html', body: `<!doctype html><html><head><meta name="viewport" content="width=device-width, initial-scale=1"><script>window.universal_login_context=${JSON.stringify(context)}; window.syntheticSubmissions=[]; HTMLFormElement.prototype.submit=function(){window.syntheticSubmissions.push(Object.fromEntries(new FormData(this)))}</script></head><body></body></html>` }))
  await page.goto('/acul-preview')
  await page.addStyleTag({ path: 'dist-acul/moodly-auth.css' })
  await page.addScriptTag({ path: 'dist-acul/moodly-auth.js' })
}

test('compiled ACUL bundle renders and submits through Auth0 context without contacting Moodly', async ({ page }) => {
  await openHosted(page)
  await expect(page.getByRole('heading', { name: 'Welcome back to Moodly' })).toBeVisible()
  await page.getByLabel('Email or username').fill('synthetic@example.test')
  await page.getByLabel('Password', { exact: true }).fill('Synthetic-test-password')
  await page.getByRole('button', { name: 'Sign in', exact: true }).click()
  const submissions = await page.evaluate(() => (window as unknown as { syntheticSubmissions: Array<Record<string, string>> }).syntheticSubmissions)
  expect(submissions).toHaveLength(1)
  expect(submissions[0]).toMatchObject({ username: 'synthetic@example.test', password: 'Synthetic-test-password', state: 'synthetic-state' })
  expect(await page.evaluate(() => JSON.stringify({ ...localStorage, ...sessionStorage }))).not.toContain('Synthetic-test-password')
})

test('hosted Vietnamese signup uses the app palette on mobile and desktop', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await openHosted(page, 'signup', 'vi', true)
  await expect(page.locator('html')).toHaveAttribute('lang', 'vi')
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
  await expect(page.getByRole('heading', { name: 'Tạo không gian Moodly của bạn' })).toBeVisible()
  await page.getByLabel('Email', { exact: true }).fill('synthetic@example.test')
  await page.getByLabel('Mật khẩu', { exact: true }).fill('Synthetic-test-password!123')
  await expect(page.getByLabel('Mật khẩu', { exact: true })).toHaveAttribute('autocomplete', 'new-password')
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  await page.screenshot({ path: 'reports/acul-signup-vi-dark-mobile.png', fullPage: true, animations: 'disabled' })
  await page.setViewportSize({ width: 1440, height: 1000 })
  await page.screenshot({ path: 'reports/acul-signup-vi-dark-desktop.png', fullPage: true, animations: 'disabled' })
})
