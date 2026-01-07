"use client"

import type React from "react"

import { createContext, useContext, useState, useCallback, type ReactNode } from "react"
import { api } from "@/lib/api"

interface FieldMapping {
  fieldId: string
  fileIds: string[]
  note: string
}

// File info from API (not actual File objects)
interface FileInfo {
  name: string
  fileKey?: string
  category?: string
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
  // File info from API (for display purposes when loading existing job)
  loadedFileInfo: {
    customerInfo: FileInfo[]
    contractDocs: FileInfo[]
    registryDocs: FileInfo[]
  }
  fieldMappings: FieldMapping[]
  setFieldMappings: React.Dispatch<React.SetStateAction<FieldMapping[]>>
  jobName: string
  setJobName: React.Dispatch<React.SetStateAction<string>>
  jobId: string | null
  setJobId: React.Dispatch<React.SetStateAction<string | null>>
  canAccessStep: (step: number) => boolean
  loadJobData: (jobId: string) => Promise<void>
  isLoadingJob: boolean
  resetContext: () => void
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

  const [loadedFileInfo, setLoadedFileInfo] = useState<{
    customerInfo: FileInfo[]
    contractDocs: FileInfo[]
    registryDocs: FileInfo[]
  }>({
    customerInfo: [],
    contractDocs: [],
    registryDocs: [],
  })

  const [fieldMappings, setFieldMappings] = useState<FieldMapping[]>([])
  const [jobName, setJobName] = useState<string>("")
  const [jobId, setJobId] = useState<string | null>(null)
  const [isLoadingJob, setIsLoadingJob] = useState(false)

  const resetContext = useCallback(() => {
    setUploadedFiles({
      customerInfo: [],
      contractDocs: [],
      registryDocs: [],
    })
    setLoadedFileInfo({
      customerInfo: [],
      contractDocs: [],
      registryDocs: [],
    })
    setFieldMappings([])
    setJobName("")
    setJobId(null)
  }, [])

  const loadJobData = useCallback(async (loadJobId: string) => {
    try {
      setIsLoadingJob(true)
      const jobData = await api.getJob(loadJobId)
      
      // Set job ID and name
      setJobId(jobData.id)
      setJobName(jobData.title || "")
      
      // Parse files by category
      const customerInfoFiles: FileInfo[] = []
      const contractDocsFiles: FileInfo[] = []
      const registryDocsFiles: FileInfo[] = []
      
      if (jobData.files && Array.isArray(jobData.files)) {
        for (const file of jobData.files) {
          const fileInfo: FileInfo = {
            name: file.fileName || "",
            fileKey: file.fileKey,
            category: file.category,
          }
          
          switch (file.category) {
            case "customer_info":
              customerInfoFiles.push(fileInfo)
              break
            case "contract_documents":
              contractDocsFiles.push(fileInfo)
              break
            case "registry_transcript":
              registryDocsFiles.push(fileInfo)
              break
          }
        }
      }
      
      setLoadedFileInfo({
        customerInfo: customerInfoFiles,
        contractDocs: contractDocsFiles,
        registryDocs: registryDocsFiles,
      })
      
      // Parse field mappings from templateJson
      if (jobData.templateJson && Array.isArray(jobData.templateJson)) {
        const mappings: FieldMapping[] = jobData.templateJson.map((mapping: any) => ({
          fieldId: mapping.fieldId || "",
          fileIds: mapping.fileIds || [],
          note: mapping.note || "",
        }))
        setFieldMappings(mappings)
      }
    } catch (error) {
      console.error("Failed to load job data:", error)
      throw error
    } finally {
      setIsLoadingJob(false)
    }
  }, [])

  const canAccessStep = (step: number): boolean => {
    if (step === 1) return true // Step 1 luôn accessible

    // Step 2: Yêu cầu ít nhất 1 category có file (either uploaded or loaded from API)
    if (step === 2) {
      const hasUploadedFiles =
        uploadedFiles.customerInfo.length > 0 ||
        uploadedFiles.contractDocs.length > 0 ||
        uploadedFiles.registryDocs.length > 0
      const hasLoadedFiles =
        loadedFileInfo.customerInfo.length > 0 ||
        loadedFileInfo.contractDocs.length > 0 ||
        loadedFileInfo.registryDocs.length > 0
      return hasUploadedFiles || hasLoadedFiles
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
    <UploadContext.Provider value={{ 
      uploadedFiles, 
      setUploadedFiles, 
      loadedFileInfo,
      fieldMappings, 
      setFieldMappings, 
      jobName,
      setJobName,
      jobId,
      setJobId,
      canAccessStep,
      loadJobData,
      isLoadingJob,
      resetContext,
    }}>
      {children}
    </UploadContext.Provider>
  )
}
