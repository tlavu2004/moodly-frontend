import { expect, test } from '@playwright/test'

test('public landing is available without authentication', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: /Small habits/ })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Sign in' })).toBeVisible()
  await expect(page).toHaveURL(/\/$/)
})

test('a protected URL preserves its destination through the introduction and starts Auth0', async ({ page }) => {
  const appOrigin = new URL(process.env.E2E_BASE_URL ?? 'http://127.0.0.1:4173').origin
  let authorizationUrl = ''
  await page.route('**/authorize**', async (route) => {
    authorizationUrl = route.request().url()
    await route.fulfill({ status: 200, contentType: 'text/html', body: '<title>Auth0 sign in</title>' })
  })
  await page.goto('/entries?from=2026-11-01&to=2026-11-14#saved')
  await expect(page).toHaveURL(/\/login\?returnTo=/)
  await expect(page.getByRole('heading', { name: 'Welcome back to Moodly' })).toBeVisible()
  await page.getByRole('button', { name: 'Continue to sign in' }).click()
  await expect.poll(() => authorizationUrl).toContain('/authorize?')
  expect(new URL(authorizationUrl).searchParams.get('redirect_uri')).toBe(appOrigin)
  expect(new URL(authorizationUrl).searchParams.get('ui_locales')).toBe('en')
  expect(new URL(authorizationUrl).searchParams.has('screen_hint')).toBe(false)
})

test('an unknown URL renders the intentional 404', async ({ page }) => {
  await page.goto('/definitely-not-a-route')
  await expect(page.getByRole('heading', { name: 'Page not found' })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Go to dashboard' })).toBeVisible()
})

test('language selection survives reload and keeps calendar dates localized', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('combobox', { name: 'Language' }).selectOption('vi')
  await expect(page.getByRole('heading', { name: /Thói quen nhỏ/ })).toBeVisible()
  await expect(page.locator('html')).toHaveAttribute('lang', 'vi')
  await expect(page.getByRole('link', { name: 'Đăng nhập', exact: true })).toBeVisible()
  await page.reload()
  await expect(page.getByRole('combobox', { name: 'Ngôn ngữ' })).toHaveValue('vi')
  await page.getByRole('combobox', { name: 'Ngôn ngữ' }).selectOption('en')
  await expect(page.getByRole('heading', { name: /Small habits/ })).toBeVisible()
})

test('theme follows the OS, persists overrides and works on mobile', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'dark' })
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/')
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
  const darkBackground = await page.locator('body').evaluate((element) => getComputedStyle(element).backgroundColor)
  await page.getByRole('combobox', { name: 'Theme' }).selectOption('light')
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light')
  expect(await page.locator('body').evaluate((element) => getComputedStyle(element).backgroundColor)).not.toBe(darkBackground)
  await page.reload()
  await expect(page.getByRole('combobox', { name: 'Theme' })).toHaveValue('light')
  await page.getByRole('combobox', { name: 'Theme' }).selectOption('system')
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
  await page.emulateMedia({ colorScheme: 'light' })
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light')
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
})

test('theme boot script applies saved preference before React loads', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('moodly.theme', 'dark'))
  await page.route('**/src/main.tsx', (route) => route.abort())
  await page.goto('/')
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
  expect(await page.locator('html').evaluate((element) => element.style.colorScheme)).toBe('dark')
})

test('semantic text and status colors remain readable in both themes', async ({ page }) => {
  await page.goto('/')
  for (const theme of ['light', 'dark']) {
    await page.getByRole('combobox', { name: 'Theme' }).selectOption(theme)
    const expectedBackground = await page.evaluate(() => { const sample = document.createElement('span'); sample.style.backgroundColor = 'var(--color-primary)'; document.body.append(sample); const value = getComputedStyle(sample).backgroundColor; sample.remove(); return value })
    await expect.poll(() => page.locator('.button-primary').first().evaluate((element) => getComputedStyle(element).backgroundColor)).toBe(expectedBackground)
    const ratios = await page.evaluate(() => {
      const css = getComputedStyle(document.documentElement)
      const canvas = document.createElement('canvas')
      canvas.width = canvas.height = 1
      const context = canvas.getContext('2d')!
      const luminance = (token: string) => {
        context.fillStyle = css.getPropertyValue(`--color-${token}`).trim()
        context.fillRect(0, 0, 1, 1)
        const rgb = [...context.getImageData(0, 0, 1, 1).data].slice(0, 3).map((channel) => {
          const value = channel / 255
          return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4
        })
        return rgb[0] * 0.2126 + rgb[1] * 0.7152 + rgb[2] * 0.0722
      }
      return [['foreground', 'background'], ['foreground-muted', 'surface'], ['primary-foreground', 'primary'], ['primary-foreground', 'primary-dark'], ['success-foreground', 'success'], ['danger', 'danger-soft']].map(([text, background]) => {
        const a = luminance(text); const b = luminance(background)
        return { pair: `${text}/${background}`, ratio: (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05) }
      })
    })
    for (const { pair, ratio } of ratios) expect(ratio, `${theme}: ${pair}`).toBeGreaterThanOrEqual(4.5)
  }
  await page.setViewportSize({ width: 390, height: 844 })
  await page.screenshot({ path: 'reports/theme-dark-mobile.png', fullPage: true, animations: 'disabled' })
  await page.getByRole('combobox', { name: 'Theme' }).selectOption('light')
  await page.setViewportSize({ width: 1440, height: 1000 })
  await page.screenshot({ path: 'reports/theme-light-desktop.png', fullPage: true, animations: 'disabled' })
})


test('signup uses the selected language on Universal Login', async ({ page }) => {
  let authorizationUrl = ''
  await page.route('**/authorize**', async (route) => {
    authorizationUrl = route.request().url()
    await route.fulfill({ status: 200, contentType: 'text/html', body: '<title>Auth0 signup</title>' })
  })
  await page.goto('/')
  await page.getByRole('link', { name: 'Start your journey' }).click()
  await expect(page).toHaveURL(/\/signup$/)
  await page.getByRole('combobox', { name: 'Language' }).selectOption('vi')
  await page.getByRole('combobox', { name: 'Giao diện' }).selectOption('dark')
  await expect(page.getByRole('heading', { name: 'Tạo không gian Moodly của bạn' })).toBeVisible()
  await page.setViewportSize({ width: 390, height: 844 })
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  await page.screenshot({ path: 'reports/auth-signup-vi-mobile.png', fullPage: true, animations: 'disabled' })
  await page.getByRole('button', { name: 'Tiếp tục tạo tài khoản' }).click()
  await expect.poll(() => authorizationUrl).toContain('/authorize?')
  const params = new URL(authorizationUrl).searchParams
  expect(params.get('screen_hint')).toBe('signup')
  expect(params.get('ui_locales')).toBe('vi')
  expect(params.get('ext-moodly-theme')).toBe('dark')
})

test('sign-in introduction keeps its destination when switching to signup', async ({ page }) => {
  await page.goto('/login?returnTo=%2Ftoday')
  await expect(page.getByRole('link', { name: 'Create account' })).toHaveAttribute('href', '/signup?returnTo=%2Ftoday')
  await page.getByRole('link', { name: 'Create account' }).click()
  await expect(page.getByRole('link', { name: 'Sign in', exact: true })).toHaveAttribute('href', '/login?returnTo=%2Ftoday')
  await page.getByRole('combobox', { name: 'Theme' }).selectOption('dark')
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
})
