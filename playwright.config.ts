import { defineConfig, devices } from '@playwright/test'
import { randomUUID } from 'node:crypto'
import { loadEnvironment } from './scripts/load-environment.mjs'

const testEnv = loadEnvironment('test')
for (const [name, value] of Object.entries(testEnv)) {
  if (process.env[name] === undefined) process.env[name] = value
}
const target = process.env.E2E_TARGET ?? 'dev'
if (!['dev', 'container', 'remote'].includes(target)) throw new Error('E2E_TARGET must be dev, container or remote')
const baseURL = process.env.E2E_BASE_URL || 'http://127.0.0.1:5173'
const base = new URL(baseURL)
if (base.username || base.password || base.search || base.hash || base.pathname !== '/') throw new Error('E2E_BASE_URL must be an origin')
if (target !== 'remote' && base.origin !== 'http://127.0.0.1:5173') throw new Error('Workstation E2E requires http://127.0.0.1:5173')
if (target === 'remote' && (!process.env.E2E_BASE_URL || base.protocol !== 'https:')) throw new Error('Remote E2E requires an explicit HTTPS origin')
process.env.E2E_BASE_URL = base.origin
process.env.E2E_AUTH_DIR ??= `playwright/.auth/${randomUUID()}`

export default defineConfig({
  testDir: './e2e',
  globalSetup: './e2e/support/preflight.ts',
  globalTeardown: './e2e/support/teardown.ts',
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: process.env.CI ? [['html', { open: 'never' }], ['list']] : 'list',
  timeout: 30_000,
  expect: { timeout: 7_500 },
  use: {
    baseURL: base.origin,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    storageState: { cookies: [], origins: [] },
  },
  projects: [
    { name: 'public', testMatch: /public\.spec\.ts/, use: { ...devices['Desktop Chrome'] } },
    { name: 'auth-setup', testMatch: /auth\.setup\.ts/, use: { ...devices['Desktop Chrome'] } },
    {
      name: 'authenticated', dependencies: ['auth-setup'],
      testMatch: /(?:smoke|failures)\.spec\.ts/,
      use: { ...devices['Desktop Chrome'], storageState: `${process.env.E2E_AUTH_DIR}/user.json` },
    },
  ],
  webServer: target !== 'dev' ? undefined : {
    command: 'npm run dev -- --mode test',
    url: base.origin,
    reuseExistingServer: false,
    timeout: 120_000,
    env: { MOODLY_ENV: 'test' },
  },
})
