// AUTO-GENERATED. DO NOT EDIT.

export type JobFileCategory =
  | 'customer_info'
  | 'contract_documents'
  | 'registry_transcript'

export interface JobFileInput {
  fileName: string
  fileKey?: string
  assistantFileId?: string
  category: JobFileCategory
}
