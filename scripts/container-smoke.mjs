import { spawnSync } from 'node:child_process'
import assert from 'node:assert/strict'

const base = new URL(process.argv[2] ?? 'http://127.0.0.1:4173')
const get = (path) => fetch(new URL(path, base), { signal: AbortSignal.timeout(10_000) })
const health = await get('/healthz')
assert.equal(health.status, 200)
assert.equal((await health.text()).trim(), 'ok')
let index
for (const path of ['/', '/dashboard', '/entries', '/index.html']) {
  const response = await get(path)
  assert.equal(response.status, 200, path)
  assert.match(response.headers.get('content-type') ?? '', /text\/html/)
  assert.match(response.headers.get('cache-control') ?? '', /no-store/)
  const body = await response.text()
  assert.ok(body.includes('id="root"'), path)
  index ??= body
}
const asset = index.match(/src="([^" ]+\.js)"/)?.[1]
assert.ok(asset, 'Application shell must reference a JavaScript entry')
const response = await get(asset)
assert.equal(response.status, 200)
assert.match(response.headers.get('content-type') ?? '', /javascript/)
assert.match(response.headers.get('cache-control') ?? '', /immutable/)
if (process.env.EXPECTED_BROWSER_API_URL) {
  assert.ok((await response.text()).includes(process.env.EXPECTED_BROWSER_API_URL), 'Static JavaScript must embed the expected browser API URL')
  const identityResponse = await get('/moodly-config.json')
  assert.match(identityResponse.headers.get('cache-control') ?? '', /no-store/)
  const identity = await identityResponse.json()
  assert.equal(identity.serving, 'static')
  assert.equal(identity.values.VITE_API_BASE_URL, process.env.EXPECTED_BROWSER_API_URL)
  console.log('PASS browser API URL embedded in static JavaScript and build identity')
}
assert.equal((await get('/assets/missing-file.js')).status, 404)
console.log('PASS container health, SPA routes, asset delivery, cache policy and missing asset 404')

// Optional container name enables a regression check for callback/search log leaks.
if (process.argv[3]) {
  const marker = 'moodly-private-query-7e8491'
  await get('/dashboard?code=' + marker + '&state=' + marker)
  await get('/assets/missing-file.js?note=' + marker)
  const result = spawnSync('docker', ['logs', process.argv[3]], { encoding: 'utf8' })
  assert.equal(result.status, 0, 'Unable to read container logs')
  assert.ok(!(result.stdout + result.stderr).includes(marker), 'Query values must not appear in access logs')
  console.log('PASS access logs exclude callback/search query values')
}
