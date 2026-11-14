import { spawnSync } from 'node:child_process'
import { loadEnvironment } from './load-environment.mjs'
import { validateBuildEnvironment } from './validate-build-env.mjs'

const target = process.env.VERCEL_ENV === 'production' ? 'production' : (process.env.MOODLY_ENV ?? 'test')
try {
  validateBuildEnvironment(loadEnvironment(target), target)
  console.log(`PASS build configuration (${target}); values omitted`)
  const env = { ...process.env, MOODLY_ENV: target }
  for (const args of [['node_modules/typescript/bin/tsc', '-b'], ['node_modules/vite/bin/vite.js', 'build'], ['scripts/check-bundle-budget.mjs']]) {
    const result = spawnSync(process.execPath, args, { env, stdio: 'inherit' })
    if (result.error) throw new Error('Unable to start frontend build process.')
    if (result.status !== 0) { process.exitCode = result.status ?? 1; break }
  }
} catch (error) {
  console.error(error.message)
  process.exitCode = 1
}
