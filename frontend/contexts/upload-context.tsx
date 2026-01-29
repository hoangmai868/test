"use client"

import type React from "react"

import { createContext, useContext, useState, useCallback, useRef, type ReactNode, useEffect } from "react"
import { useAuth } from "@/contexts/auth-context"
import { api } from "@/lib/api"
import { JobFileCategory, JobFileInput } from "@/types/shared/job-file"
import { uploadToBlob } from "@/lib/blob-upload"
import { buildFieldIdentifier } from "@/lib/field-identifier"

type UploadCategoryKey = "customerInfo" | "contractDocs" | "registryDocs"
const CATEGORY_KEYS: UploadCategoryKey[] = ["customerInfo", "contractDocs", "registryDocs"]

interface FieldMapping {
  fieldId: string
  fileIds: string[]
  note: string
  extractedValue: string
}

// File info from API (not actual File objects)
export interface FileInfo {
  name: string
  fileKey?: string
  category?: JobFileCategory
  assistantFileId?: string
}

export type FileInfoByCategory = {
  customerInfo: FileInfo[]
  contractDocs: FileInfo[]
  registryDocs: FileInfo[]
}

const DRAFT_PROMPT_ENTRIES_KEY = "files-mapping-prompt-entries"
const DRAFT_EDITED_PROMPTS_KEY = "files-mapping-edited-prompts"

const readDraftRecord = (storageKey: string): Record<string, string> => {
  if (typeof window === "undefined") {
    return {}
  }
  const raw = window.sessionStorage.getItem(storageKey)
  if (!raw) {
    return {}
  }
  try {
    const parsed = JSON.parse(raw)
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed as Record<string, string>
    }
  } catch {
    // ignore parse errors and return empty
  }
  return {}
}

const writeDraftRecord = (storageKey: string, value: Record<string, string>) => {
  if (typeof window === "undefined") {
    return
  }
  try {
    window.sessionStorage.setItem(storageKey, JSON.stringify(value))
  } catch {
    // ignore storage failures
  }
}

const removeDraftRecord = (storageKey: string) => {
  if (typeof window === "undefined") {
    return
  }
  window.sessionStorage.removeItem(storageKey)
}

const clearDraftPromptStorage = () => {
  removeDraftRecord(DRAFT_PROMPT_ENTRIES_KEY)
  removeDraftRecord(DRAFT_EDITED_PROMPTS_KEY)
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
  loadedFileInfo: FileInfoByCategory
  setLoadedFileInfo: React.Dispatch<React.SetStateAction<FileInfoByCategory>>
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
  deletedFiles: {
    customerInfo: Set<string>
    contractDocs: Set<string>
    registryDocs: Set<string>
  }
  setDeletedFiles: React.Dispatch<
    React.SetStateAction<{
      customerInfo: Set<string>
      contractDocs: Set<string>
      registryDocs: Set<string>
    }>
  >
  autoSaveJob: (templateId?: string) => Promise<string | null>
  jobTemplateId: string | null
  setJobTemplateId: React.Dispatch<React.SetStateAction<string | null>>
  registerStepSaveHandler: (
    step: number,
    handler: () => Promise<string | null>,
  ) => () => void
  runStepSaveHandler: (step: number) => Promise<string | null>
  promptEntries: Record<string, string>
  setPromptEntries: React.Dispatch<React.SetStateAction<Record<string, string>>>
  editedPrompts: Record<string, string>
  setEditedPrompts: React.Dispatch<React.SetStateAction<Record<string, string>>>
  isUploadingFiles: boolean
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

  const [loadedFileInfo, setLoadedFileInfo] = useState<FileInfoByCategory>({
    customerInfo: [],
    contractDocs: [],
    registryDocs: [],
  })

  const [fieldMappings, setFieldMappings] = useState<FieldMapping[]>([])
  const [jobName, setJobName] = useState<string>("")
  const [jobId, setJobId] = useState<string | null>(null)
  const [jobTemplateId, setJobTemplateId] = useState<string | null>(null)
  const [isLoadingJob, setIsLoadingJob] = useState(false)
  const [promptEntries, setPromptEntries] = useState<Record<string, string>>(() =>
    readDraftRecord(DRAFT_PROMPT_ENTRIES_KEY),
  )
  const [editedPrompts, setEditedPrompts] = useState<Record<string, string>>(() =>
    readDraftRecord(DRAFT_EDITED_PROMPTS_KEY),
  )
  const { user } = useAuth()
  const [deletedFiles, setDeletedFiles] = useState<Record<UploadCategoryKey, Set<string>>>({
    customerInfo: new Set(),
    contractDocs: new Set(),
    registryDocs: new Set(),
  })
  const [isUploadingFiles, setIsUploadingFiles] = useState(false)
  const stepSaveHandlersRef = useRef<Map<number, () => Promise<string | null>>>(new Map())

  const registerStepSaveHandler = useCallback(
    (step: number, handler: () => Promise<string | null>) => {
      stepSaveHandlersRef.current.set(step, handler)
      return () => {
        const currentHandler = stepSaveHandlersRef.current.get(step)
        if (currentHandler === handler) {
          stepSaveHandlersRef.current.delete(step)
        }
      }
    },
    [],
  )

  const runStepSaveHandler = useCallback(async (step: number): Promise<string | null> => {
    const handler = stepSaveHandlersRef.current.get(step)
    if (!handler) {
      return null
    }

    return handler()
  }, [])

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
    setDeletedFiles({
      customerInfo: new Set(),
      contractDocs: new Set(),
      registryDocs: new Set(),
    })
    setJobTemplateId(null)
    setPromptEntries({})
    setEditedPrompts({})
    clearDraftPromptStorage()
  }, [])

  useEffect(() => {
    if (jobId) {
      clearDraftPromptStorage()
      return
    }
    writeDraftRecord(DRAFT_PROMPT_ENTRIES_KEY, promptEntries)
  }, [jobId, promptEntries])

  useEffect(() => {
    if (jobId) {
      return
    }
    writeDraftRecord(DRAFT_EDITED_PROMPTS_KEY, editedPrompts)
  }, [jobId, editedPrompts])

  const loadJobData = useCallback(async (loadJobId: string) => {
    setDeletedFiles({
      customerInfo: new Set(),
      contractDocs: new Set(),
      registryDocs: new Set(),
    })
    try {
      setIsLoadingJob(true)
      const jobData = await api.getJob(loadJobId)
      
      // Set job ID and name
      setJobId(jobData.id)
      setJobName(jobData.title || "")
      setJobTemplateId(jobData.templateId ?? null)
      
      // Parse files by category
      const customerInfoFiles: FileInfo[] = []
      const contractDocsFiles: FileInfo[] = []
      const registryDocsFiles: FileInfo[] = []
      
      if (jobData.files && Array.isArray(jobData.files)) {
        const categorizedFiles = await Promise.all(
          jobData.files.map(async (file: {
            fileName?: string
            fileKey?: string
            category?: JobFileCategory
            assistantFileId?: string
          }) => {
            const fileInfo: FileInfo = {
              name: file.fileName || "",
              fileKey: file.fileKey,
              category: file.category,
              assistantFileId: file.assistantFileId,
            }

            return { fileInfo, category: file.category }
          }),
        )

        categorizedFiles.forEach(({ fileInfo, category }) => {
          switch (category) {
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
        })
      }
      
      setLoadedFileInfo({
        customerInfo: customerInfoFiles,
        contractDocs: contractDocsFiles,
        registryDocs: registryDocsFiles,
      })

      // Parse field mappings from templateJson (handle both grouped and flat formats)
      if (jobData.templateJson && Array.isArray(jobData.templateJson)) {
        // Check if it's the new grouped format or old flat format
        const isGroupedFormat = jobData.templateJson.length > 0 && 
          jobData.templateJson[0]?.groupName !== undefined
        
        let mappings: FieldMapping[] = []
        const promptValues: Record<string, string> = {}
        
        if (isGroupedFormat) {
          // Transform from grouped format to flat format
          jobData.templateJson.forEach((group: { groupName: string; fields: Array<{ name: string; fileNames: string[]; fileKeys?: string[]; note: string; extractedValue: string; prompt?: string }> }) => {
                group.fields.forEach((field) => {
                  const normalizedFieldId = field.name
                    ? buildFieldIdentifier(group.groupName || "", field.name)
                    : field.name || ""
                  mappings.push({
                    fieldId: normalizedFieldId,
                    fileIds: field.fileNames || [],
                    note: field.note || "",
                    extractedValue: field.extractedValue || "",
                  })
                  if (field.name) {
                    promptValues[normalizedFieldId] = field.prompt || ""
                  }
                })
          })
        } else {
          // Old flat format (backward compatibility)
          mappings = jobData.templateJson.map((mapping: any) => ({
            fieldId: mapping.fieldId || "",
            fileIds: mapping.fileIds || mapping.fileNames || [],
            note: mapping.note || "",
            extractedValue: mapping.extractedValue || "",
          }))
          jobData.templateJson.forEach((mapping: any) => {
            if (mapping.fieldId) {
              promptValues[mapping.fieldId] = mapping.prompt || ""
            }
          })
        }
        
        setFieldMappings(mappings)
        setEditedPrompts(promptValues)
      }
    } catch (error) {
      console.error("Failed to load job data:", error)
      throw error
    } finally {
      setIsLoadingJob(false)
    }
  }, [])

  const autoSaveJob = useCallback(
    async (templateId?: string): Promise<string | null> => {
      if (!user || !jobName.trim()) {
        return null
      }

      const hasPendingUploads =
        uploadedFiles.customerInfo.length > 0 ||
        uploadedFiles.contractDocs.length > 0 ||
        uploadedFiles.registryDocs.length > 0

      if (hasPendingUploads) {
        setIsUploadingFiles(true)
      }

      try {
        let templateIdToUse = templateId
        if (!templateIdToUse) {
          const templates = await api.getTemplates()
          if (templates.length > 0) {
            templateIdToUse = templates[0].id
          } else {
            return null
          }
        }

        let currentJobId = jobId

        const baseJobData = {
          userId: user.id,
          templateId: templateIdToUse,
          title: jobName,
          templateJson: fieldMappings,
          files: [],
        }

        if (!currentJobId) {
          const draftJob = await api.createJob(baseJobData)
          setJobId(draftJob.id)
          currentJobId = draftJob.id
        } else {
          await api.updateJob(currentJobId, {
            title: jobName,
            templateJson: fieldMappings,
          })
        }

        if (!currentJobId) {
          return null
        }

        const files: JobFileInput[] = []
        const deletedFilesSnapshot = deletedFiles
        const deletedFileKeys = CATEGORY_KEYS.flatMap((categoryKey) =>
          Array.from(deletedFilesSnapshot[categoryKey])
            .map((fileName) =>
              loadedFileInfo[categoryKey].find((file) => file.name === fileName)?.fileKey,
            )
            .filter((fileKey): fileKey is string => Boolean(fileKey)),
        )

        const pushLoadedFiles = (
          categoryKey: UploadCategoryKey,
          category: JobFileCategory,
        ) => {
          loadedFileInfo[categoryKey]
            .filter((f) => !deletedFiles[categoryKey].has(f.name))
            .forEach((f) => {
              files.push({
                fileName: f.name,
                fileKey: f.fileKey,
          assistantFileId: f.assistantFileId,
                category,
              })
            })
        }

        pushLoadedFiles("customerInfo", "customer_info")
        pushLoadedFiles("contractDocs", "contract_documents")
        pushLoadedFiles("registryDocs", "registry_transcript")

        const uploadNewFiles = async (
          categoryKey: UploadCategoryKey,
          category: JobFileCategory,
        ): Promise<Array<{ name: string; fileKey: string }>> => {
          const pendingFiles = uploadedFiles[categoryKey]
          if (pendingFiles.length === 0) {
            return []
          }

          const uploadResults = await Promise.all(
            pendingFiles.map(async (file) => {
              const fileKey = await uploadToBlob(currentJobId, category, file)
              return { file, fileKey }
            }),
          )

          const draftFiles: Array<{ name: string; fileKey: string }> = uploadResults.map(
            ({ file, fileKey }) => {
              files.push({
                fileName: file.name,
                fileKey,
                category,
              })
              return { name: file.name, fileKey }
            },
          )

          return draftFiles
        }

        const newCustomerFiles = await uploadNewFiles("customerInfo", "customer_info")
        const newContractFiles = await uploadNewFiles("contractDocs", "contract_documents")
        const newRegistryFiles = await uploadNewFiles("registryDocs", "registry_transcript")

        const appendDraftFiles = (
          categoryKey: UploadCategoryKey,
          draftFiles: Array<{ name: string; fileKey: string }>,
        ) => {
          if (draftFiles.length === 0) {
            return
          }

          const draftNames = new Set(draftFiles.map((file) => file.name))

          setUploadedFiles((prev) => ({
            ...prev,
            [categoryKey]: prev[categoryKey].filter((file) => !draftNames.has(file.name)),
          }))

          setLoadedFileInfo((prev) => ({
            ...prev,
            [categoryKey]: [
              ...prev[categoryKey],
              ...draftFiles.map((file) => ({
                name: file.name,
                fileKey: file.fileKey,
              })),
            ],
          }))
        }

        appendDraftFiles("customerInfo", newCustomerFiles)
        appendDraftFiles("contractDocs", newContractFiles)
        appendDraftFiles("registryDocs", newRegistryFiles)

        if (currentJobId && deletedFileKeys.length > 0) {
          await api.deleteJobFiles(currentJobId, deletedFileKeys)
          setLoadedFileInfo((prev) => ({
            customerInfo: prev.customerInfo.filter((file) => !deletedFilesSnapshot.customerInfo.has(file.name)),
            contractDocs: prev.contractDocs.filter((file) => !deletedFilesSnapshot.contractDocs.has(file.name)),
            registryDocs: prev.registryDocs.filter((file) => !deletedFilesSnapshot.registryDocs.has(file.name)),
          }))
          setDeletedFiles({
            customerInfo: new Set(),
            contractDocs: new Set(),
            registryDocs: new Set(),
          })
        }

        await api.updateJob(currentJobId, {
          files,
        })

        return currentJobId
      } catch (err) {
        console.error("Auto-save job failed:", err)
        return null
      } finally {
        if (hasPendingUploads) {
          setIsUploadingFiles(false)
        }
      }
    },
    [
      user,
      jobName,
      jobId,
      fieldMappings,
      uploadedFiles,
      loadedFileInfo,
      deletedFiles,
      setJobId,
      setUploadedFiles,
      setLoadedFileInfo,
      setDeletedFiles,
      setIsUploadingFiles,
    ],
  )

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
      setLoadedFileInfo,
      fieldMappings, 
      setFieldMappings, 
      jobName,
      setJobName,
      jobId,
      setJobId,
      canAccessStep,
      loadJobData,
      isLoadingJob,
      isUploadingFiles,
      resetContext,
      deletedFiles,
      setDeletedFiles,
      autoSaveJob,
      jobTemplateId,
      setJobTemplateId,
      registerStepSaveHandler,
      runStepSaveHandler,
      promptEntries,
      setPromptEntries,
      editedPrompts,
      setEditedPrompts,
    }}>
      {children}
    </UploadContext.Provider>
  )
}
