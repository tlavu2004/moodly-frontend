import type { ApiClient } from '../../../api/client.ts'
import { confirm, current, signature } from '../../../api/openapi/sdk.api.ts'
import type { Avatar, UploadRequest } from '../../../api/openapi/types.api.ts'

export async function getAvatar(client: ApiClient): Promise<Avatar | null> {
  const result = await current({ client, throwOnError: true })
  return result.data.data ?? null
}

export async function uploadAvatar(client: ApiClient, file: File): Promise<Avatar> {
  const supportedTypes: UploadRequest['contentType'][] = ['image/jpeg', 'image/png', 'image/webp']
  if (!supportedTypes.includes(file.type as UploadRequest['contentType'])) throw new Error('Choose a JPG, PNG, or WebP image.')
  const signed = await signature({ client, body: { contentType: file.type as UploadRequest['contentType'], sizeBytes: file.size }, throwOnError: true })
  const payload = signed.data.data
  if (!payload?.uploadUrl || !payload.apiKey || !payload.publicId || !payload.signature || !payload.timestamp) throw new Error('Upload configuration is incomplete.')
  const body = new FormData(); body.append('file', file); body.append('api_key', payload.apiKey); body.append('public_id', payload.publicId); body.append('signature', payload.signature); body.append('timestamp', String(payload.timestamp)); if (payload.uploadPreset) body.append('upload_preset', payload.uploadPreset)
  const response = await fetch(payload.uploadUrl, { method: 'POST', body })
  if (!response.ok) throw new Error('The image upload failed. Please try another photo.')
  const uploaded: unknown = await response.json()
  const version = typeof uploaded === 'object' && uploaded !== null && 'version' in uploaded && typeof uploaded.version === 'number' ? uploaded.version : undefined
  const confirmed = await confirm({ client, body: { publicId: payload.publicId, version }, throwOnError: true })
  if (!confirmed.data.data) throw new Error('The uploaded avatar could not be confirmed.')
  return confirmed.data.data
}
