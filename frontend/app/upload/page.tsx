"use client"

import type React from "react"

import { useSearchParams, useRouter } from "next/navigation"
import { Suspense, useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Upload, Trash2, ChevronLeft, Play } from "lucide-react"
import { useUploadContext } from "@/contexts/upload-context"
import FileMappingScreen from "@/components/screens/file-mapping-screen"

function UploadContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const step = searchParams.get("step") || "1"
  const { uploadedFiles, setUploadedFiles, fieldMappings, setFieldMappings, canAccessStep } = useUploadContext()

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

  useEffect(() => {
    const currentStepNum = Number.parseInt(step)
    if (!canAccessStep(currentStepNum)) {
      router.push("/upload?step=1")
    }
  }, [step, canAccessStep, router])

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
    setUploadedFiles((prev) => ({
      ...prev,
      [category]: prev[category].filter((f) => f.name !== fileName),
    }))
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
    inputRef: React.RefObject<HTMLInputElement>
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

  if (step === "1") {
    return (
      <div className="bg-slate-50 p-4 sm:p-6">
        <div className="container mx-auto space-y-6">
          <h1 className="text-2xl font-bold">データ取込</h1>

          <div className="grid gap-6 lg:grid-cols-[1fr_400px]">
            <div className="space-y-4">
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
                      {uploadedFiles.customerInfo.length === 0 ? (
                        <p className="text-sm text-muted-foreground">ファイルがありません</p>
                      ) : (
                        <ul className="space-y-1">
                          {uploadedFiles.customerInfo.map((file, index) => (
                            <li
                              key={file.name}
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
                      {uploadedFiles.contractDocs.length === 0 ? (
                        <p className="text-sm text-muted-foreground">ファイルがありません</p>
                      ) : (
                        <ul className="space-y-1">
                          {uploadedFiles.contractDocs.map((file, index) => (
                            <li
                              key={file.name}
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
                      {uploadedFiles.registryDocs.length === 0 ? (
                        <p className="text-sm text-muted-foreground">ファイルがありません</p>
                      ) : (
                        <ul className="space-y-1">
                          {uploadedFiles.registryDocs.map((file, index) => (
                            <li
                              key={file.name}
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
                        合計:{" "}
                        {uploadedFiles.customerInfo.length +
                          uploadedFiles.contractDocs.length +
                          uploadedFiles.registryDocs.length}
                        件
                      </p>
                    </div>
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </div>

          <div className="flex justify-end">
            <Button
              onClick={() => router.push("/upload?step=2")}
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
          fieldMappings={fieldMappings}
          setFieldMappings={setFieldMappings}
          onBack={() => router.push("/upload?step=1")}
          onNext={() => router.push("/upload?step=3")}
          canProceed={canAccessStep(3)}
        />
      </div>
    )
  }

  if (step === "3") {
    return (
      <div className="bg-slate-50 p-6">
        <div className="container mx-auto">
          <h1 className="text-2xl font-bold mb-6">予約実行</h1>
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
                      <li>顧客情報: {uploadedFiles.customerInfo.length}件のファイル</li>
                      <li>契約書類等: {uploadedFiles.contractDocs.length}件のファイル</li>
                      <li>登記簿謄本: {uploadedFiles.registryDocs.length}件のファイル</li>
                    </ul>
                  </div>
                  <div>
                    <p className="font-medium">マッピング済み項目: 9件</p>
                  </div>
                  <div>
                    <p className="font-medium">追加コメント: 5件</p>
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
                <Button variant="outline" onClick={() => router.push("/upload?step=2")}>
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
