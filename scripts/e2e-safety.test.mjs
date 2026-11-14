import { test } from 'node:test'
import assert from 'node:assert/strict'
import { verifyTestContract, resetTestData } from '../e2e/support/reset.ts'

const fixture = {
  E2E_TARGET: 'container', E2E_NAMESPACE: 'synthetic-run',
  VITE_API_BASE_URL: 'http://127.0.0.1:8082/',
  E2E_DATA_RESET_URL: 'http://127.0.0.1:8082/internal/e2e/reset',
  E2E_TEST_CONTRACT_URL: 'http://127.0.0.1:8082/internal/e2e/capabilities',
  E2E_DATA_RESET_TOKEN: 'synthetic-token',
  E2E_TEST_USER_EMAIL: 'synthetic@example.com',
}
function setup(t) {
  const before = { ...process.env }
  Object.assign(process.env, fixture)
  delete process.env.E2E_ALLOW_REMOTE_WRITES
  t.after(() => { for (const key of Object.keys(process.env)) if (!(key in before)) delete process.env[key]; Object.assign(process.env, before) })
  const capability = { environment: 'test', namespace: 'synthetic-run', protected: true, cleanupScope: 'namespace', resetUrl: fixture.E2E_DATA_RESET_URL, apiBaseUrl: fixture.VITE_API_BASE_URL, testUserEmail: fixture.E2E_TEST_USER_EMAIL }
  const calls = []
  const request = {
    get: async (...args) => { calls.push(['get', ...args]); return { status: () => 200, json: async () => capability } },
    post: async (...args) => { calls.push(['post', ...args]); return { ok: () => true } },
  }
  return { request, capability, calls }
}
test('only attested namespace reaches POST; redirects disabled and namespace supplied', async t => {
  const { request, calls } = setup(t)
  await resetTestData(request)
  assert.equal(calls.length, 2)
  assert.equal(calls[1][0], 'post')
  assert.equal(calls[1][2].maxRedirects, 0)
  assert.deepEqual(calls[1][2].data, { namespace: 'synthetic-run' })
})
for (const patch of [{ environment: 'local' }, { environment: 'production' }, { protected: false }, { namespace: 'another-user' }, { cleanupScope: 'all' }, { resetUrl: 'http://localhost:8080/reset' }, { testUserEmail: 'developer@example.com' }]) {
  test('reject unprotected or mismatched BE contract before reset', async t => {
    const { request, capability, calls } = setup(t)
    Object.assign(capability, patch)
    await assert.rejects(resetTestData(request), /reset is blocked/)
    assert.equal(calls.filter(([method]) => method === 'post').length, 0)
  })
}
test('URL containing test grants no cleanup permission', async t => {
  const { request, calls } = setup(t)
  delete process.env.E2E_NAMESPACE
  await assert.rejects(verifyTestContract(request), /protected namespace/)
  assert.equal(calls.length, 0)
})
test('remote writes require explicit authorization before any request', async t => {
  const { request, calls } = setup(t)
  process.env.E2E_TARGET = 'remote'
  await assert.rejects(verifyTestContract(request), /authorization/)
  assert.equal(calls.length, 0)
})
test('never send reset token to another origin', async t => {
  const { request, calls } = setup(t)
  process.env.E2E_TEST_CONTRACT_URL = 'http://other-test.invalid/contract'
  await assert.rejects(verifyTestContract(request), /configured browser API origin/)
  assert.equal(calls.length, 0)
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
