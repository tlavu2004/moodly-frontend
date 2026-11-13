import { test } from 'node:test'
import assert from 'node:assert/strict'
import { validateBuildEnvironment as validate } from './validate-build-env.mjs'
const valid = {
  VITE_AUTH0_DOMAIN: 'tenant.auth0.com',
  VITE_AUTH0_CLIENT_ID: 'public-client',
  VITE_AUTH0_AUDIENCE: 'moodly-api',
  VITE_API_BASE_URL: 'https://api.moodly.app/api',
}
test('production accepts public HTTPS endpoints and non-URL audience identifiers', () => validate(valid, 'production'))
test('test accepts a local API', () => validate({ ...valid, VITE_API_BASE_URL: 'http://localhost:8080' }, 'test'))
for (const url of ['http://api.moodly.app', 'https://localhost', 'https://127.0.0.1', 'https://[::1]', 'https://10.0.0.1', 'https://api.internal', 'https://api.example.com']) {
  test(`production rejects unsafe endpoint ${url}`, () => assert.throws(() => validate({ ...valid, VITE_API_BASE_URL: url }, 'production'), /VITE_API_BASE_URL/))
}
for (const url of ['not-a-url', 'ftp://api.moodly.app', 'https://user:password@api.moodly.app', 'https://api.moodly.app?token=secret', 'https://api.moodly.app#secret']) {
  test('reject malformed or credential-bearing API configuration', () => assert.throws(() => validate({ ...valid, VITE_API_BASE_URL: url }, 'test'), /VITE_API_BASE_URL/))
}
for (const domain of ['https://tenant.auth0.com', 'tenant.auth0.com/path', 'tenant.auth0.com:443']) {
  test('Auth0 expects a bare DNS hostname', () => assert.throws(() => validate({ ...valid, VITE_AUTH0_DOMAIN: domain }, 'test'), /VITE_AUTH0_DOMAIN/))
}
test('reject missing input without echoing configuration values', () => assert.throws(() => validate({ ...valid, VITE_AUTH0_CLIENT_ID: '' }, 'test'), /^Error: VITE_AUTH0_CLIENT_ID: required$/))
test('reject unknown target', () => assert.throws(() => validate(valid, 'prod'), /MOODLY_ENV/))
