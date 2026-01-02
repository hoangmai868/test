"use client"

import type React from "react"

import { createContext, useContext, useState, type ReactNode } from "react"

interface FieldMapping {
  fieldId: string
  fileIds: string[]
  note: string
}

interface UploadContextType {
  uploadedFiles: {
    customerInfo: File[]
    contractDocs: File[]
    registryDocs: File[]
  }
  setUploadedFiles: React.Dispatch<
    React.SetStateAction<{
      customerInfo: File[]
      contractDocs: File[]
      registryDocs: File[]
    }>
  >
  fieldMappings: FieldMapping[]
  setFieldMappings: React.Dispatch<React.SetStateAction<FieldMapping[]>>
  canAccessStep: (step: number) => boolean
}

const UploadContext = createContext<UploadContextType | undefined>(undefined)

export function useUploadContext() {
  const context = useContext(UploadContext)
  if (!context) {
    throw new Error("useUploadContext must be used within UploadProvider")
  }
  return context
}

export function UploadProvider({ children }: { children: ReactNode }) {
  const [uploadedFiles, setUploadedFiles] = useState<{
    customerInfo: File[]
    contractDocs: File[]
    registryDocs: File[]
  }>({
    customerInfo: [],
    contractDocs: [],
    registryDocs: [],
  })

  const [fieldMappings, setFieldMappings] = useState<FieldMapping[]>([])

  const canAccessStep = (step: number): boolean => {
    if (step === 1) return true // Step 1 luôn accessible

    // Step 2: Yêu cầu ít nhất 1 category có file
    if (step === 2) {
      const hasFiles =
        uploadedFiles.customerInfo.length > 0 ||
        uploadedFiles.contractDocs.length > 0 ||
        uploadedFiles.registryDocs.length > 0
      return hasFiles
    }

    // Step 3: Yêu cầu có ít nhất 1 mapping hoặc note
    if (step === 3) {
      const hasMappingChanges = fieldMappings.some(
        (mapping) => mapping.fileIds.length > 0 || mapping.note.trim() !== "",
      )
      return hasMappingChanges
    }

    return false
  }

  return (
    <UploadContext.Provider value={{ uploadedFiles, setUploadedFiles, fieldMappings, setFieldMappings, canAccessStep }}>
      {children}
    </UploadContext.Provider>
  )
}
