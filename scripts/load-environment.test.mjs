import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, writeFileSync, unlinkSync, rmdirSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { loadEnvironment } from './load-environment.mjs'

function fixture(t) {
  const root = mkdtempSync(join(tmpdir(), 'moodly-env-'))
  const files = {
    '.env.local': 'VITE_API_BASE_URL=http://local.invalid\nLOCAL_ONLY=private-local\n',
    '.env.test': 'VITE_API_BASE_URL=http://test-base.invalid\n',
    '.env.test.local': 'VITE_API_BASE_URL=http://test.invalid\nE2E_DATA_RESET_TOKEN=synthetic\n',
    '.env.production.local': 'VITE_API_BASE_URL=https://production.invalid\n',
  }
  for (const [name, content] of Object.entries(files)) writeFileSync(join(root, name), content)
  t.after(() => { for (const name of Object.keys(files)) unlinkSync(join(root, name)); rmdirSync(root) })
  return root
}
test('development loads local configuration', t => {
  assert.equal(loadEnvironment('development', fixture(t), {}).VITE_API_BASE_URL, 'http://local.invalid')
})
for (const mode of ['test', 'production', 'analyze']) {
  test(`${mode} never inherits local file values`, t => {
    const result = loadEnvironment(mode, fixture(t), {})
    assert.equal(result.LOCAL_ONLY, undefined)
    assert.equal(result.VITE_API_BASE_URL, mode === 'test' ? 'http://test.invalid' : 'https://production.invalid')
    if (mode !== 'test') assert.equal(result.E2E_DATA_RESET_TOKEN, undefined)
  })
}
test('CI variables override file values', t => {
  assert.equal(loadEnvironment('test', fixture(t), { VITE_API_BASE_URL: 'https://ci.invalid' }).VITE_API_BASE_URL, 'https://ci.invalid')
})
