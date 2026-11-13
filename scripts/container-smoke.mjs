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
assert.equal((await get('/assets/missing-file.js')).status, 404)
console.log('PASS container health, SPA routes, asset delivery, cache policy and missing asset 404')
