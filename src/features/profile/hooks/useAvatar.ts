import { useCallback, useRef, useState } from 'react'
import { getUserFacingError } from '../../../api/errorMessages.ts'
import { ApiRequestError } from '../../../api/errors.ts'
import { useApiRead } from '../../../api/useApiRead.ts'
import { useMutationTask } from '../../../api/useMutationTask.ts'
import { useApiClient } from '../../../api/useApiClient.ts'
import { getAvatar, uploadAvatar } from '../api/profileApi.ts'

export function useAvatar() {
  const client = useApiClient()
  const uploadPending = useRef(false)
  const mutate = useMutationTask()
  const [isUploading, setIsUploading] = useState(false)
  const [uploadFailure, setUploadFailure] = useState<unknown>(null)
  const load = useCallback((signal: AbortSignal) => { setUploadFailure(null); return getAvatar(client, signal) }, [client])
  const { data, setData, isLoading, error, reload, retryAt } = useApiRead(load, 'Unable to load your avatar.')
  async function upload(file: File) {
    if (uploadPending.current) return
    uploadPending.current = true
    setIsUploading(true); setUploadFailure(null)
    try { setData(await mutate((signal) => uploadAvatar(client, file, signal))) }
    catch (reason) { if (!(reason instanceof DOMException && reason.name === 'AbortError')) setUploadFailure(reason) }
    finally { uploadPending.current = false; setIsUploading(false) }
  }
  return { avatar: data ?? null, isLoading, isUploading, error: uploadFailure ? getUserFacingError(uploadFailure, 'Unable to upload the photo.') : error,
    retryAt: uploadFailure instanceof ApiRequestError ? uploadFailure.retryAt : retryAt, reload, upload }
}
