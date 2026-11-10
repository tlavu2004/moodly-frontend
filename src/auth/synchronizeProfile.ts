import type { ApiClient } from '../api/client.ts'
import { synchronize } from '../api/openapi/sdk.api.ts'

const pending = new WeakMap<ApiClient, Promise<unknown>>()

/** Share only overlapping bootstrap syncs (including StrictMode); never cache or retry a PUT. */
export function synchronizeProfile(client: ApiClient): Promise<unknown> {
  let request = pending.get(client)
  if (!request) {
    request = synchronize({ client, throwOnError: true })
    pending.set(client, request)
    const remove = () => { if (pending.get(client) === request) pending.delete(client) }
    void request.then(remove, remove)
  }
  return request
}
