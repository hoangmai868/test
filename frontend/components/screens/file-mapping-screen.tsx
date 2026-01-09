"use client"

import { useRouter } from "next/navigation"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Settings, ChevronLeft, ChevronRight, Loader2, Home } from "lucide-react"
import type React from "react"

import { useState, Fragment, useEffect } from "react"
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
interface Field {
  name: string
}

interface FieldGroup {
  groupName: string
  fields: Field[]
}

interface FileInfo {
  name: string
  fileKey?: string
  category?: string
}

interface FileMappingScreenProps {
  uploadedFiles: {
    customerInfo: File[]
    contractDocs: File[]
    registryDocs: File[]
  }
  loadedFileInfo?: {
    customerInfo: FileInfo[]
    contractDocs: FileInfo[]
    registryDocs: FileInfo[]
  }
  fieldMappings: Array<{ fieldId: string; fileIds: string[]; note: string, extractedValue: string }>
  setFieldMappings: React.Dispatch<React.SetStateAction<Array<{ fieldId: string; fileIds: string[]; note: string, extractedValue: string }>>>
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
      isParent: field.isParent ?? false, // Default to false if not specified
    })),
  }))
}

export default function FileMappingScreen({
  uploadedFiles,
  loadedFileInfo,
  fieldMappings,
  setFieldMappings,
  onBack,
  onNext,
  canProceed,
}: FileMappingScreenProps) {
  const router = useRouter()
  const { user } = useAuth()
  const { jobName, setJobName, jobId, setJobId } = useUploadContext()
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

        // Set default template if available
        if (fetchedTemplates.length > 0) {
          const firstTemplate = fetchedTemplates[0]
          const firstIdentifier = mapTemplateToIdentifier(firstTemplate.fileName)
          setSelectedTemplate(firstIdentifier)
        }
      } catch (error) {
        console.error("Failed to fetch templates:", error)
        // Fallback to empty state or show error
      } finally {
        setIsLoadingTemplates(false)
      }
    }

    fetchTemplates()
  }, [])

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

  const handleTemplateChange = (newTemplate: string) => {
    setSelectedTemplate(newTemplate)
    setMappings({})
    setInstructions({})
    setFieldMappings([])
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

  const handleGenerate = (fieldName: string) => {
    setGeneratingStates((prev) => ({ ...prev, [fieldName]: true }))
    setOutputs((prev) => ({ ...prev, [fieldName]: "" }))

    // Simulate API call (1-3 seconds)
    setTimeout(
      () => {
        setOutputs((prev) => ({ ...prev, [fieldName]: "生成完了：サンプルテキストが生成されました。" }))
        setGeneratingStates((prev) => ({ ...prev, [fieldName]: false }))
      },
      1000 + Math.random() * 2000,
    )
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
    // Data is already being saved to parent state via setFieldMappings
    setIsPromptModalOpen(false)
  }

  const handleSaveJob = async (showAlert = true) => {
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
        category: 'customer_info' | 'contract_documents' | 'registry_transcript'
      }> = []

      // Create a map of fileName -> fileKey for quick lookup
      const fileKeyMap: Record<string, string | undefined> = {}

      // Add loaded files from API
      loadedFileInfo?.customerInfo.forEach((file) => {
        files.push({
          fileName: file.name,
          fileKey: file.fileKey,
          category: 'customer_info',
        })
        if (file.fileKey) {
          fileKeyMap[file.name] = file.fileKey
        }
      })

      loadedFileInfo?.contractDocs.forEach((file) => {
        files.push({
          fileName: file.name,
          fileKey: file.fileKey,
          category: 'contract_documents',
        })
        if (file.fileKey) {
          fileKeyMap[file.name] = file.fileKey
        }
      })

      loadedFileInfo?.registryDocs.forEach((file) => {
        files.push({
          fileName: file.name,
          fileKey: file.fileKey,
          category: 'registry_transcript',
        })
        if (file.fileKey) {
          fileKeyMap[file.name] = file.fileKey
        }
      })

      // Add newly uploaded files
      uploadedFiles.customerInfo.forEach((file) => {
        files.push({
          fileName: file.name,
          category: 'customer_info',
        })
      })

      uploadedFiles.contractDocs.forEach((file) => {
        files.push({
          fileName: file.name,
          category: 'contract_documents',
        })
      })

      uploadedFiles.registryDocs.forEach((file) => {
        files.push({
          fileName: file.name,
          category: 'registry_transcript',
        })
      })

      // Build template_json from fieldMappings in grouped format
      const templateJson = currentFieldGroups.map((group) => {
        const groupFields = group.fields
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
            }
          })
          .filter((field) => field !== null) as Array<{
            name: string
            fileNames: string[]
            fileKeys: string[]
            note: string
            extractedValue: string
          }>

        return {
          groupName: group.groupName,
          fields: groupFields,
        }
      }).filter((group) => group.fields.length > 0)

      const jobData = {
        userId: user.id,
        templateId: currentTemplate.id,
        title: jobName,
        templateJson,
        files,
      }

      let savedJob
      if (jobId) {
        // Update existing job
        savedJob = await api.updateJob(jobId, jobData)
      } else {
        // Create new job
        savedJob = await api.createJob(jobData)
        setJobId(savedJob.id)
      }

      // Fetch lại job data từ API để fill vào form
      try {
        const fetchedJob = await api.getJob(savedJob.id)
        
        // Update job name từ server
        if (fetchedJob.title) {
          setJobName(fetchedJob.title)
        }
        
        // Fill lại fieldMappings từ templateJson (transform from grouped to flat format)
        if (fetchedJob.templateJson && Array.isArray(fetchedJob.templateJson)) {
          // Check if it's the new grouped format or old flat format
          const isGroupedFormat = fetchedJob.templateJson.length > 0 && 
            fetchedJob.templateJson[0]?.groupName !== undefined
          
          let flatMappings: Array<{ fieldId: string; fileIds: string[]; note: string; extractedValue: string }> = []
          
          if (isGroupedFormat) {
            // Transform from grouped format to flat format
            fetchedJob.templateJson.forEach((group: { groupName: string; fields: Array<{ name: string; fileNames: string[]; fileKeys?: string[]; note: string; extractedValue: string }> }) => {
              group.fields.forEach((field) => {
                flatMappings.push({
                  fieldId: field.name,
                  fileIds: field.fileNames || [],
                  note: field.note || "",
                  extractedValue: field.extractedValue || "",
                })
              })
            })
          } else {
            // Old flat format (backward compatibility)
            flatMappings = fetchedJob.templateJson.map((mapping: any) => ({
              fieldId: mapping.fieldId || "",
              fileIds: mapping.fileIds || mapping.fileNames || [],
              note: mapping.note || "",
              extractedValue: mapping.extractedValue || "",
            }))
          }
          
          setFieldMappings(flatMappings)
          
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
        console.error("Failed to fetch saved job data:", fetchError)
        // Continue even if fetch fails
      }

      if (showAlert) {
        alert("保存が完了しました")
      }
      return savedJob
    } catch (error) {
      console.error("Failed to save job:", error)
      if (showAlert) {
        alert("保存に失敗しました: " + (error instanceof Error ? error.message : "Unknown error"))
      }
      throw error
    } finally {
      setIsSaving(false)
    }
  }

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
                className="text-sm w-full min-h-[60px] resize-none"
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
                  "一次保存"
                )}
              </Button>

              <Button variant="outline" size="icon" onClick={() => setIsPromptModalOpen(true)}>
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
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-3 font-semibold text-sm bg-slate-50 sticky top-0 z-10 col-group">
                      分類
                    </th>
                    <th className="text-left p-3 font-semibold text-sm bg-slate-50 sticky top-0 z-10 col-field">
                      訴状の項目
                    </th>
                    <th className="text-left p-3 font-semibold text-sm bg-slate-50 sticky top-0 z-10 min-w-[300px] col-instruction">
                      プロンプト
                    </th>
                    <th className="text-center p-3 font-semibold text-sm bg-slate-50 sticky top-0 z-10 w-[200px] col-checkbox">
                      出力結果
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {currentFieldGroups.map((group, groupIndex) => (
                    <Fragment key={`${group.groupName}-${groupIndex}`}>
                      {group.fields.map((field, fieldIndex) => {
                        const isFirstInGroup = fieldIndex === 0
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
                              <Textarea
                                placeholder="プロンプトを入力してください"
                                value={prompts[field.name] || ""}
                                onChange={(e) => handlePromptChange(field.name, e.target.value)}
                                className="min-h-[80px] text-sm"
                              />
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
