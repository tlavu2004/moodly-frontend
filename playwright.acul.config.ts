import { defineConfig, devices } from '@playwright/test'
import standard from './playwright.config.ts'

// Explicit opt-in only: the current Auth0 plan uses standard Universal Login.
export default defineConfig({
  ...standard,
  projects: [{ name: 'acul-preview', testMatch: /hosted\.spec\.ts/, use: { ...devices['Desktop Chrome'] } }],
})
