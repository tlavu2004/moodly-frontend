import { useEffect, useState } from 'react'
import { useApiClient } from '../../../api/useApiClient.ts'
import type { DailyEntry } from '../../../api/openapi/types.api.ts'
import { getEntries } from '../api/entriesApi.ts'

function localDate(date: Date) { return date.toLocaleDateString('en-CA') }

export function useEntries() {
  const client = useApiClient()
  const [entries, setEntries] = useState<DailyEntry[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  useEffect(() => {
    let active = true
    const from = new Date(); from.setDate(from.getDate() - 30)
    getEntries(client, localDate(from), localDate(new Date())).then((data) => { if (active) setEntries(data.reverse()) }).catch((reason: unknown) => { if (active) setError(reason instanceof Error ? reason.message : 'Unable to load entries.') }).finally(() => { if (active) setIsLoading(false) })
    return () => { active = false }
  }, [client])
  return { entries, isLoading, error }
}
