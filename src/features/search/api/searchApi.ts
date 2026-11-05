import type { ApiClient } from '../../../api/client.ts'
import { search } from '../../../api/openapi/sdk.api.ts'

export async function searchEntriesPage(client: ApiClient, query: { q: string; from?: string; to?: string }, page: number, signal?: AbortSignal) {
  const result = await search({ client, query: { ...query, page, size: 20 }, signal, throwOnError: true })
  if (!result.data.data) throw new Error("The search response was empty.")
  return result.data.data
}
