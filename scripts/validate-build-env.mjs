import { isIP } from 'node:net'
import { pathToFileURL } from 'node:url'
import { loadEnvironment } from './load-environment.mjs'

const required = ['VITE_AUTH0_DOMAIN', 'VITE_AUTH0_CLIENT_ID', 'VITE_AUTH0_AUDIENCE', 'VITE_API_BASE_URL']
const nonPublic = (hostname) => {
  const host = hostname.toLowerCase().replace(/^\[|\]$/g, '').replace(/\.$/, '')
  if (isIP(host)) return true // Production endpoints must use public DNS names.
  return !host.includes('.') || /(^|\.)(localhost|local|internal|test|invalid|example)$/.test(host)
    || /(^|\.)example\.(com|org|net)$/.test(host)
}

export function validateBuildEnvironment(source, target) {
  if (!['local', 'test', 'production'].includes(target)) throw new Error('MOODLY_ENV must be local, test or production')
  const values = Object.fromEntries(required.map((key) => [key, String(source[key] ?? '').trim()]))
  const fail = (key, reason) => { throw new Error(`${key}: ${reason}`) }
  for (const key of required) if (!values[key]) fail(key, 'required')
  const domain = values.VITE_AUTH0_DOMAIN
  if (!/^(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]*[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}$/.test(domain)) {
    fail('VITE_AUTH0_DOMAIN', 'expected a hostname without scheme, port or path')
  }
  if (/\s/.test(values.VITE_AUTH0_CLIENT_ID)) fail('VITE_AUTH0_CLIENT_ID', 'must not contain whitespace')
  // Auth0 audiences are identifiers and need not be HTTP URLs.
  if (/\s/.test(values.VITE_AUTH0_AUDIENCE)) fail('VITE_AUTH0_AUDIENCE', 'must not contain whitespace')
  let api
  try { api = new URL(values.VITE_API_BASE_URL) } catch { fail('VITE_API_BASE_URL', 'expected an absolute HTTP(S) URL') }
  if (!['http:', 'https:'].includes(api.protocol) || api.username || api.password || api.search || api.hash) {
    fail('VITE_API_BASE_URL', 'use HTTP(S) without credentials, query or fragment')
  }
  if (target === 'production') {
    if (api.protocol !== 'https:' || nonPublic(api.hostname)) fail('VITE_API_BASE_URL', 'production requires HTTPS with a public DNS hostname')
    if (nonPublic(domain)) fail('VITE_AUTH0_DOMAIN', 'production requires a public DNS hostname')
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    const target = process.env.VERCEL_ENV === 'production' ? 'production' : (process.env.MOODLY_ENV ?? 'test')
    validateBuildEnvironment(loadEnvironment('production'), target)
    console.log(`PASS build configuration (${target}); values omitted`)
  } catch (error) {
    console.error(error.message)
    process.exitCode = 1
  }
}
