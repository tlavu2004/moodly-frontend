import { useEffect, useState } from 'react'
import { getUserFacingError } from '../../../api/errorMessages.ts'
import { useApiClient } from '../../../api/useApiClient.ts'
import type { Avatar } from '../../../api/openapi/types.api.ts'
import { getAvatar, uploadAvatar } from '../api/profileApi.ts'

export function useAvatar() {
  const client = useApiClient(); const [avatar, setAvatar] = useState<Avatar | null>(null); const [isLoading, setIsLoading] = useState(true); const [isUploading, setIsUploading] = useState(false); const [error, setError] = useState<string | null>(null)
  useEffect(() => { let active = true; getAvatar(client).then((data) => { if (active) setAvatar(data) }).catch((reason: unknown) => { if (active) setError(getUserFacingError(reason, 'Unable to load your avatar.')) }).finally(() => { if (active) setIsLoading(false) }); return () => { active = false } }, [client])
  async function upload(file: File) { setIsUploading(true); setError(null); try { setAvatar(await uploadAvatar(client, file)) } catch (reason) { setError(getUserFacingError(reason, 'Unable to upload the photo.')) } finally { setIsUploading(false) } }
  return { avatar, isLoading, isUploading, error, upload }
}
