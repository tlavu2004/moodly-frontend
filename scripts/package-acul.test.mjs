import assert from 'node:assert/strict'
import { test } from 'node:test'
import { createHash } from 'node:crypto'
import { createRelease } from './package-acul.mjs'

test('packages immutable asset URLs with SRI, application filters and exact prompt paths', () => {
  const js = Buffer.from('bundle'); const css = Buffer.from('styles')
  const plan = createRelease(js, css, 'https://cdn.example.com/auth', 'moodly-client')
  assert.equal(plan.config.filters.clients[0].id, 'moodly-client')
  assert.equal(plan.config.head_tags[0].attributes.src, `https://cdn.example.com/auth/${plan.release}/moodly-auth.js`)
  assert.deepEqual(plan.config.head_tags[0].attributes.integrity, ['sha384-' + createHash('sha384').update(js).digest('base64')])
  assert.equal(plan.screens.find((screen) => screen.screen === 'reset-password-request').endpoint, '/api/v2/prompts/reset-password/screen/reset-password-request/rendering')
  assert.equal(plan.config.use_page_template, false)
  assert.deepEqual(plan.config.context_configuration, ['screen.texts', 'tenant.enabled_locales', 'untrusted_data.authorization_params.ext-moodly-theme'])
  assert.notEqual(createRelease(Buffer.from('new bundle'), css, 'https://cdn.example.com/auth', 'moodly-client').release, plan.release)
})
test('rejects unsafe asset origins and absent app filtering', () => {
  for (const url of ['http://cdn.example.com', 'https://u:p@cdn.example.com', 'https://localhost', 'https://cdn.example.com/?token=secret', 'https://cdn.example.com/#fragment']) assert.throws(() => createRelease('js', 'css', url, 'client'))
  assert.throws(() => createRelease('js', 'css', 'https://cdn.example.com', ''))
})
