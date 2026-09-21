import type { ApiClient } from '../../../api/client.ts'
import { search } from '../../../api/openapi/sdk.api.ts'
import type { EntrySearchResult } from '../../../api/openapi/types.api.ts'

export async function searchEntries(client: ApiClient, query: { q: string; from?: string; to?: string }): Promise<EntrySearchResult[]> {
  const result = await search({ client, query, throwOnError: true })
  return result.data.data?.items ?? []
}
