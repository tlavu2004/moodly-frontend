const target = process.argv[2] ?? process.env.MOODLY_DEPLOY_URL

if (!target) {
  console.error('Usage: npm run smoke:deploy -- https://app.example.com')
  process.exit(2)
}

const baseUrl = new URL(target)
const localHosts = new Set(['localhost', '127.0.0.1', '[::1]'])
if (baseUrl.protocol !== 'https:' && !localHosts.has(baseUrl.hostname)) {
  throw new Error(`Refusing to smoke-test a non-HTTPS deployment: ${baseUrl.origin}`)
}

for (const path of ['/', '/dashboard']) {
  const url = new URL(path, baseUrl)
  const response = await fetch(url, {
    headers: { accept: 'text/html' },
    redirect: 'follow',
    signal: AbortSignal.timeout(10_000),
  })
  const body = await response.text()
  const contentType = response.headers.get('content-type') ?? ''

  if (!response.ok) throw new Error(`${url} returned HTTP ${response.status}`)
  if (!contentType.includes('text/html')) throw new Error(`${url} did not return HTML (${contentType || 'no content-type'})`)
  if (!body.includes('id="root"')) throw new Error(`${url} did not return the Moodly application shell`)

  console.log(`PASS ${url} (${response.status})`)
}
