import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { parseEnv } from 'node:util'

// Vite's automatic .env.local fallback is disabled; choose files explicitly.
export function resolveEnvironment(mode) {
  if (['development', 'local'].includes(mode)) return 'local'
  if (mode === 'test') return 'test'
  if (['production', 'analyze'].includes(mode)) return 'production'
  throw new Error('Environment must be local, test or production (development/analyze are Vite aliases).')
}

export function loadEnvironment(mode, root = process.cwd(), inherited = process.env) {
  const target = resolveEnvironment(mode)
  const files = target === 'local'
    ? ['.env.local']
    : target === 'test' ? ['.env.test', '.env.test.local']
      : ['.env.production', '.env.production.local']
  const values = {}
  for (const name of inherited.MOODLY_ENV_SOURCE === 'process' ? [] : files) {
    try { Object.assign(values, parseEnv(readFileSync(join(root, name), 'utf8'))) }
    catch (error) { if (error.code !== 'ENOENT') throw error }
  }
  for (const [key, value] of Object.entries(inherited)) {
    if (value !== undefined) values[key] = value
  }
  return values
}
