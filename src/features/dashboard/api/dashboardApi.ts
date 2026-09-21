import type { ApiClient } from '../../../api/client.ts'
import { getDashboard } from '../../../api/openapi/sdk.api.ts'
import type { DashboardResponse } from '../../../api/openapi/types.api.ts'

export type DashboardData = DashboardResponse

export async function getDashboardData(client: ApiClient): Promise<DashboardData> {
  const result = await getDashboard({ client, throwOnError: true })
  if (!result.data.data) throw new Error('The dashboard response was empty.')
  return result.data.data
}
