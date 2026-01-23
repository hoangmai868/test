"use client"

import type React from "react"
import type { FileInfoByCategory } from "@/contexts/upload-context"
import { FieldMappingEntry } from "./utils"

export interface FilesMappingProps {
  uploadedFiles: {
    customerInfo: File[]
    contractDocs: File[]
    registryDocs: File[]
  }
  loadedFileInfo?: FileInfoByCategory
  fieldMappings: FieldMappingEntry[]
  setFieldMappings: React.Dispatch<React.SetStateAction<FieldMappingEntry[]>>
  onBack: () => void
  onNext: () => void
  canProceed: boolean
}

