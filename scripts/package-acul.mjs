import { createHash } from 'node:crypto'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

export const screenPrompts = {
  login: 'login', 'login-id': 'login-id', 'login-password': 'login-password',
  signup: 'signup', 'signup-id': 'signup-id', 'signup-password': 'signup-password',
  'reset-password-request': 'reset-password', 'reset-password': 'reset-password', 'reset-password-email': 'reset-password',
}
export function createRelease(js, css, assetBaseUrl, clientId) {
  if (!clientId || !/^[a-zA-Z0-9_-]+$/.test(clientId)) throw new Error('ACUL_CLIENT_ID must identify the Moodly application')
  const base = new URL(assetBaseUrl)
  if (base.protocol !== 'https:' || base.username || base.password || base.search || base.hash || ['localhost', '127.0.0.1'].includes(base.hostname)) throw new Error('ACUL_ASSET_BASE_URL must be a public HTTPS directory without credentials/query/fragment')
  if (!base.pathname.endsWith('/')) base.pathname += '/'
  const release = createHash('sha256').update(js).update(css).digest('hex').slice(0, 16)
  const sri = (content) => 'sha384-' + createHash('sha384').update(content).digest('base64')
  const config = {
    rendering_mode: 'advanced', default_head_tags_disabled: false, use_page_template: false,
    context_configuration: ['screen.texts', 'tenant.enabled_locales', 'untrusted_data.authorization_params.ext-moodly-theme'],
    head_tags: [
      { tag: 'script', attributes: { src: new URL(`${release}/moodly-auth.js`, base).href, defer: true, crossorigin: 'anonymous', integrity: [sri(js)] } },
      { tag: 'link', attributes: { rel: 'stylesheet', href: new URL(`${release}/moodly-auth.css`, base).href, crossorigin: 'anonymous', integrity: [sri(css)] } },
    ],
    filters: { match_type: 'includes_any', clients: [{ id: clientId }] },
  }
  return { release, config, screens: Object.entries(screenPrompts).map(([screen, prompt]) => ({ screen, prompt, endpoint: `/api/v2/prompts/${prompt}/screen/${screen}/rendering`, config })) }
}
async function main() {
  const [js, css] = await Promise.all([readFile('dist-acul/moodly-auth.js'), readFile('dist-acul/moodly-auth.css')])
  const configured = Boolean(process.env.ACUL_ASSET_BASE_URL && process.env.ACUL_CLIENT_ID)
  const packaged = createRelease(js, css, process.env.ACUL_ASSET_BASE_URL || 'https://YOUR_ASSET_HOST/acul/', process.env.ACUL_CLIENT_ID || 'YOUR_MOODLY_CLIENT_ID')
  const directory = resolve('dist-acul', packaged.release)
  await mkdir(directory, { recursive: true })
  await Promise.all([writeFile(resolve(directory, 'moodly-auth.js'), js), writeFile(resolve(directory, 'moodly-auth.css'), css)])
  await writeFile('dist-acul/rendering-plan.json', JSON.stringify({ readyForTenant: configured, ...packaged }, null, 2)+'\n')
  await writeFile('dist-acul/rollback-standard.json', JSON.stringify({ rendering_mode: 'standard' }, null, 2)+'\n')
  console.log(`ACUL release ${packaged.release}: compiled assets and SRI rendering plan are in dist-acul/.`)
  if (!configured) console.log('Template only: set ACUL_ASSET_BASE_URL and ACUL_CLIENT_ID, then rebuild before applying to Auth0.')
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) await main()
