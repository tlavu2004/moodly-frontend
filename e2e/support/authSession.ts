import { readFile } from 'node:fs/promises'
import type { Page } from '@playwright/test'

type SavedAuthSession = { origin: string; entries: Array<readonly [string, string]> }

export async function restoreAuthSession(page: Page): Promise<void> {
  const session = JSON.parse(await readFile('playwright/.auth/session.json', 'utf8')) as SavedAuthSession
  if (!session.origin || !Array.isArray(session.entries) || session.entries.length === 0) {
    throw new Error('Saved Auth0 session cache is missing or invalid.')
  }
  await page.addInitScript(({ origin, entries }) => {
    if (location.origin !== origin) return
    const restoredKey = 'moodly:e2e-auth-restored'
    if (sessionStorage.getItem(restoredKey)) return
    sessionStorage.setItem(restoredKey, '1')
    for (const [key, value] of entries) sessionStorage.setItem(key, value)
  }, session)
}
