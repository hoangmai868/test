"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Download, Copy, Edit, Plus, Loader2 } from "lucide-react"
import { api } from "@/lib/api"
import { buildFieldIdentifier } from "@/lib/field-identifier"
import { useAuth } from "@/contexts/auth-context"
import { JobStatus, JOB_STATUS_LIST } from "@/types/shared/job-status"

interface JobData {
  id: string | number
  name: string
  date: string
  createdAt: string
  templateName?: string
  completedAt: string
  files: number
  progress?: number
  // Step 1: Uploaded files
  uploadedFiles: {
    customerInfo: Array<{ name: string; size?: number }>
    contractDocs: Array<{ name: string; size?: number }>
    registryDocs: Array<{ name: string; size?: number }>
  }
  // Step 2: Field mappings
  fieldMappings: Array<{
    fieldId: string
    fieldName?: string
    fileIds: string[]
    fileNames: string[]
    note: string
    extractedValue: string
  }>
  // Step 3: Reservation settings
  reservationSettings: {
    scheduledDate: string
    notificationEmail: string
    priority: string
  }
}

// Transform API job data to JobData format
const transformJobData = (job: any): JobData => {
  const uploadedFiles = {
    customerInfo: job.files
      ?.filter((f: any) => f.category === 'customer_info')
      .map((f: any) => ({ name: f.fileName || '' })) || [],
    contractDocs: job.files
      ?.filter((f: any) => f.category === 'contract_documents')
      .map((f: any) => ({ name: f.fileName || '' })) || [],
    registryDocs: job.files
      ?.filter((f: any) => f.category === 'registry_transcript')
      .map((f: any) => ({ name: f.fileName || '' })) || [],
  }

  // Handle both grouped and flat formats for templateJson
  let fieldMappings: Array<{
    fieldId: string
    fieldName?: string
    fileIds: string[]
    fileNames: string[]
    note: string
    extractedValue: string
  }> = []
  
  if (Array.isArray(job.templateJson) && job.templateJson.length > 0) {
    // Check if it's the new grouped format
    const isGroupedFormat = job.templateJson[0]?.groupName !== undefined
    
    if (isGroupedFormat) {
      // Transform from grouped format to flat format
      job.templateJson.forEach((group: { groupName: string; fields: Array<{ name: string; fileNames: string[]; fileKeys?: string[]; note: string; extractedValue: string }> }) => {
        group.fields.forEach((field) => {
          const normalizedFieldId = field.name
            ? buildFieldIdentifier(group.groupName || '', field.name)
            : field.name || ''
          fieldMappings.push({
            fieldId: normalizedFieldId,
            fieldName: field.name,
            fileIds: field.fileNames || [],
            fileNames: field.fileNames || [],
            note: field.note || '',
            extractedValue: field.extractedValue || '',
          })
        })
      })
    } else {
      // Old flat format (backward compatibility)
      fieldMappings = job.templateJson.map((mapping: any) => ({
        fieldId: mapping.fieldId || '',
        fieldName: mapping.fieldName || '',
        fileIds: mapping.fileIds || mapping.fileNames || [],
        fileNames: mapping.fileNames || mapping.fileIds || [],
        note: mapping.note || '',
        extractedValue: mapping.extractedValue || '',
      }))
    }
  }

  const totalFiles = uploadedFiles.customerInfo.length + uploadedFiles.contractDocs.length + uploadedFiles.registryDocs.length
  const createdAtDate = job.createdAt ? new Date(job.createdAt) : new Date()
  const date = createdAtDate.toISOString().split('T')[0]
  const createdAt = createdAtDate.toLocaleString('ja-JP')
  const templateName = job.template?.displayName || job.template?.fileName || ''
  const completedAtDate = job.completedAt ? new Date(job.completedAt) : null
  const completedAt = completedAtDate ? completedAtDate.toLocaleString('ja-JP') : ''

  return {
    id: job.id,
    name: job.title || '',
    date,
    createdAt,
    templateName,
    completedAt,
    files: totalFiles,
    uploadedFiles,
    fieldMappings,
    reservationSettings: {
      scheduledDate: job.scheduledDate || '',
      notificationEmail: '',
      priority: '',
    },
  }
}

export default function TopPage() {
  const [selectedJob, setSelectedJob] = useState<string | number | null>(null)
  const [activeJobTab, setActiveJobTab] = useState<JobStatus>("draft")
  const [jobs, setJobs] = useState<Record<JobStatus, JobData[]>>({
    draft: [],
    processing: [],
    completed: [],
  })
  const [isLoading, setIsLoading] = useState(true)
  const [copyingJobId, setCopyingJobId] = useState<string | number | null>(null)
  const [downloadingJobId, setDownloadingJobId] = useState<string | number | null>(null)
  const router = useRouter()
  const { user } = useAuth()

  useEffect(() => {
    const fetchJobs = async () => {
      if (!user?.id) {
        setIsLoading(false)
        return
      }

      try {
        setIsLoading(true)
        const fetchedJobs = await api.getJobsByUserId(user.id)
        
        // Transform và group jobs by status
        const transformedJobs = fetchedJobs.map(transformJobData)
        
        const groupedJobs = {
          draft: transformedJobs.filter((job: JobData) => {
            // Get original job to check status
            const originalJob = fetchedJobs.find((j: any) => j.id === job.id)
            return originalJob?.status === 'draft'
          }),
          processing: transformedJobs.filter((job: JobData) => {
            const originalJob = fetchedJobs.find((j: any) => j.id === job.id)
            return originalJob?.status === 'processing'
          }),
          completed: transformedJobs.filter((job: JobData) => {
            const originalJob = fetchedJobs.find((j: any) => j.id === job.id)
            return originalJob?.status === 'completed'
          }),
        }

        setJobs(groupedJobs)
      } catch (error) {
        console.error('Failed to fetch jobs:', error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchJobs()
  }, [user?.id])

  const getJobsByStatus = (status: JobStatus) => {
    return jobs[status]
  }

  const getSelectedJobData = (): JobData | null => {
    if (!selectedJob) return null
    const allJobs = [...jobs.draft, ...jobs.processing, ...jobs.completed]
    return allJobs.find((job) => job.id === selectedJob) || null
  }

  const handleCopyJob = async (jobId: string | number) => {
    try {
      setCopyingJobId(jobId)
      const newJob = await api.copyJob(String(jobId))
      // Redirect to edit page of the newly created job
      router.push(`/upload?step=1&jobId=${newJob.id}`)
    } catch (error) {
      console.error('Failed to copy job:', error)
      alert('ジョブのコピーに失敗しました: ' + (error instanceof Error ? error.message : 'Unknown error'))
    } finally {
      setCopyingJobId(null)
    }
  }

  const handleDownloadJob = async (jobId: string | number) => {
    try {
      setDownloadingJobId(jobId)
      await api.downloadJobExcel(String(jobId))
    } catch (error) {
      console.error('Failed to download job Excel:', error)
      alert('Excelファイルのダウンロードに失敗しました: ' + (error instanceof Error ? error.message : 'Unknown error'))
    } finally {
      setDownloadingJobId(null)
    }
  }

  const selectedJobData = getSelectedJobData()

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="container mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">{""}</h1>
          <Button onClick={() => router.push("/upload?step=1")}>
            <Plus className="mr-2 h-4 w-4" />
            新規アップロード
          </Button>
        </div>
        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>ジョブ一覧</CardTitle>
            </CardHeader>
            <CardContent>
              <Tabs value={activeJobTab} onValueChange={(v) => setActiveJobTab(v as typeof activeJobTab)}>
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="draft">一時保存</TabsTrigger>
                  <TabsTrigger value="processing">処理中</TabsTrigger>
                  <TabsTrigger value="completed">完了</TabsTrigger>
                </TabsList>

                {JOB_STATUS_LIST.map((status) => (
                  <TabsContent key={status} value={status}>
                    <ScrollArea className="h-[400px]">
                      {isLoading ? (
                        <div className="flex items-center justify-center h-[400px]">
                          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                          <span className="ml-2 text-muted-foreground">読み込み中...</span>
                        </div>
                      ) : getJobsByStatus(status).length === 0 ? (
                        <div className="flex items-center justify-center h-[400px] text-muted-foreground">
                          ジョブがありません
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {getJobsByStatus(status).map((job) => (
                          <div
                            key={job.id}
                            className={`p-4 rounded-md border cursor-pointer transition-colors ${
                              selectedJob === job.id ? "bg-primary/10 border-primary" : "hover:bg-muted"
                            }`}
                            onClick={() => setSelectedJob(job.id)}
                          >
                            <div className="space-y-2">
                              <div className="flex items-start justify-between gap-2">
                                <div className="space-y-1 flex-1">
                                  <p className="font-medium">{job.name}</p>
                                  <p className="text-sm text-muted-foreground">
                                    {job.date} • {job.files}件のファイル
                                  </p>
                                </div>
                                {status === "draft" && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      router.push(`/upload?step=1&jobId=${job.id}`)
                                    }}
                                    className="shrink-0"
                                  >
                                    <Edit className="mr-1 h-3 w-3" />
                                    編集
                                  </Button>
                                )}
                              </div>
                              {status === "completed" && (
                                <div className="flex gap-2">
                                  <Button
                                    size="sm"
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      handleDownloadJob(job.id)
                                    }}
                                    className="flex-1"
                                    disabled={downloadingJobId === job.id}
                                  >
                                    {downloadingJobId === job.id ? (
                                      <>
                                        <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                                        ダウンロード中...
                                      </>
                                    ) : (
                                      <>
                                        <Download className="mr-1 h-3 w-3" />
                                        ダウンロード
                                      </>
                                    )}
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      handleCopyJob(job.id)
                                    }}
                                    className="flex-1"
                                    disabled={copyingJobId === job.id}
                                  >
                                    {copyingJobId === job.id ? (
                                      <>
                                        <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                                        コピー中...
                                      </>
                                    ) : (
                                      <>
                                        <Copy className="mr-1 h-3 w-3" />
                                        複製
                                      </>
                                    )}
                                  </Button>
                                </div>
                              )}
                            </div>
                          </div>
                          ))}
                        </div>
                      )}
                    </ScrollArea>
                  </TabsContent>
                ))}
              </Tabs>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>プレビュー</CardTitle>
            </CardHeader>
            <CardContent>
              {selectedJobData ? (
                <ScrollArea className="h-[400px]">
                  <div className="space-y-4 p-4">
                    <div className="rounded-md border p-4">
                      <h3 className="font-semibold mb-3">ジョブ詳細</h3>
                      <div className="space-y-3 text-sm">
                        <div>
                        <span className="font-medium">ジョブ名:</span> {selectedJobData.name}
                      </div>

                      <div>
                        <span className="font-medium">テンプレート:</span>{" "}
                        <span className="text-muted-foreground">
                          {selectedJobData.templateName || "未選択"}
                        </span>
                      </div>

                      <div>
                        <span className="font-medium">登録ファイル:</span>
                        <div className="ml-4 mt-1 space-y-2">
                          {selectedJobData.uploadedFiles.customerInfo.length > 0 && (
                            <div>
                              <p className="text-xs font-medium text-muted-foreground">顧客情報:</p>
                              <ul className="list-disc list-inside ml-2 text-muted-foreground">
                                {selectedJobData.uploadedFiles.customerInfo.map((file, idx) => (
                                  <li key={idx}>{file.name}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                          {selectedJobData.uploadedFiles.contractDocs.length > 0 && (
                            <div>
                              <p className="text-xs font-medium text-muted-foreground">契約書類等:</p>
                              <ul className="list-disc list-inside ml-2 text-muted-foreground">
                                {selectedJobData.uploadedFiles.contractDocs.map((file, idx) => (
                                  <li key={idx}>{file.name}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                          {selectedJobData.uploadedFiles.registryDocs.length > 0 && (
                            <div>
                              <p className="text-xs font-medium text-muted-foreground">登記簿謄本:</p>
                              <ul className="list-disc list-inside ml-2 text-muted-foreground">
                                {selectedJobData.uploadedFiles.registryDocs.map((file, idx) => (
                                  <li key={idx}>{file.name}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      </div>

                      {selectedJobData.fieldMappings.length > 0 && (
                        <div>
                          <span className="font-medium">項目紐づけ:</span>
                          <ul className="list-disc list-inside ml-4 mt-1 text-muted-foreground">
                            {selectedJobData.fieldMappings.map((mapping, idx) => {
                              const label = mapping.fieldName || mapping.fieldId || "未定義の項目"
                              const fileNames =
                                (mapping.fileNames && mapping.fileNames.length > 0
                                  ? mapping.fileNames
                                  : mapping.fileIds) || []
                              const fileLabel = fileNames.length > 0 ? fileNames.join("、") : "ファイル未割当"

                              return (
                                <li key={idx}>
                                  <span className="font-semibold">{label}:</span>{" "}
                                  <span className="text-muted-foreground">{fileLabel}</span>
                                  {mapping.note && (
                                    <span className="text-muted-foreground"> - {mapping.note}</span>
                                  )}
                                </li>
                              )
                            })}
                          </ul>
                        </div>
                      )}

                      <div>
                        <span className="font-medium">実行予約:</span>
                        <div className="ml-4 mt-1 text-muted-foreground">
                          <p>完了日時: {selectedJobData.completedAt || "未完了"}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                </ScrollArea>
              ) : (
                <div className="flex items-center justify-center h-[400px] text-muted-foreground">
                  ジョブを選択してください
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
