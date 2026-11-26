import { useCallback, useRef, useState } from 'react'
import { getUserFacingError } from '../../../api/errorMessages.ts'
import { ApiRequestError } from '../../../api/errors.ts'
import { useApiRead } from '../../../api/useApiRead.ts'
import { useMutationTask } from '../../../api/useMutationTask.ts'
import { useApiClient } from '../../../api/useApiClient.ts'
import { getAvatar, removeAvatar, uploadAvatar } from '../api/profileApi.ts'

export function useAvatar() {
  const client = useApiClient()
  const mutationPending = useRef(false)
  const mutate = useMutationTask()
  const [operation, setOperation] = useState<'upload' | 'remove' | null>(null)
  const [failure, setFailure] = useState<{ reason: unknown; fallback: string } | null>(null)
  const load = useCallback((signal: AbortSignal) => {
    setFailure(null)
    return getAvatar(client, signal)
  }, [client])
  const { data, setData, isLoading, error, reload, retryAt } = useApiRead(load, 'Unable to load your avatar.')

  async function change(file?: File) {
    if (mutationPending.current || isLoading) return
    mutationPending.current = true
    setOperation(file ? 'upload' : 'remove')
    setFailure(null)
    try {
      setData(await mutate((signal) => file ? uploadAvatar(client, file, signal) : removeAvatar(client, signal)))
    } catch (reason) {
      if (!(reason instanceof DOMException && reason.name === 'AbortError')) {
        setFailure({ reason, fallback: file ? 'Unable to upload the photo.' : 'Unable to remove the photo.' })
      }
    } finally {
      mutationPending.current = false
      setOperation(null)
    }
  }

  return {
    avatar: data ?? null,
    isLoading,
    isUploading: operation === 'upload',
    isRemoving: operation === 'remove',
    error: failure ? getUserFacingError(failure.reason, failure.fallback) : error,
    retryAt: failure?.reason instanceof ApiRequestError ? failure.reason.retryAt : retryAt,
    reload,
    upload: (file: File) => change(file),
    remove: () => change(),
  }
}
