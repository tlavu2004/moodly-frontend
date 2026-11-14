import type { APIRequestContext } from '@playwright/test'

// This is a required BE contract, not proof inferred from a hostname or URL.
export async function verifyTestContract(request: APIRequestContext): Promise<{ url: string; token: string; namespace: string }> {
  const url = process.env.E2E_DATA_RESET_URL
  const token = process.env.E2E_DATA_RESET_TOKEN
  const namespace = process.env.E2E_NAMESPACE
  const contractUrl = process.env.E2E_TEST_CONTRACT_URL
  const testUserEmail = process.env.E2E_TEST_USER_EMAIL
  if (!url || !token || !namespace || !contractUrl || !testUserEmail || !/^[a-z0-9][a-z0-9-]{2,62}$/.test(namespace)) {
    throw new Error('Authenticated E2E requires an explicit test contract, protected namespace and reset credential.')
  }
  if (process.env.E2E_TARGET === 'remote' && process.env.E2E_ALLOW_REMOTE_WRITES !== '1') {
    throw new Error('Remote authenticated E2E requires explicit E2E_ALLOW_REMOTE_WRITES=1 authorization.')
  }
  const reset = new URL(url)
  const contract = new URL(contractUrl)
  const api = new URL(process.env.VITE_API_BASE_URL ?? '')
  for (const endpoint of [reset, contract, api]) {
    if (!['http:', 'https:'].includes(endpoint.protocol) || endpoint.username || endpoint.password || endpoint.search || endpoint.hash) {
      throw new Error('Invalid test contract endpoint.')
    }
  }
  if (reset.origin !== api.origin || contract.origin !== api.origin) throw new Error('Test contract and reset must belong to the configured browser API origin.')
  const response = await request.get(contract.href, {
    headers: { 'X-E2E-Reset-Token': token, 'X-E2E-Namespace': namespace },
    maxRedirects: 0,
  })
  if (response.status() !== 200) throw new Error('BE test namespace contract is unavailable; reset is blocked.')
  const capability = await response.json()
  if (capability.environment !== 'test' || capability.namespace !== namespace || capability.cleanupScope !== 'namespace'
    || capability.protected !== true || capability.resetUrl !== reset.href || capability.apiBaseUrl !== api.href
    || capability.testUserEmail !== testUserEmail) {
    throw new Error('BE did not attest the exact protected test namespace and endpoints; reset is blocked.')
  }
  return { url: reset.href, token, namespace }
}

export async function resetTestData(request: APIRequestContext): Promise<void> {
  const { url, token, namespace } = await verifyTestContract(request)
  const response = await request.post(url, {
    headers: { 'X-E2E-Reset-Token': token, 'X-E2E-Namespace': namespace },
    data: { namespace }, maxRedirects: 0,
  })
  if (!response.ok()) throw new Error(`E2E data reset failed with HTTP ${response.status()}.`)
}
