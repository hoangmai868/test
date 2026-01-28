"use client"

import type React from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Upload, Trash2, Home, ChevronRight, Loader2 } from "lucide-react"
import { useUploadContext } from "@/contexts/upload-context"
import { api } from "@/lib/api"
import ConfirmDeleteFileModal from "@/components/modals/confirm-delete-file-modal"

type CategoryKey = "customerInfo" | "contractDocs" | "registryDocs"
const CATEGORY_SECTIONS: { key: CategoryKey; title: string }[] = [
  { key: "customerInfo", title: "顧客情報" },
  { key: "contractDocs", title: "契約書類等" },
  { key: "registryDocs", title: "登記簿謄本" },
]
type CombinedFile = {
  name: string
  isLoaded: boolean
  fileKey?: string
}

interface UploadFilesProps {
  onNext: (draftJobId: string | null) => void
}

export default function UploadFiles({ onNext }: UploadFilesProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const {
    uploadedFiles,
    setUploadedFiles,
    loadedFileInfo,
    setLoadedFileInfo,
    jobName,
    setJobName,
    canAccessStep,
    deletedFiles,
    setDeletedFiles,
    autoSaveJob,
    isUploadingFiles,
  } = useUploadContext()

  // Check if jobId exists in URL
  const hasJobId = searchParams.get("jobId") !== null

  const [dragStates, setDragStates] = useState<{
    customerInfo: boolean
    contractDocs: boolean
    registryDocs: boolean
  }>({
    customerInfo: false,
    contractDocs: false,
    registryDocs: false,
  })
  const dragCounterRef = useRef<Record<CategoryKey, number>>({
    customerInfo: 0,
    contractDocs: 0,
    registryDocs: 0,
  })
  const [jobNameError, setJobNameError] = useState<string>("")
  const [pendingDelete, setPendingDelete] = useState<{ category: CategoryKey; fileName: string } | null>(null)

  const customerInfoRef = useRef<HTMLInputElement>(null)
  const contractDocsRef = useRef<HTMLInputElement>(null)
  const registryDocsRef = useRef<HTMLInputElement>(null)

  const isLoadedFile = (category: "customerInfo" | "contractDocs" | "registryDocs", fileName: string) => {
    return loadedFileInfo[category].some((f) => f.name === fileName)
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

  const handleDeleteModalClose = () => {
    setPendingDelete(null)
  }

  const handleDeleteModalConfirm = () => {
    if (!pendingDelete) {
      return
    }
    handleUploadedFileDelete(pendingDelete.category, pendingDelete.fileName)
    setPendingDelete(null)
  }

  const handleDragEnter = (category: CategoryKey, e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    dragCounterRef.current[category] = (dragCounterRef.current[category] ?? 0) + 1
    if (dragCounterRef.current[category] === 1) {
      setDragStates((prev) => ({ ...prev, [category]: true }))
    }
  }

  const handleDragLeave = (category: CategoryKey, e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    dragCounterRef.current[category] =
      Math.max((dragCounterRef.current[category] ?? 1) - 1, 0)
    if (dragCounterRef.current[category] === 0) {
      setDragStates((prev) => ({ ...prev, [category]: false }))
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    e.dataTransfer.dropEffect = "copy"
  }

  const handleDrop = (category: CategoryKey, e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    dragCounterRef.current[category] = 0
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

  const getCombinedFiles = (category: CategoryKey): CombinedFile[] => {
    const loaded = loadedFileInfo[category]
      .filter(f => !deletedFiles[category].has(f.name))
      .map((f) => ({
        name: f.name,
        isLoaded: true,
        fileKey: f.fileKey,
      }))
    const uploaded = uploadedFiles[category].map((f) => ({
      name: f.name,
      isLoaded: false,
    }))
    return [...loaded, ...uploaded]
  }

  const handleFilePreview = async (fileKey?: string) => {
    if (!fileKey) {
      return
    }

    try {
      const { downloadUrl } = await api.getFileDownloadUrl(fileKey)
      window.open(downloadUrl, '_blank', 'noopener,noreferrer')
    } catch (error) {
      console.error('Failed to open file preview:', error)
    }
  }

  const getTotalFilesCount = () => {
    return (
      loadedFileInfo.customerInfo.length +
      loadedFileInfo.contractDocs.length +
      loadedFileInfo.registryDocs.length + 
      uploadedFiles.customerInfo.length +
      uploadedFiles.contractDocs.length +
      uploadedFiles.registryDocs.length -
      deletedFiles.customerInfo.size -
      deletedFiles.contractDocs.size -
      deletedFiles.registryDocs.size
    )
  }

  return (
    <div className="bg-slate-50 p-4 sm:p-6">
      <div className="container mx-auto space-y-6 relative">
        {isUploadingFiles && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 rounded-xl bg-white/80 backdrop-blur">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm font-medium text-slate-600">ファイルをアップロードしています...</p>
          </div>
        )}
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold">データ取込</h1>
          {!hasJobId && (
            <Button variant="outline" size="sm" onClick={() => router.push("/")}>
              <Home className="mr-2 h-4 w-4" />
              TOPへ戻る
            </Button>
          )}
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
                    onChange={(e) => {
                      setJobName(e.target.value)
                      if (jobNameError) {
                        setJobNameError("")
                      }
                    }}
                    placeholder="例: 顧客A - データ取込"
                    aria-invalid={Boolean(jobNameError)}
                    aria-describedby={jobNameError ? "job-name-error" : undefined}
                  />
                  {jobNameError && (
                    <p className="text-xs text-destructive" id="job-name-error">
                      {jobNameError}
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
            <FileCard title="顧客情報" category="customerInfo" inputRef={customerInfoRef} />
            <FileCard title="契約書類等" category="contractDocs" inputRef={contractDocsRef} />
            <FileCard title="登記簿謄本" category="registryDocs" inputRef={registryDocsRef} />
          </div>
          <div className="flex flex-col gap-y-4">
            <Card className="h-fit top-6">
              <CardHeader>
                <CardTitle>アップロード済みファイル一覧</CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="max-h-[600px] overflow-y-auto">
                  <div className="space-y-6">
                    {CATEGORY_SECTIONS.map(({ key, title }) => {
                      const combinedFiles = getCombinedFiles(key)
                      return (
                        <div key={key}>
                          <h3 className="font-semibold text-sm mb-2 text-slate-700">{title}</h3>
                          {combinedFiles.length === 0 ? (
                            <p className="text-sm text-muted-foreground">ファイルがありません</p>
                          ) : (
                            <ul className="space-y-1">
                              {combinedFiles.map((file, index) => {
                                const previewable = Boolean(file.fileKey)
                                return (
                                  <li
                                    key={`${file.isLoaded ? 'loaded' : 'new'}-${file.name}`}
                                    className="flex items-center gap-2 text-sm text-slate-600 hover:bg-slate-100 px-2 py-1.5 rounded transition-colors"
                                  >
                                    <span
                                      className={`flex-1 break-words text-left ${
                                        previewable ? 'cursor-pointer text-primary hover:underline' : ''
                                      }`}
                                      role={previewable ? 'button' : undefined}
                                      tabIndex={previewable ? 0 : undefined}
                                      onClick={() => previewable && handleFilePreview(file.fileKey)}
                                      onKeyDown={(event) => {
                                        if (
                                          previewable &&
                                          (event.key === 'Enter' || event.key === ' ')
                                        ) {
                                          event.preventDefault()
                                          handleFilePreview(file.fileKey)
                                        }
                                      }}
                                    >
                                      {index + 1}. {file.name}
                                    </span>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-7 w-7 shrink-0 hover:bg-red-50"
                                      onClick={() =>
                                        setPendingDelete({
                                          category: key,
                                          fileName: file.name,
                                        })
                                      }
                                      title="ファイルを削除"
                                    >
                                      <Trash2 className="h-4 w-4 text-red-500" />
                                    </Button>
                                  </li>
                                )
                              })}
                            </ul>
                          )}
                        </div>
                      )
                    })}

                    <div className="mt-3 pt-3 border-t">
                      <p className="text-xs text-muted-foreground text-center">
                        合計: {getTotalFilesCount()}件
                      </p>
                    </div>
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
            <div className="flex justify-end">
              <Button
                onClick={async () => {
                  if (!jobName.trim()) {
                    setJobNameError("ジョブ名を入力してください")
                    return
                  }

                  const draftId = await autoSaveJob()
                  onNext(draftId)
                }}
                disabled={!canAccessStep(2) || isUploadingFiles}
                className="w-full sm:w-auto"
              >
                次へ
                <ChevronRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
        <ConfirmDeleteFileModal
          open={Boolean(pendingDelete)}
          onOpenChange={(open) => {
            if (!open) {
              handleDeleteModalClose()
            }
          }}
          fileName={pendingDelete?.fileName}
          onConfirm={handleDeleteModalConfirm}
        />
      </div>
    </div>
  )
}


