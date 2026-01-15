"use client"

import { useRouter } from "next/navigation"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Settings, ChevronLeft, ChevronRight, Loader2, Home } from "lucide-react"
import type React from "react"

import { useState, Fragment, useEffect, useMemo, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import type { JSX } from "react/jsx-runtime"
import { api, type Template } from "@/lib/api"
import { useAuth } from "@/contexts/auth-context"
import { useUploadContext } from "@/contexts/upload-context"
import type { FileInfo, FileInfoByCategory } from "@/contexts/upload-context"
import type { JobFileCategory as FileCategory } from "@/types/shared/job-file"
interface Field {
  name: string
  prompt?: string
  isParent?: boolean
}

interface FieldGroup {
  groupName: string
  fields: Field[]
}

interface TemplateJsonField {
  name: string
  fileNames: string[]
  fileKeys: string[]
  note: string
  extractedValue: string
  prompt: string
}

interface TemplateJsonGroup {
  groupName: string
  fields: TemplateJsonField[]
}

interface FilesMappingProps {
  uploadedFiles: {
    customerInfo: File[]
    contractDocs: File[]
    registryDocs: File[]
  }
  loadedFileInfo?: FileInfoByCategory
  fieldMappings: Array<{ fieldId: string; fileIds: string[]; note: string; extractedValue: string }>
  setFieldMappings: React.Dispatch<
    React.SetStateAction<Array<{ fieldId: string; fileIds: string[]; note: string; extractedValue: string }>>
  >
  onBack: () => void
  onNext: () => void
  canProceed: boolean
}

const truncateFileName = (fileName: string): string => {
  return fileName.length > 15 ? fileName.substring(0, 12) + "..." : fileName
}

// Helper function to map template fileName to legacy identifiers
const mapTemplateToIdentifier = (fileName: string | null): string => {
  if (fileName === "評価内容") return "typeA"
  if (fileName === "Type B") return "typeB"
  if (fileName === "Type C") return "typeC"
  // Fallback: use fileName as identifier or generate one
  return fileName || "unknown"
}

// Helper function to convert schemaJson to FieldGroup format with isParent
const convertSchemaToFieldGroups = (schemaJson: any[]): FieldGroup[] => {
  return schemaJson.map((group) => ({
    groupName: group.groupName,
    fields: group.fields.map((field: any) => ({
      name: field.name,
      prompt: field.prompt ?? "",
      isParent: field.isParent ?? false, // Default to false if not specified
    })),
  }))
}

const buildPromptsFromFieldGroups = (fieldGroups: FieldGroup[]): Record<string, string> => {
  const promptEntries: Record<string, string> = {}
  fieldGroups.forEach((group) => {
    group.fields.forEach((field) => {
      if (field.name) {
        promptEntries[field.name] = field.prompt ?? ""
      }
    })
  })
  return promptEntries
}

export default function FilesMapping({
  uploadedFiles,
  loadedFileInfo,
  fieldMappings,
  setFieldMappings,
  onBack,
  onNext,
  canProceed,
}: FilesMappingProps) {
  const router = useRouter()
  const { user } = useAuth()
  const {
    jobName,
    setJobName,
    jobId,
    setJobId,
    jobTemplateId,
    setJobTemplateId,
    registerStepSaveHandler,
  } = useUploadContext()
  const [selectedTemplate, setSelectedTemplate] = useState("typeA")
  const [isPromptModalOpen, setIsPromptModalOpen] = useState(false)
  const [prompts, setPrompts] = useState<Record<string, string>>({})
  const [outputs, setOutputs] = useState<Record<string, string>>({})
  const [generatingStates, setGeneratingStates] = useState<Record<string, boolean>>({})
  const [templateFieldGroups, setTemplateFieldGroups] = useState<Record<string, FieldGroup[]>>({})
  const [templates, setTemplates] = useState<Template[]>([])
  const [isLoadingTemplates, setIsLoadingTemplates] = useState(true)
  const [isSaving, setIsSaving] = useState(false)

  // Fetch templates on mount
  useEffect(() => {
    const fetchTemplates = async () => {
      try {
        setIsLoadingTemplates(true)
        const fetchedTemplates = await api.getTemplates()

        setTemplates(fetchedTemplates)

        // Convert templates to the format expected by the component
        const templateMap: Record<string, FieldGroup[]> = {}
        fetchedTemplates.forEach((template) => {
          const identifier = mapTemplateToIdentifier(template.fileName)
          templateMap[identifier] = convertSchemaToFieldGroups(template.schemaJson as any[])
        })

        setTemplateFieldGroups(templateMap)
      } catch (error) {
        console.error("Failed to fetch templates:", error)
        // Fallback to empty state or show error
      } finally {
        setIsLoadingTemplates(false)
      }
    }

    fetchTemplates()
  }, [])

  useEffect(() => {
    if (templates.length === 0) {
      return
    }

    const templateFromJob = jobTemplateId
      ? templates.find((template) => template.id === jobTemplateId)
      : undefined
    const templateToUse = templateFromJob || templates[0]

    const identifier = mapTemplateToIdentifier(templateToUse.fileName)
    setSelectedTemplate(identifier)
    setPrompts(buildPromptsFromFieldGroups(templateFieldGroups[identifier] || []))
  }, [jobTemplateId, templateFieldGroups, templates])

  const currentFieldGroups: FieldGroup[] = templateFieldGroups[selectedTemplate] || []

  const [mappings, setMappings] = useState<Record<string, Record<string, boolean>>>(() => {
    const initialMappings: Record<string, Record<string, boolean>> = {}
    fieldMappings.forEach((mapping) => {
      initialMappings[mapping.fieldId] = {}
      mapping.fileIds.forEach((fileId) => {
        initialMappings[mapping.fieldId][fileId] = true
      })
    })
    return initialMappings
  })

  const [instructions, setInstructions] = useState<Record<string, string>>(() => {
    const initialInstructions: Record<string, string> = {}
    fieldMappings.forEach((mapping) => {
      if (mapping.note) {
        initialInstructions[mapping.fieldId] = mapping.note
      }
    })
    return initialInstructions
  })

  const fileKeyLookup = useMemo(() => {
    const lookup: Record<string, string> = {}
    const appendFileKeys = (items?: FileInfo[]) => {
      items?.forEach((file) => {
        if (file.name && file.fileKey) {
          const normalizedKey = file.fileKey.replace(/^\//, '')
          if (normalizedKey) {
            lookup[file.name] = normalizedKey
          }
        }
      })
    }

    appendFileKeys(loadedFileInfo?.customerInfo)
    appendFileKeys(loadedFileInfo?.contractDocs)
    appendFileKeys(loadedFileInfo?.registryDocs)

    return lookup
  }, [loadedFileInfo])

  const handleTemplateChange = (newTemplate: string) => {
    setSelectedTemplate(newTemplate)
    setMappings({})
    setInstructions({})
    setFieldMappings([])
    setPrompts(buildPromptsFromFieldGroups(templateFieldGroups[newTemplate] || []))
    const selectedTemplateDetail = templates.find(
      (template) => mapTemplateToIdentifier(template.fileName) === newTemplate,
    )
    setJobTemplateId(selectedTemplateDetail?.id ?? null)
  }

  const handleCheckboxChange = (fieldName: string, fileName: string, checked: boolean) => {
    setMappings((prev) => ({
      ...prev,
      [fieldName]: {
        ...(prev[fieldName] || {}),
        [fileName]: checked,
      },
    }))

    setFieldMappings((prev) => {
      const existingMapping = prev.find((m) => m.fieldId === fieldName)

      if (existingMapping) {
        return prev.map((m) => {
          if (m.fieldId === fieldName) {
            const newFileIds = checked
              ? [...m.fileIds, fileName].filter((v, i, a) => a.indexOf(v) === i)
              : m.fileIds.filter((id) => id !== fileName)
            return { ...m, fileIds: newFileIds }
          }
          return m
        })
      } else if (checked) {
        return [...prev, { fieldId: fieldName, fileIds: [fileName], note: instructions[fieldName] || "", extractedValue: "" }]
      }

      return prev
    })
  }

  const handleInstructionChange = (fieldName: string, instruction: string) => {
    setInstructions((prev) => ({ ...prev, [fieldName]: instruction }))

    setFieldMappings((prev) => {
      const existingMapping = prev.find((m) => m.fieldId === fieldName)

      if (existingMapping) {
        return prev.map((m) => (m.fieldId === fieldName ? { ...m, note: instruction } : m))
      } else {
        return [...prev, { fieldId: fieldName, fileIds: [], note: instruction, extractedValue: "" }]
      }
    })
  }

  const handlePromptChange = (fieldName: string, value: string) => {
    setPrompts((prev) => ({ ...prev, [fieldName]: value }))
  }

  const handleGenerate = async (fieldName: string) => {
    setGeneratingStates((prev) => ({ ...prev, [fieldName]: true }))
    setOutputs((prev) => ({ ...prev, [fieldName]: "" }))

    if (!jobId) {
      setOutputs((prev) => ({
        ...prev,
        [fieldName]: "ジョブを一時保存してから生成してください。",
      }))
      setGeneratingStates((prev) => ({ ...prev, [fieldName]: false }))
      return
    }

    const promptValue = prompts[fieldName] || ""
    const mapping = fieldMappings.find((mapping) => mapping.fieldId === fieldName)
    const noteValue = instructions[fieldName] || mapping?.note

    if (!mapping || mapping.fileIds.length === 0) {
      setOutputs((prev) => ({
        ...prev,
        [fieldName]: "ファイルを選択してください。",
      }))
      setGeneratingStates((prev) => ({ ...prev, [fieldName]: false }))
      return
    }

    const missingKeys = mapping.fileIds.filter((fileId) => !fileKeyLookup[fileId])
    if (missingKeys.length > 0) {
      setOutputs((prev) => ({
        ...prev,
        [fieldName]: "選択したファイルのキーが利用できません。ジョブを保存してから再試行してください。",
      }))
      setGeneratingStates((prev) => ({ ...prev, [fieldName]: false }))
      return
    }

    const fileKeys = Array.from(
      new Set(
        mapping.fileIds
          .map((fileId) => fileKeyLookup[fileId])
          .filter((key): key is string => Boolean(key)),
      ),
    )

    try {
      const result = await api.runPrompt({
        jobId,
        fieldName,
        prompt: promptValue,
        note: noteValue,
        fileKeys,
      })
      setOutputs((prev) => ({ ...prev, [fieldName]: result.result }))
    } catch (error) {
      setOutputs((prev) => ({
        ...prev,
        [fieldName]: error instanceof Error ? error.message : "生成に失敗しました",
      }))
    } finally {
      setGeneratingStates((prev) => ({ ...prev, [fieldName]: false }))
    }
  }

  const handlePromptRegister = async () => {
    setIsPromptModalOpen(false)
    if (canProceed) {
      // Auto-save before proceeding (silent)
      try {
        await handleSaveJob(false)
      } catch (error) {
        console.error("Auto-save failed:", error)
      }
      onNext()
    }
  }

  const handleSave = () => {
    // Save all current state (mappings, instructions, prompts, outputs)
    // Data is already being draft to parent state via setFieldMappings
    setIsPromptModalOpen(false)
  }

  const handleOpenPromptModal = async () => {
    if (!user || !jobName.trim()) {
      alert("ジョブ名を入力してください")
      return
    }
    try {
      await handleSaveJob(false)
    } catch (error) {
      console.error("Auto-save before opening prompt modal failed:", error)
    } finally {
      setIsPromptModalOpen(true)
    }
  }

  const handleSaveJob = useCallback(
    async (showAlert = true) => {
    if (!user || !jobName.trim()) {
      if (showAlert) {
        alert("ジョブ名を入力してください")
      }
      return null
    }

    const currentTemplate = templates.find(
      (t) => mapTemplateToIdentifier(t.fileName) === selectedTemplate
    )

    if (!currentTemplate) {
      if (showAlert) {
        alert("テンプレートが選択されていません")
      }
      return null
    }

    setIsSaving(true)

    try {
      // Build files array from both loadedFileInfo and uploadedFiles
      const files: Array<{
        fileName: string
        fileKey?: string
        category: FileCategory
      }> = []

      // Create a map of fileName -> fileKey for quick lookup
      const fileKeyMap: Record<string, string | undefined> = {}

      const appendLoadedFiles = (items: FileInfo[] | undefined, category: FileCategory) => {
        items?.forEach((file) => {
          files.push({
            fileName: file.name,
            fileKey: file.fileKey,
            category,
          })
          if (file.fileKey) {
            fileKeyMap[file.name] = file.fileKey
          }
        })
      }

      const appendUploadedFiles = (items: File[], category: FileCategory) => {
        items.forEach((file) => {
          files.push({
            fileName: file.name,
            category,
          })
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

      uploadedFileBuckets.forEach(([bucket, category]) =>
        appendUploadedFiles(bucket, category)
      )

      // Build template_json from fieldMappings in grouped format
      const templateJson: TemplateJsonGroup[] = currentFieldGroups
        .map((group) => {
          const groupFields: TemplateJsonField[] = group.fields
            .map((field) => {
              const mapping = fieldMappings.find((m) => m.fieldId === field.name)
              if (!mapping) return null

              // Extract fileNames and fileKeys from fileIds
              const fileNames: string[] = []
              const fileKeys: string[] = []

              mapping.fileIds.forEach((fileId) => {
                fileNames.push(fileId)
                const fileKey = fileKeyMap[fileId]
                if (fileKey) {
                  fileKeys.push(fileKey)
                }
              })

              return {
                name: field.name,
                fileNames,
                fileKeys,
                note: mapping.note || "",
                extractedValue: mapping.extractedValue || "",
                prompt: prompts[field.name] || "",
              }
            })
            .filter((field): field is TemplateJsonField => field !== null)

          return {
            groupName: group.groupName,
            fields: groupFields,
          }
        })
        .filter((group) => group.fields.length > 0)

      const jobData = {
        userId: user.id,
        templateId: currentTemplate.id,
        title: jobName,
        templateJson,
        files,
      }

      let draftJob
      if (jobId) {
        // Update existing job
        draftJob = await api.updateJob(jobId, jobData)
      } else {
        // Create new job
        draftJob = await api.createJob(jobData)
        setJobId(draftJob.id)
      }

      // Fetch lại job data từ API để fill vào form
      try {
        const fetchedJob = await api.getJob(draftJob.id)
        
        // Update job name từ server
        if (fetchedJob.title) {
          setJobName(fetchedJob.title)
        }
        
        // Fill lại fieldMappings từ templateJson (transform from grouped to flat format)
        if (fetchedJob.templateJson && Array.isArray(fetchedJob.templateJson)) {
          // Check if it's the new grouped format or old flat format
          const isGroupedFormat = fetchedJob.templateJson.length > 0 && 
            fetchedJob.templateJson[0]?.groupName !== undefined
          
          let flatMappings: Array<{
            fieldId: string
            fileIds: string[]
            note: string
            extractedValue: string
            prompt?: string
          }> = []
          const promptEntries: Record<string, string> = {}
          
          if (isGroupedFormat) {
            // Transform from grouped format to flat format
            fetchedJob.templateJson.forEach(
              (group: TemplateJsonGroup) => {
                group.fields.forEach((field) => {
                  flatMappings.push({
                    fieldId: field.name,
                    fileIds: field.fileNames || [],
                    note: field.note || "",
                    extractedValue: field.extractedValue || "",
                    prompt: field.prompt || "",
                  })
                  promptEntries[field.name] = field.prompt || ""
                })
              },
            )
          } else {
            // Old flat format (backward compatibility)
            flatMappings = fetchedJob.templateJson.map((mapping: any) => {
              const promptValue = mapping.prompt || ""
              if (mapping.fieldId) {
                promptEntries[mapping.fieldId] = promptValue
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
          setPrompts(promptEntries)
          
          // Update mappings state
          const newMappings: Record<string, Record<string, boolean>> = {}
          flatMappings.forEach((mapping) => {
            newMappings[mapping.fieldId] = {}
            mapping.fileIds.forEach((fileId) => {
              newMappings[mapping.fieldId][fileId] = true
            })
          })
          setMappings(newMappings)
          
          // Update instructions state
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
        // Continue even if fetch fails
      }

      if (showAlert) {
        alert("保存が完了しました")
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
    prompts,
    jobId,
    setFieldMappings,
    setMappings,
    setInstructions,
    setPrompts,
    setJobName,
    setJobId,
    setIsSaving,
  ],
)

  useEffect(() => {
    const unregister = registerStepSaveHandler(2, async () => {
      const savedJob = await handleSaveJob(false)
      return savedJob?.id ?? jobId
    })

    return () => {
      unregister()
    }
  }, [handleSaveJob, jobId, registerStepSaveHandler])

  // Combine loaded files (from API) with newly uploaded files
  const getCombinedFileNames = (category: "customerInfo" | "contractDocs" | "registryDocs") => {
    const loadedNames = loadedFileInfo?.[category]?.map(f => f.name) || []
    const uploadedNames = uploadedFiles[category].map(f => f.name)
    return [...loadedNames, ...uploadedNames]
  }

  const fileCategories = [
    {
      category: "顧客情報",
      files: getCombinedFileNames("customerInfo"),
    },
    {
      category: "契約書類等",
      files: getCombinedFileNames("contractDocs"),
    },
    {
      category: "登記簿謄本",
      files: getCombinedFileNames("registryDocs"),
    },
  ].filter((category) => category.files.length > 0)

  const renderFieldRows = (): JSX.Element[] => {
    const rows: JSX.Element[] = []

    currentFieldGroups.forEach((group, groupIndex) => {
      const groupRowSpan = group.fields.length

      group.fields.forEach((field, fieldIndex) => {
        const isFirstFieldInGroup = fieldIndex === 0
        const rowKey = `${group.groupName}-${field.name}`

        rows.push(
          <tr key={rowKey} className="hover:bg-muted/50">
            {isFirstFieldInGroup && (
              <td
                rowSpan={groupRowSpan}
                className={`sticky-col-0 font-bold text-sm px-3 py-2 bg-blue-50 dark:bg-blue-950 text-left align-middle col-group`}
              >
                <div className="whitespace-nowrap" title={group.groupName}>
                  {group.groupName}
                </div>
              </td>
            )}

            <td className={`sticky-col-1 font-medium text-sm px-3 py-2 text-left col-field`}>
              <div className="whitespace-nowrap" title={field.name}>
                {field.name}
              </div>
            </td>

            {fileCategories.map((category) =>
              category.files.map((fileName, fileIdx) => (
                <td
                  key={`${category.category}-${fileIdx}`}
                  className={`col-checkbox p-0 text-center cursor-pointer hover:bg-muted/50`}
                  onClick={() => {
                    const currentValue = mappings[field.name]?.[fileName] || false
                    handleCheckboxChange(field.name, fileName, !currentValue)
                  }}
                >
                  <div className="flex items-center justify-center h-full py-2">
                    <Checkbox
                      checked={mappings[field.name]?.[fileName] || false}
                      onCheckedChange={(checked) => handleCheckboxChange(field.name, fileName, checked as boolean)}
                    />
                  </div>
                </td>
              )),
            )}

            <td className={`instruction-cell p-2 text-left !col-instruction`}>
              <Textarea
                placeholder="追加指示を入力"
                value={instructions[field.name] || ""}
                onChange={(e) => handleInstructionChange(field.name, e.target.value)}
                rows={1}
                className="text-sm w-full resize-y overflow-auto min-h-[1.5rem] max-h-[4.5rem]"
              />
            </td>
          </tr>,
        )
      })
    })

    return rows
  }

  return (
    <div className="space-y-6">
      <Card className="!rounded-none">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>登録ファイルと項目の紐づけ</CardTitle>
            <div className="flex items-center gap-4">
              <Button variant="outline" size="sm" onClick={() => router.push("/")}>
                <Home className="mr-2 h-4 w-4" />
                TOPへ戻る
              </Button>

              <Select 
                value={selectedTemplate} 
                onValueChange={handleTemplateChange}
                disabled={isLoadingTemplates}
              >
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder={isLoadingTemplates ? "読み込み中..." : "テンプレートを選択"} />
                </SelectTrigger>
                <SelectContent className="z-50">
                  {templates.map((template) => {
                    const identifier = mapTemplateToIdentifier(template.fileName)
                    return (
                      <SelectItem key={template.id} value={identifier}>
                        {template.displayName}
                      </SelectItem>
                    )
                  })}
                </SelectContent>
              </Select>

              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => handleSaveJob(true)}
                disabled={isSaving || !jobName.trim() || !user}
              >
                {isSaving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    保存中...
                  </>
                ) : (
                  "一時保存"
                )}
              </Button>

              <Button variant="outline" size="icon" onClick={handleOpenPromptModal}>
                <Settings className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          {isLoadingTemplates ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              <span className="ml-2 text-muted-foreground">テンプレートを読み込み中...</span>
            </div>
          ) : currentFieldGroups.length === 0 ? (
            <div className="flex items-center justify-center py-12">
              <span className="text-muted-foreground">テンプレートが見つかりません</span>
            </div>
          ) : (
            <div className="w-full rounded-md border overflow-auto max-h-[600px]">
              <table className="matrix-table">
                <thead>
                  <tr>
                    <th
                      className="sticky-corner-1 text-left font-bold text-sm px-4 h-[42px] col-group"
                      rowSpan={2}
                    >
                      分類
                    </th>
                    <th
                      className="sticky-corner-2 text-left font-bold text-sm px-4 h-[42px] col-field"
                      rowSpan={2}
                    >
                      訴状の必要な項目
                    </th>

                    {fileCategories.map((category, idx) => (
                      <th
                        key={idx}
                        colSpan={category.files.length}
                        className="sticky-header-1 text-center font-bold text-sm bg-blue-50 dark:bg-blue-950 px-4 h-[42px] whitespace-nowrap"
                      >
                        {category.category}
                      </th>
                    ))}

                    <th
                      className="instruction-col-header bg-white text-left font-bold text-sm px-4 h-[42px] col-instruction"
                      rowSpan={2}
                    >
                      追加指示
                    </th>
                  </tr>

                  <tr>
                    {fileCategories.map((category) =>
                      category.files.map((fileName, fileIdx) => (
                        <th
                          key={`${category.category}-${fileIdx}`}
                          className="sticky-header-2 col-checkbox p-0 text-center align-middle"
                        >
                          <div className="w-full flex items-center justify-center vertical-text" title={fileName}>
                            {truncateFileName(fileName)}
                          </div>
                        </th>
                      )),
                    )}
                  </tr>
                </thead>

                <tbody>{renderFieldRows()}</tbody>
              </table>
            </div>
          )}

          <div className="flex items-center justify-between mt-6">
            <Button variant="outline" onClick={onBack}>
              <ChevronLeft className="mr-2 h-4 w-4" />
              戻る
            </Button>
            <Button 
              onClick={async () => {
                // Auto-save before proceeding (silent)
                try {
                  await handleSaveJob(false)
                } catch (error) {
                  console.error("Auto-save failed:", error)
                }
                onNext()
              }} 
              disabled={!canProceed}
            >
              次へ
              <ChevronRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      <Dialog open={isPromptModalOpen} onOpenChange={setIsPromptModalOpen}>
        <DialogContent className="!w-[90vw] !max-w-none max-h-[90vh] flex flex-col">
          <DialogHeader>
            <div className="flex items-center justify-between pr-10">
              <DialogTitle>プロンプト設定</DialogTitle>
              <p className="text-sm text-muted-foreground">
                選択中:{" "}
                {templates.find((t) => mapTemplateToIdentifier(t.fileName) === selectedTemplate)?.displayName || "テンプレート"}
              </p>
            </div>
          </DialogHeader>

          <ScrollArea className="flex-1 w-full overflow-y-auto">
            <div className="overflow-x-auto w-full">
              <table className="w-full border-collapse table-fixed">
                <colgroup>
                  <col className="w-1/5" />
                  <col className="w-1/5" />
                  <col className="w-[30%]" />
                  <col className="w-[30%]" />
                </colgroup>
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-3 font-semibold text-sm bg-slate-50 sticky top-0 z-10 col-group">
                      分類
                    </th>
                    <th className="text-left p-3 font-semibold text-sm bg-slate-50 sticky top-0 z-10 col-field">
                      訴状の項目
                    </th>
                    <th className="text-left p-3 font-semibold text-sm bg-slate-50 sticky top-0 z-10 col-instruction">
                      プロンプト
                    </th>
                    <th className="text-center p-3 font-semibold text-sm bg-slate-50 sticky top-0 z-10 col-checkbox">
                      出力結果
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {currentFieldGroups.map((group, groupIndex) => (
                    <Fragment key={`${group.groupName}-${groupIndex}`}>
                      {group.fields.map((field, fieldIndex) => {
                        const isFirstInGroup = fieldIndex === 0
                        const mapping = fieldMappings.find((m) => m.fieldId === field.name)
                        const selectedFiles = mapping?.fileIds || []
                        const noteForField = instructions[field.name] || mapping?.note || ""
                        const promptText = prompts[field.name] || ""
                        return (
                          <tr key={`${group.groupName}-${field.name}`} className="border-b hover:bg-slate-50">
                            {isFirstInGroup && (
                              <td
                                rowSpan={group.fields.length}
                                className="px-4 py-3 align-top font-semibold text-sm border-r col-group"
                              >
                                {group.groupName}
                              </td>
                            )}
                            <td className="px-4 py-3 align-top font-medium text-sm border-r col-field">{field.name}</td>
                            <td className="px-4 py-3 align-top border-r col-instruction">
                              <div className="space-y-3">
                                <Textarea
                                  placeholder="プロンプトを入力してください"
                                  value={promptText}
                                  onChange={(e) => handlePromptChange(field.name, e.target.value)}
                                  className="min-h-[80px] text-sm"
                                />
                                <div className="text-xs leading-tight text-slate-600 space-y-1">
                                  <div>
                                    <span className="font-semibold text-slate-800">登録ファイル：</span>
                                    {selectedFiles.length > 0 ? selectedFiles.map(truncateFileName).join("、") : "未選択"}
                                  </div>
                                  <div>
                                    <span className="font-semibold text-slate-800">追加コメント：</span>
                                    {noteForField.trim() ? noteForField : "なし"}
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td className={`px-4 py-3 align-top text-center border col-checkbox`}>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleGenerate(field.name)}
                                disabled={generatingStates[field.name]}
                                className="mb-2"
                              >
                                {generatingStates[field.name] ? (
                                  <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    生成中...
                                  </>
                                ) : (
                                  "生成"
                                )}
                              </Button>
                              {outputs[field.name] && (
                                <p className="text-xs text-slate-600 mt-2">{outputs[field.name]}</p>
                              )}
                            </td>
                          </tr>
                        )
                      })}
                    </Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          </ScrollArea>

          <div className="flex items-center justify-end gap-2 pt-4 border-t">
            <Button onClick={handleSave} variant="outline">
              保存
            </Button>
            <Button onClick={handlePromptRegister} className="bg-yellow-500 hover:bg-yellow-600 text-white">
              プロンプト登録
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
