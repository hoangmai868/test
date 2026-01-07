"use client"

import type React from "react"

import { useSearchParams, useRouter } from "next/navigation"
import { Suspense, useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Upload, Trash2, ChevronLeft, Play, Home, Loader2 } from "lucide-react"
import { useUploadContext } from "@/contexts/upload-context"
import FileMappingScreen from "@/components/screens/file-mapping-screen"
import { useAuth } from "@/contexts/auth-context"
import { api } from "@/lib/api"

function UploadContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const step = searchParams.get("step") || "1"
  const urlJobId = searchParams.get("jobId")
  const { user } = useAuth()
  const { 
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
  } = useUploadContext()
  const [loadedJobId, setLoadedJobId] = useState<string | null>(null)
  
  // Track deleted files (files that were loaded from API but are now deleted)
  const [deletedFiles, setDeletedFiles] = useState<{
    customerInfo: Set<string>
    contractDocs: Set<string>
    registryDocs: Set<string>
  }>({
    customerInfo: new Set(),
    contractDocs: new Set(),
    registryDocs: new Set(),
  })

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

  const buildStepUrl = (stepValue: number | string) => {
    const id = urlJobId || jobId
    return id ? `/upload?step=${stepValue}&jobId=${id}` : `/upload?step=${stepValue}`
  }

  const isLoadedFile = (category: "customerInfo" | "contractDocs" | "registryDocs", fileName: string) => {
    return loadedFileInfo[category].some((f) => f.name === fileName)
  }

  // Load job data when jobId is in URL (edit mode)
  useEffect(() => {
    const loadJob = async () => {
      if (urlJobId && urlJobId !== loadedJobId) {
        try {
          // Clear stale state from previous sessions/jobs before loading
          resetContext()
          setDeletedFiles({
            customerInfo: new Set(),
            contractDocs: new Set(),
            registryDocs: new Set(),
          })
          await loadJobData(urlJobId)
          setLoadedJobId(urlJobId)
        } catch (error) {
          console.error("Failed to load job:", error)
          // Redirect to step 1 without jobId if loading fails
          router.push("/upload?step=1")
        }
      }
    }
    loadJob()
  }, [urlJobId, loadedJobId, loadJobData, resetContext, router])

  // Reset loadedJobId when navigating away (no jobId in URL)
  useEffect(() => {
    if (!urlJobId && loadedJobId) {
      setLoadedJobId(null)
      setDeletedFiles({
        customerInfo: new Set(),
        contractDocs: new Set(),
        registryDocs: new Set(),
      })
    }
  }, [urlJobId, loadedJobId])

  useEffect(() => {
    const currentStepNum = Number.parseInt(step)
    if (!canAccessStep(currentStepNum) && !isLoadingJob) {
      router.push(buildStepUrl(1))
    }
  }, [step, canAccessStep, router, isLoadingJob, urlJobId, jobId])

  const autoSaveJob = async (templateId?: string): Promise<string | null> => {
    if (!user || !jobName.trim()) {
      return null // Skip auto-save if no user or job name
    }

    try {
      // Get template ID - use first template if not provided
      let templateIdToUse = templateId
      if (!templateIdToUse) {
        const templates = await api.getTemplates()
        if (templates.length > 0) {
          templateIdToUse = templates[0].id
        } else {
          return null // No template available
        }
      }

      const templateJson = fieldMappings

      const files: Array<{
        fileName: string
        fileKey?: string
        category: 'customer_info' | 'contract_documents' | 'registry_transcript'
      }> = []

      // Include already-saved files (loaded from API) so edit-mode autosave doesn't wipe them
      // Exclude deleted files
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
      // Silently fail for auto-save
      return null
    }

  }

  const handleFileSelect = (category: "customerInfo" | "contractDocs" | "registryDocs", files: FileList | null) => {
    if (files) {
      const fileArray = Array.from(files)
      // Auto upload files immediately
      setUploadedFiles((prev) => ({
        ...prev,
        [category]: [...prev[category], ...fileArray],
      }))
    }
  }

  const handleUploadedFileDelete = (category: "customerInfo" | "contractDocs" | "registryDocs", fileName: string) => {
    // If it's a loaded file, mark it as deleted
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
      // If it's an uploaded file, remove it from uploadedFiles
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
        // Auto upload dropped files immediately
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
      {/* Removed upload button from header */}
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

  // Helper to get combined files (loaded from API + newly uploaded, excluding deleted)
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

  if (isLoadingJob) {
    return (
      <div className="bg-slate-50 p-4 sm:p-6 min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">ジョブデータを読み込み中...</p>
        </div>
      </div>
    )
  }

  if (step === "1") {
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
                router.push(savedId ? `/upload?step=2&jobId=${savedId}` : "/upload?step=2")
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

  if (step === "2") {
    return (
      <div className="bg-slate-50">
        <FileMappingScreen
          uploadedFiles={uploadedFiles}
          loadedFileInfo={loadedFileInfo}
          fieldMappings={fieldMappings}
          setFieldMappings={setFieldMappings}
          onBack={() => router.push(jobId ? `/upload?step=1&jobId=${jobId}` : "/upload?step=1")}
          onNext={() => router.push(jobId ? `/upload?step=3&jobId=${jobId}` : "/upload?step=3")}
          canProceed={canAccessStep(3)}
        />
      </div>
    )
  }

  if (step === "3") {
    const totalCustomerFiles = loadedFileInfo.customerInfo.length + uploadedFiles.customerInfo.length
    const totalContractFiles = loadedFileInfo.contractDocs.length + uploadedFiles.contractDocs.length
    const totalRegistryFiles = loadedFileInfo.registryDocs.length + uploadedFiles.registryDocs.length
    const mappingsWithFiles = fieldMappings.filter(m => m.fileIds.length > 0).length
    const mappingsWithNotes = fieldMappings.filter(m => m.note.trim() !== "").length

    return (
      <div className="bg-slate-50 p-6">
        <div className="container mx-auto">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-bold">予約実行</h1>
            <Button variant="outline" size="sm" onClick={() => router.push("/")}>
              <Home className="mr-2 h-4 w-4" />
              TOPへ戻る
            </Button>
          </div>
          <Card>
            <CardHeader>
              <CardTitle>予約実行</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="rounded-md border p-4">
                <h3 className="font-semibold mb-4">処理内容の確認</h3>
                <div className="space-y-3 text-sm">
                  <div>
                    <p className="font-medium">登録ファイル:</p>
                    <ul className="list-disc list-inside text-muted-foreground ml-2">
                      <li>顧客情報: {totalCustomerFiles}件のファイル</li>
                      <li>契約書類等: {totalContractFiles}件のファイル</li>
                      <li>登記簿謄本: {totalRegistryFiles}件のファイル</li>
                    </ul>
                  </div>
                  <div>
                    <p className="font-medium">マッピング済み項目: {mappingsWithFiles}件</p>
                  </div>
                  <div>
                    <p className="font-medium">追加コメント: {mappingsWithNotes}件</p>
                  </div>
                </div>
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-md p-4">
                <p className="text-sm text-amber-900">
                  「予約実行」ボタンを押すと、データ処理が開始されます。
                  <br />
                  処理完了まで時間がかかる場合があります。
                </p>
              </div>

              <div className="flex items-center justify-between">
                <Button variant="outline" onClick={() => router.push(jobId ? `/upload?step=2&jobId=${jobId}` : "/upload?step=2")}>
                  <ChevronLeft className="mr-2 h-4 w-4" />
                  戻る
                </Button>
                <Button size="lg">
                  <Play className="mr-2 h-4 w-4" />
                  予約実行
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return null
}

export default function UploadPage() {
  return (
    <Suspense fallback={<div>読み込み中...</div>}>
      <UploadContent />
    </Suspense>
  )
}

