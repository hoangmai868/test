import { api } from '@/lib/api'
import type { JobFileCategory } from "@/types/shared/job-file";

export async function uploadToBlob(jobId: string, category: JobFileCategory, file: File): Promise<string> {
  if (!jobId) {
    throw new Error('Job ID is required to upload a file')
  }

  const { uploadUrl, fileKey } = await api.getPresignedUrl(jobId, {
    fileName: file.name,
    category,
    contentType: file.type || 'application/octet-stream',
  })

  const res = await fetch(uploadUrl, {
    method: 'PUT',
    headers: {
      'x-ms-blob-type': 'BlockBlob',
      'Content-Type': file.type,
    },
    body: file,
  })

  if (!res.ok) {
    throw new Error('Upload to Azure Blob failed')
  }

  return fileKey
}
