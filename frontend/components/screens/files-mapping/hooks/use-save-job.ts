"use client"

import { useCallback, useState, type Dispatch, type SetStateAction } from "react"
import { useRouter } from "next/navigation"
import { api, type Template } from "@/lib/api"
import type { FileInfo, FileInfoByCategory } from "@/contexts/upload-context"
import type { JobFileCategory as FileCategory } from "@/types/shared/job-file"
import { buildFieldIdentifier } from "@/lib/field-identifier"
import { mapTemplateToIdentifier, TemplateJsonField, TemplateJsonGroup, FieldGroup, FieldMappingEntry } from "../utils"

interface UseSaveJobParams {
  currentFieldGroups: FieldGroup[]
  fieldMappings: FieldMappingEntry[]
  uploadedFiles: {
    customerInfo: File[]
    contractDocs: File[]
    registryDocs: File[]
  }
  loadedFileInfo?: FileInfoByCategory
  effectivePrompts: Record<string, string>
  templates: Template[]
  selectedTemplate: string
  jobId: string | null
  jobName: string
  user: { id: string } | null
  setJobId: (id: string | null) => void
  setJobName: (value: string) => void
  setFieldMappings: Dispatch<SetStateAction<FieldMappingEntry[]>>
  setPromptEntries: Dispatch<SetStateAction<Record<string, string>>>
  setEditedPrompts: Dispatch<SetStateAction<Record<string, string>>>
  setMappings: Dispatch<SetStateAction<Record<string, Record<string, boolean>>>>
  setInstructions: Dispatch<SetStateAction<Record<string, string>>>
}

export const useSaveJob = ({
  currentFieldGroups,
  fieldMappings,
  uploadedFiles,
  loadedFileInfo,
  effectivePrompts,
  templates,
  selectedTemplate,
  jobId,
  jobName,
  user,
  setJobId,
  setJobName,
  setFieldMappings,
  setPromptEntries,
  setEditedPrompts,
  setMappings,
  setInstructions,
}: UseSaveJobParams) => {
  const router = useRouter()
  const [isSaving, setIsSaving] = useState(false)

  const handleSaveJob = useCallback(
    async (showAlert = true) => {
      if (!user || !jobName.trim()) {
        if (showAlert) {
          alert("ジョブ名を入力してください")
        }
        return null
      }

      const currentTemplate = templates.find(
        (template) => mapTemplateToIdentifier(template.fileName) === selectedTemplate,
      )

      if (!currentTemplate) {
        if (showAlert) {
          alert("テンプレートが選択されていません")
        }
        return null
      }

      setIsSaving(true)

      try {
        const files: Array<{ fileName: string; fileKey?: string; category: FileCategory }> = []
        const fileKeyMap: Record<string, string | undefined> = {}
        const fileKeyToNameMap: Record<string, string> = {}

        const appendLoadedFiles = (items: FileInfo[] | undefined, category: FileCategory) => {
          items?.forEach((file) => {
            files.push({
              fileName: file.name,
              fileKey: file.fileKey,
              category,
            })
            if (file.fileKey) {
              if (file.name) {
                fileKeyMap[file.name] = file.fileKey
                fileKeyToNameMap[file.fileKey] = file.name
              }
              fileKeyMap[file.fileKey] = file.fileKey
            }
          })
        }

        const appendUploadedFiles = (items: File[], category: FileCategory) => {
          items.forEach((file) => {
            files.push({
              fileName: file.name,
              category,
            })
            // For uploaded files, name is the identifier
            fileKeyToNameMap[file.name] = file.name
          })
        }

        const loadedFileBuckets: Array<[FileInfo[] | undefined, FileCategory]> = [
          [loadedFileInfo?.customerInfo, "customer_info"],
          [loadedFileInfo?.contractDocs, "contract_documents"],
          [loadedFileInfo?.registryDocs, "registry_transcript"],
        ]
        loadedFileBuckets.forEach(([bucket, category]) => appendLoadedFiles(bucket, category))

        const uploadedFileBuckets: Array<[File[], FileCategory]> = [
          [uploadedFiles.customerInfo, "customer_info"],
          [uploadedFiles.contractDocs, "contract_documents"],
          [uploadedFiles.registryDocs, "registry_transcript"],
        ]
        uploadedFileBuckets.forEach(([bucket, category]) => appendUploadedFiles(bucket, category))

        const templateJson: TemplateJsonGroup[] = currentFieldGroups.map((group) => {
          const groupFields = group.fields.map((field) => {
            const fieldId = buildFieldIdentifier(group.groupName, field.name)
            const legacyFieldName = field.name
            const mapping =
              fieldMappings.find((m) => m.fieldId === fieldId) ||
              fieldMappings.find((m) => m.fieldId === legacyFieldName)

            const fileNames: string[] = []
            const fileKeys: string[] = []
            mapping?.fileIds.forEach((fileId) => {
              if (!fileId) return // Skip null/undefined values
              
              const fileKey = fileKeyMap[fileId]
              if (fileKey) {
                fileKeys.push(fileKey)
              }
              // Get the actual file name from the reverse map
              const fileName = fileKeyToNameMap[fileId] || fileId
              if (fileName) {
                fileNames.push(fileName)
              }
            })
            // Remove duplicates
            const uniqueFileNames = Array.from(new Set(fileNames))
            const uniqueFileKeys = Array.from(new Set(fileKeys))

            const promptValue = effectivePrompts[fieldId] || effectivePrompts[legacyFieldName] || ""

            return {
              name: field.name,
              fileNames: uniqueFileNames,
              fileKeys: uniqueFileKeys,
              note: mapping?.note || "",
              extractedValue: mapping?.extractedValue || "",
              prompt: promptValue,
            } as TemplateJsonField
          })

          return {
            groupName: group.groupName,
            fields: groupFields,
          }
        })

        const jobData = {
          userId: user.id,
          templateId: currentTemplate.id,
          title: jobName,
          templateJson,
          files,
        }

        let draftJob
        if (jobId) {
          draftJob = await api.updateJob(jobId, jobData)
        } else {
          draftJob = await api.createJob(jobData)
          setJobId(draftJob.id)
        }

        try {
          const fetchedJob = await api.getJob(draftJob.id)
          if (fetchedJob.title) {
            setJobName(fetchedJob.title)
          }

          if (fetchedJob.templateJson && Array.isArray(fetchedJob.templateJson)) {
            const isGroupedFormat =
              fetchedJob.templateJson.length > 0 &&
              fetchedJob.templateJson[0]?.groupName !== undefined

            let flatMappings: Array<FieldMappingEntry & { prompt?: string }> = []
            const fetchedPromptEntries: Record<string, string> = {}

            if (isGroupedFormat) {
              fetchedJob.templateJson.forEach((group: TemplateJsonGroup) => {
                group.fields.forEach((field) => {
                  const normalizedFieldId = field.name
                    ? buildFieldIdentifier(group.groupName || "", field.name)
                    : field.name || ""
                  flatMappings.push({
                    fieldId: normalizedFieldId,
                    fileIds: field.fileKeys || field.fileNames || [],
                    note: field.note || "",
                    extractedValue: field.extractedValue || "",
                    prompt: field.prompt || "",
                  })
                  if (field.name) {
                    fetchedPromptEntries[normalizedFieldId] = field.prompt || ""
                  }
                })
              })
            } else {
              flatMappings = fetchedJob.templateJson.map((mapping: any) => {
                const promptValue = mapping.prompt || ""
                if (mapping.fieldId) {
                  fetchedPromptEntries[mapping.fieldId] = promptValue
                }
                return {
                  fieldId: mapping.fieldId || "",
                  fileIds: mapping.fileIds || mapping.fileNames || [],
                  note: mapping.note || "",
                  extractedValue: mapping.extractedValue || "",
                  prompt: promptValue,
                }
              })
            }

            setFieldMappings(flatMappings)
            setPromptEntries(fetchedPromptEntries)
            setEditedPrompts({})

            const newMappings: Record<string, Record<string, boolean>> = {}
            flatMappings.forEach((mapping) => {
              newMappings[mapping.fieldId] = {}
              mapping.fileIds.forEach((fileId) => {
                newMappings[mapping.fieldId][fileId] = true
              })
            })
            setMappings(newMappings)

            const newInstructions: Record<string, string> = {}
            flatMappings.forEach((mapping) => {
              if (mapping.note) {
                newInstructions[mapping.fieldId] = mapping.note
              }
            })
            setInstructions(newInstructions)
          }
        } catch (fetchError) {
          console.error("Failed to fetch draft job data:", fetchError)
        }

        if (showAlert) {
          // alert("保存が完了しました")
          router.push("/")
        }

        return draftJob
      } catch (error) {
        console.error("Failed to save job:", error)
        if (showAlert) {
          alert("保存に失敗しました: " + (error instanceof Error ? error.message : "Unknown error"))
        }
        throw error
      } finally {
        setIsSaving(false)
      }
    },
    [
      user,
      jobName,
      templates,
      selectedTemplate,
      uploadedFiles,
      loadedFileInfo,
      currentFieldGroups,
      fieldMappings,
      effectivePrompts,
      jobId,
      setJobId,
      setJobName,
      setFieldMappings,
      setPromptEntries,
      setEditedPrompts,
      setMappings,
      setInstructions,
      router,
    ],
  )

  return { isSaving, handleSaveJob }
}

