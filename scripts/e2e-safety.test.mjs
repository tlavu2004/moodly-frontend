import { test } from 'node:test'
import assert from 'node:assert/strict'
import { verifyTestConfiguration, resetTestData } from '../e2e/support/reset.ts'

const fixture = {
  E2E_TARGET: 'container', VITE_API_BASE_URL: 'http://127.0.0.1:8080/',
  E2E_DATA_RESET_URL: 'http://127.0.0.1:8080/internal/e2e/reset',
  E2E_DATA_RESET_TOKEN: 'synthetic-token',
  E2E_TEST_USER_EMAIL: 'synthetic@example.com', E2E_TEST_USER_PASSWORD: 'synthetic-password',
}
function setup(t) {
  const before = { ...process.env }
  Object.assign(process.env, fixture)
  delete process.env.E2E_ALLOW_REMOTE_WRITES
  t.after(() => { for (const key of Object.keys(process.env)) if (!(key in before)) delete process.env[key]; Object.assign(process.env, before) })
  const calls = []
  const request = { post: async (...args) => { calls.push(args); return { ok: () => true } } }
  return { request, calls }
}
test('fixed-account BE reset uses token, disables redirects and never selects a user', async t => {
  const { request, calls } = setup(t)
  await resetTestData(request)
  assert.equal(calls.length, 1)
  assert.equal(calls[0][0], fixture.E2E_DATA_RESET_URL)
  assert.equal(calls[0][1].maxRedirects, 0)
  assert.deepEqual(calls[0][1].headers, { 'X-E2E-Reset-Token': 'synthetic-token' })
  assert.equal(calls[0][1].data, undefined)
})
for (const patch of [
  { E2E_DATA_RESET_URL: 'http://other.invalid/internal/e2e/reset' },
  { E2E_DATA_RESET_URL: 'http://127.0.0.1:8080/wrong-reset' },
  { E2E_DATA_RESET_URL: 'http://127.0.0.1:8080/internal/e2e/reset?token=secret' },
  { E2E_DATA_RESET_TOKEN: '' }, { E2E_TEST_USER_PASSWORD: '' },
  { E2E_TARGET: 'remote' },
  { VITE_API_BASE_URL: 'https://test.example.com', E2E_DATA_RESET_URL: 'https://test.example.com/internal/e2e/reset' },
]) {
  test('invalid/remote configuration fails before any write', async t => {
    const { request, calls } = setup(t); Object.assign(process.env, patch)
    await assert.rejects(resetTestData(request))
    assert.equal(calls.length, 0)
  })
}
test('explicitly authorized remote synthetic workflow requires HTTPS', t => {
  setup(t)
  Object.assign(process.env, { E2E_TARGET: 'remote', E2E_ALLOW_REMOTE_WRITES: '1',
    VITE_API_BASE_URL: 'https://test.example.com', E2E_DATA_RESET_URL: 'https://test.example.com/internal/e2e/reset' })
  assert.equal(verifyTestConfiguration().url, process.env.E2E_DATA_RESET_URL)
  process.env.VITE_API_BASE_URL = 'http://test.example.com'
  process.env.E2E_DATA_RESET_URL = 'http://test.example.com/internal/e2e/reset'
  assert.throws(verifyTestConfiguration, /HTTPS/)
})
test('BE refusal is never treated as a successful reset', async t => {
  setup(t)
  await assert.rejects(resetTestData({ post: async () => ({ ok: () => false, status: () => 403 }) }), /403/)
})

test('auth teardown removes only the current run and never consumes a previous run', async t => {
  setup(t)
  const { randomUUID } = await import('node:crypto')
  const { mkdir, writeFile, access, unlink, rmdir } = await import('node:fs/promises')
  const { default: teardown } = await import('../e2e/support/teardown.ts')
  const run = `playwright/.auth/${randomUUID()}`
  const previous = `playwright/.auth/${randomUUID()}`
  await mkdir(run, { recursive: true })
  await mkdir(previous, { recursive: true })
  await writeFile(`${run}/user.json`, '{}')
  await writeFile(`${run}/session.json`, '{}')
  await writeFile(`${previous}/user.json`, '{}')
  t.after(async () => { await unlink(`${previous}/user.json`); await rmdir(previous) })
  process.env.E2E_AUTH_DIR = run
  await teardown()
  await assert.rejects(access(run), { code: 'ENOENT' })
  await access(`${previous}/user.json`)
  await teardown() // interrupted/partial setup can leave nothing; cleanup is idempotent
})
