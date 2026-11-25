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
  const [isUploading, setIsUploading] = useState(false)
  const [uploadFailure, setUploadFailure] = useState<unknown>(null)
  const load = useCallback((signal: AbortSignal) => { setUploadFailure(null); return getAvatar(client, signal) }, [client])
  const { data, setData, isLoading, error, reload, retryAt } = useApiRead(load, 'Unable to load your avatar.')
  const [isRemoving, setIsRemoving] = useState(false)
  async function change(file?: File) {
    if (mutationPending.current || isLoading) return
    mutationPending.current = true
    setIsUploading(Boolean(file)); setIsRemoving(!file); setUploadFailure(null)
    try { setData(await mutate((signal) => file ? uploadAvatar(client, file, signal) : removeAvatar(client, signal))) }
    catch (reason) { if (!(reason instanceof DOMException && reason.name === 'AbortError')) {
      setFailureMessage(file ? 'Unable to upload the photo.' : 'Unable to remove the photo.')
      setUploadFailure(reason)
    } }
    finally { mutationPending.current = false; setIsUploading(false); setIsRemoving(false) }
  }
  const [failureMessage, setFailureMessage] = useState('Unable to upload the photo.')
  return { avatar: data ?? null, isLoading, isUploading, error: uploadFailure ? getUserFacingError(uploadFailure, failureMessage) : error,
    retryAt: uploadFailure instanceof ApiRequestError ? uploadFailure.retryAt : retryAt, reload, isRemoving, upload: (file: File) => change(file), remove: () => change() }
}
