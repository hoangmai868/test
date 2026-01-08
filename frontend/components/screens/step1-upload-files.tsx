"use client"

import type React from "react"
import { useRouter } from "next/navigation"
import { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Upload, Trash2, Home } from "lucide-react"
import { useUploadContext } from "@/contexts/upload-context"
import { useAuth } from "@/contexts/auth-context"
import { api } from "@/lib/api"

interface Step1UploadFilesProps {
  jobId: string | null
  deletedFiles: {
    customerInfo: Set<string>
    contractDocs: Set<string>
    registryDocs: Set<string>
  }
  setDeletedFiles: React.Dispatch<React.SetStateAction<{
    customerInfo: Set<string>
    contractDocs: Set<string>
    registryDocs: Set<string>
  }>>
  onNext: (savedJobId: string | null) => void
}

export default function Step1UploadFiles({
  jobId,
  deletedFiles,
  setDeletedFiles,
  onNext,
}: Step1UploadFilesProps) {
  const router = useRouter()
  const { user } = useAuth()
  const {
    uploadedFiles,
    setUploadedFiles,
    loadedFileInfo,
    fieldMappings,
    jobName,
    setJobName,
    setJobId,
    canAccessStep,
  } = useUploadContext()

  const [dragStates, setDragStates] = useState<{
    customerInfo: boolean
    contractDocs: boolean
    registryDocs: boolean
  }>({
    customerInfo: false,
    contractDocs: false,
    registryDocs: false,
  })

  const customerInfoRef = useRef<HTMLInputElement>(null)
  const contractDocsRef = useRef<HTMLInputElement>(null)
  const registryDocsRef = useRef<HTMLInputElement>(null)

  const isLoadedFile = (category: "customerInfo" | "contractDocs" | "registryDocs", fileName: string) => {
    return loadedFileInfo[category].some((f) => f.name === fileName)
  }

  const autoSaveJob = async (templateId?: string): Promise<string | null> => {
    if (!user || !jobName.trim()) {
      return null
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

      const templateJson = fieldMappings

      const files: Array<{
        fileName: string
        fileKey?: string
        category: 'customer_info' | 'contract_documents' | 'registry_transcript'
      }> = []

      loadedFileInfo.customerInfo
        .filter((file) => !deletedFiles.customerInfo.has(file.name))
        .forEach((file) => {
          files.push({
            fileName: file.name,
            fileKey: file.fileKey,
            category: 'customer_info',
          })
        })

      loadedFileInfo.contractDocs
        .filter((file) => !deletedFiles.contractDocs.has(file.name))
        .forEach((file) => {
          files.push({
            fileName: file.name,
            fileKey: file.fileKey,
            category: 'contract_documents',
          })
        })

      loadedFileInfo.registryDocs
        .filter((file) => !deletedFiles.registryDocs.has(file.name))
        .forEach((file) => {
          files.push({
            fileName: file.name,
            fileKey: file.fileKey,
            category: 'registry_transcript',
          })
        })

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

      const jobData = {
        userId: user.id,
        templateId: templateIdToUse,
        title: jobName,
        templateJson,
        files,
      }

      if (jobId) {
        await api.updateJob(jobId, jobData)
        return jobId
      } else {
        const savedJob = await api.createJob(jobData)
        setJobId(savedJob.id)
        return savedJob.id
      }
    } catch (error) {
      console.error("Auto-save failed:", error)
      return null
    }
  }

  const handleFileSelect = (category: "customerInfo" | "contractDocs" | "registryDocs", files: FileList | null) => {
    if (files) {
      const fileArray = Array.from(files)
      setUploadedFiles((prev) => ({
        ...prev,
        [category]: [...prev[category], ...fileArray],
      }))
    }
  }

  const handleUploadedFileDelete = (category: "customerInfo" | "contractDocs" | "registryDocs", fileName: string) => {
    if (isLoadedFile(category, fileName)) {
      setDeletedFiles((prev) => {
        const newSet = new Set(prev[category])
        newSet.add(fileName)
        return {
          ...prev,
          [category]: newSet,
        }
      })
    } else {
      setUploadedFiles((prev) => ({
        ...prev,
        [category]: prev[category].filter((f) => f.name !== fileName),
      }))
    }
  }

  const handleDragEnter = (category: "customerInfo" | "contractDocs" | "registryDocs", e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragStates((prev) => ({ ...prev, [category]: true }))
  }

  const handleDragLeave = (category: "customerInfo" | "contractDocs" | "registryDocs", e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragStates((prev) => ({ ...prev, [category]: false }))
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }

  const handleDrop = (category: "customerInfo" | "contractDocs" | "registryDocs", e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragStates((prev) => ({ ...prev, [category]: false }))

    const files = e.dataTransfer.files
    if (files && files.length > 0) {
      const fileArray = Array.from(files).filter(
        (file) => file.type === "application/pdf" || file.name.endsWith(".doc") || file.name.endsWith(".docx"),
      )
      if (fileArray.length > 0) {
        setUploadedFiles((prev) => ({
          ...prev,
          [category]: [...prev[category], ...fileArray],
        }))
      }
    }
  }

  const FileCard = ({
    title,
    category,
    inputRef,
  }: {
    title: string
    category: "customerInfo" | "contractDocs" | "registryDocs"
    inputRef: React.RefObject<HTMLInputElement | null>
  }) => (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 px-4 sm:px-6">
        <div
          onDragEnter={(e) => handleDragEnter(category, e)}
          onDragLeave={(e) => handleDragLeave(category, e)}
          onDragOver={handleDragOver}
          onDrop={(e) => handleDrop(category, e)}
          onClick={() => inputRef.current?.click()}
          className={`
            relative border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-all
            ${
              dragStates[category]
                ? "border-primary bg-primary/5 scale-[1.02]"
                : "border-slate-300 hover:border-primary hover:bg-slate-50"
            }
          `}
        >
          <div className="flex flex-col items-center gap-2">
            <div className="rounded-full bg-slate-100 p-2">
              <Upload className="h-5 w-5 text-slate-600" />
            </div>
            <div>
              <p className="text-xs font-medium text-slate-700">ファイルをドラッグ&ドロップ</p>
              <p className="text-xs text-muted-foreground">または クリックしてファイルを選択</p>
            </div>
          </div>
        </div>

        <input
          ref={inputRef}
          type="file"
          multiple
          accept=".pdf,.doc,.docx"
          className="hidden"
          onChange={(e) => handleFileSelect(category, e.target.files)}
        />
      </CardContent>
    </Card>
  )

  const getCombinedFiles = (category: "customerInfo" | "contractDocs" | "registryDocs") => {
    const loaded = loadedFileInfo[category]
      .filter(f => !deletedFiles[category].has(f.name))
      .map(f => ({ name: f.name, isLoaded: true }))
    const uploaded = uploadedFiles[category].map(f => ({ name: f.name, isLoaded: false }))
    return [...loaded, ...uploaded]
  }

  const getTotalFilesCount = () => {
    return (
      loadedFileInfo.customerInfo.length +
      loadedFileInfo.contractDocs.length +
      loadedFileInfo.registryDocs.length
    )
  }

  return (
    <div className="bg-slate-50 p-4 sm:p-6">
      <div className="container mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold">データ取込</h1>
          <Button variant="outline" size="sm" onClick={() => router.push("/")}>
            <Home className="mr-2 h-4 w-4" />
            TOPへ戻る
          </Button>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1fr_400px]">
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>ジョブ名</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <Label htmlFor="job-name">ジョブ名を入力してください</Label>
                  <Input
                    id="job-name"
                    value={jobName}
                    onChange={(e) => setJobName(e.target.value)}
                    placeholder="例: 顧客A - データ取込"
                  />
                </div>
              </CardContent>
            </Card>
            <FileCard title="顧客情報" category="customerInfo" inputRef={customerInfoRef} />
            <FileCard title="契約書類等" category="contractDocs" inputRef={contractDocsRef} />
            <FileCard title="登記簿謄本" category="registryDocs" inputRef={registryDocsRef} />
          </div>

          <Card className="h-fit sticky top-6">
            <CardHeader>
              <CardTitle>アップロード済みファイル一覧</CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="max-h-[600px] overflow-y-auto">
                <div className="space-y-6">
                  <div>
                    <h3 className="font-semibold text-sm mb-2 text-slate-700">顧客情報</h3>
                    {getCombinedFiles("customerInfo").length === 0 ? (
                      <p className="text-sm text-muted-foreground">ファイルがありません</p>
                    ) : (
                      <ul className="space-y-1">
                        {getCombinedFiles("customerInfo").map((file, index) => (
                          <li
                            key={`${file.isLoaded ? 'loaded' : 'new'}-${file.name}`}
                            className="flex items-start gap-2 text-sm text-slate-600 hover:bg-slate-100 px-2 py-1.5 rounded transition-colors"
                          >
                            <span className="flex-1 break-words">
                              {index + 1}. {file.name}
                            </span>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 shrink-0 hover:bg-red-50"
                              onClick={() => handleUploadedFileDelete("customerInfo", file.name)}
                              title="ファイルを削除"
                            >
                              <Trash2 className="h-4 w-4 text-red-500" />
                            </Button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>

                  <div>
                    <h3 className="font-semibold text-sm mb-2 text-slate-700">契約書類等</h3>
                    {getCombinedFiles("contractDocs").length === 0 ? (
                      <p className="text-sm text-muted-foreground">ファイルがありません</p>
                    ) : (
                      <ul className="space-y-1">
                        {getCombinedFiles("contractDocs").map((file, index) => (
                          <li
                            key={`${file.isLoaded ? 'loaded' : 'new'}-${file.name}`}
                            className="flex items-start gap-2 text-sm text-slate-600 hover:bg-slate-100 px-2 py-1.5 rounded transition-colors"
                          >
                            <span className="flex-1 break-words">
                              {index + 1}. {file.name}
                            </span>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 shrink-0 hover:bg-red-50"
                              onClick={() => handleUploadedFileDelete("contractDocs", file.name)}
                              title="ファイルを削除"
                            >
                              <Trash2 className="h-4 w-4 text-red-500" />
                            </Button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>

                  <div>
                    <h3 className="font-semibold text-sm mb-2 text-slate-700">登記簿謄本</h3>
                    {getCombinedFiles("registryDocs").length === 0 ? (
                      <p className="text-sm text-muted-foreground">ファイルがありません</p>
                    ) : (
                      <ul className="space-y-1">
                        {getCombinedFiles("registryDocs").map((file, index) => (
                          <li
                            key={`${file.isLoaded ? 'loaded' : 'new'}-${file.name}`}
                            className="flex items-start gap-2 text-sm text-slate-600 hover:bg-slate-100 px-2 py-1.5 rounded transition-colors"
                          >
                            <span className="flex-1 break-words">
                              {index + 1}. {file.name}
                            </span>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 shrink-0 hover:bg-red-50"
                              onClick={() => handleUploadedFileDelete("registryDocs", file.name)}
                              title="ファイルを削除"
                            >
                              <Trash2 className="h-4 w-4 text-red-500" />
                            </Button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>

                  <div className="mt-3 pt-3 border-t">
                    <p className="text-xs text-muted-foreground text-center">
                      合計: {getTotalFilesCount()}件
                    </p>
                  </div>
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>

        <div className="flex justify-end">
          <Button
            onClick={async () => {
              const savedId = await autoSaveJob()
              onNext(savedId)
            }}
            disabled={!canAccessStep(2)}
            className="w-full sm:w-auto"
          >
            次の画面へ進む
          </Button>
        </div>
      </div>
    </div>
  )
}

