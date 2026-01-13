"use client"

import { useRouter } from "next/navigation"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ChevronLeft, Play, Home, Loader2 } from "lucide-react"
import { useUploadContext } from "@/contexts/upload-context"
import { api } from "@/lib/api"

interface PreviewProps {
  jobId: string | null
}

export default function Preview({ jobId }: PreviewProps) {
  const router = useRouter()
  const {
    uploadedFiles,
    loadedFileInfo,
    fieldMappings,
  } = useUploadContext()
  const [isRunning, setIsRunning] = useState(false)

  const handleRunJob = async () => {
    if (!jobId) {
      alert("ジョブが作成されていません。ファイルと項目の紐づけを保存してください。")
      return
    }

    try {
      setIsRunning(true)
      await api.runJob(jobId)
      alert("ジョブをバックグラウンドで実行予約しました。処理状況はトップ画面でご確認ください。")
      router.push("/")
    } catch (error) {
      console.error("Failed to start job run:", error)
      alert(
        error instanceof Error
          ? error.message
          : "ジョブの実行予約に失敗しました。再度お試しください。",
      )
    } finally {
      setIsRunning(false)
    }
  }

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
              <Button size="lg" onClick={handleRunJob} disabled={!jobId || isRunning}>
                {isRunning ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    実行予約中...
                  </>
                ) : (
                  <>
                    <Play className="mr-2 h-4 w-4" />
                    予約実行
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

