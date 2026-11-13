import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { parseEnv } from 'node:util'

// Vite's automatic .env.local fallback is disabled; choose files explicitly.
export function loadEnvironment(mode, root = process.cwd(), inherited = process.env) {
  const files = mode === 'development' || mode === 'local'
    ? ['.env.local']
    : mode === 'test' ? ['.env.test', '.env.test.local']
      : ['.env.production', '.env.production.local']
  const values = {}
  for (const name of files) {
    try { Object.assign(values, parseEnv(readFileSync(join(root, name), 'utf8'))) }
    catch (error) { if (error.code !== 'ENOENT') throw error }
  }
  for (const [key, value] of Object.entries(inherited)) {
    if (value !== undefined) values[key] = value
  }
  return values
}
