"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Download, Copy, Edit, Upload } from "lucide-react"

interface JobData {
  id: number
  name: string
  date: string
  files: number
  progress?: number
  // Step 1: Uploaded files
  uploadedFiles: {
    customerInfo: Array<{ name: string; size: number }>
    contractDocs: Array<{ name: string; size: number }>
    registryDocs: Array<{ name: string; size: number }>
  }
  // Step 2: Field mappings
  fieldMappings: Array<{
    fieldId: string
    fieldName: string
    fileIds: string[]
    note: string
  }>
  // Step 3: Reservation settings
  reservationSettings: {
    scheduledDate: string
    notificationEmail: string
    priority: string
  }
}

const mockJobs: {
  saved: JobData[]
  processing: JobData[]
  completed: JobData[]
} = {
  saved: [
    {
      id: 1,
      name: "顧客A - データ取込",
      date: "2024-01-15",
      files: 5,
      uploadedFiles: {
        customerInfo: [
          { name: "customer_A_info.pdf", size: 245000 },
          { name: "customer_A_profile.pdf", size: 189000 },
        ],
        contractDocs: [
          { name: "contract_A_001.pdf", size: 567000 },
          { name: "contract_A_002.pdf", size: 423000 },
        ],
        registryDocs: [{ name: "registry_A.pdf", size: 891000 }],
      },
      fieldMappings: [
        {
          fieldId: "court_name",
          fieldName: "裁判所名",
          fileIds: ["customer_A_info.pdf"],
          note: "東京地方裁判所",
        },
        {
          fieldId: "lawyer_name",
          fieldName: "弁護士名",
          fileIds: ["customer_A_profile.pdf"],
          note: "",
        },
        {
          fieldId: "plaintiff_defendant",
          fieldName: "原告と被告",
          fileIds: ["contract_A_001.pdf", "customer_A_info.pdf"],
          note: "契約書類と顧客情報を参照",
        },
        {
          fieldId: "contract_content",
          fieldName: "契約の内容",
          fileIds: ["contract_A_001.pdf", "contract_A_002.pdf"],
          note: "2つの契約書を確認",
        },
      ],
      reservationSettings: {
        scheduledDate: "2024-01-20 10:00",
        notificationEmail: "admin@example.com",
        priority: "高",
      },
    },
    {
      id: 2,
      name: "顧客B - 契約書類",
      date: "2024-01-14",
      files: 3,
      uploadedFiles: {
        customerInfo: [{ name: "customer_B_basic.pdf", size: 156000 }],
        contractDocs: [{ name: "contract_B_main.pdf", size: 678000 }],
        registryDocs: [{ name: "registry_B.pdf", size: 534000 }],
      },
      fieldMappings: [
        {
          fieldId: "parties",
          fieldName: "当事者",
          fileIds: ["customer_B_basic.pdf"],
          note: "顧客Bの基本情報から抽出",
        },
        {
          fieldId: "breach",
          fieldName: "被告の債務不履行",
          fileIds: ["contract_B_main.pdf"],
          note: "契約違反の詳細を確認",
        },
      ],
      reservationSettings: {
        scheduledDate: "2024-01-18 14:30",
        notificationEmail: "team@example.com",
        priority: "中",
      },
    },
  ],
  processing: [
    {
      id: 3,
      name: "顧客C - 登記簿",
      date: "2024-01-16",
      progress: 65,
      files: 8,
      uploadedFiles: {
        customerInfo: [
          { name: "customer_C_info.pdf", size: 234000 },
          { name: "customer_C_details.pdf", size: 345000 },
        ],
        contractDocs: [
          { name: "contract_C_001.pdf", size: 456000 },
          { name: "contract_C_002.pdf", size: 567000 },
          { name: "contract_C_003.pdf", size: 678000 },
        ],
        registryDocs: [
          { name: "registry_C_main.pdf", size: 789000 },
          { name: "registry_C_sub1.pdf", size: 456000 },
          { name: "registry_C_sub2.pdf", size: 345000 },
        ],
      },
      fieldMappings: [
        {
          fieldId: "court_name",
          fieldName: "裁判所名",
          fileIds: ["customer_C_info.pdf"],
          note: "大阪地方裁判所",
        },
        {
          fieldId: "contract_termination",
          fieldName: "契約の終了",
          fileIds: ["contract_C_003.pdf"],
          note: "最新の契約書を参照",
        },
        {
          fieldId: "damages",
          fieldName: "損害の発生",
          fileIds: ["contract_C_002.pdf", "registry_C_main.pdf"],
          note: "損害額の算定根拠",
        },
      ],
      reservationSettings: {
        scheduledDate: "2024-01-17 09:00",
        notificationEmail: "processing@example.com",
        priority: "高",
      },
    },
  ],
  completed: [
    {
      id: 4,
      name: "顧客D - 全データ",
      date: "2024-01-13",
      files: 12,
      uploadedFiles: {
        customerInfo: [
          { name: "customer_D_profile.pdf", size: 234000 },
          { name: "customer_D_history.pdf", size: 345000 },
          { name: "customer_D_additional.pdf", size: 456000 },
        ],
        contractDocs: [
          { name: "contract_D_main.pdf", size: 567000 },
          { name: "contract_D_annex1.pdf", size: 678000 },
          { name: "contract_D_annex2.pdf", size: 789000 },
          { name: "contract_D_amendment.pdf", size: 234000 },
        ],
        registryDocs: [
          { name: "registry_D_original.pdf", size: 890000 },
          { name: "registry_D_current.pdf", size: 567000 },
          { name: "registry_D_notes.pdf", size: 345000 },
          { name: "registry_D_attachments.pdf", size: 456000 },
          { name: "registry_D_index.pdf", size: 234000 },
        ],
      },
      fieldMappings: [
        {
          fieldId: "court_name",
          fieldName: "裁判所名",
          fileIds: ["customer_D_profile.pdf"],
          note: "横浜地方裁判所",
        },
        {
          fieldId: "lawyer_name",
          fieldName: "弁護士名",
          fileIds: ["customer_D_profile.pdf"],
          note: "田中太郎弁護士",
        },
        {
          fieldId: "plaintiff_defendant",
          fieldName: "原告と被告",
          fileIds: ["customer_D_profile.pdf", "contract_D_main.pdf"],
          note: "原告：顧客D、被告：相手方企業",
        },
        {
          fieldId: "summary",
          fieldName: "請求の要旨",
          fileIds: ["contract_D_main.pdf"],
          note: "契約不履行による損害賠償請求",
        },
        {
          fieldId: "parties",
          fieldName: "当事者",
          fileIds: ["customer_D_profile.pdf", "customer_D_history.pdf"],
          note: "両当事者の詳細情報",
        },
        {
          fieldId: "contract_content",
          fieldName: "契約の内容",
          fileIds: ["contract_D_main.pdf", "contract_D_annex1.pdf", "contract_D_annex2.pdf"],
          note: "主契約と付属契約書",
        },
        {
          fieldId: "breach",
          fieldName: "被告の債務不履行",
          fileIds: ["contract_D_amendment.pdf"],
          note: "修正契約における違反事項",
        },
        {
          fieldId: "contract_termination",
          fieldName: "契約の終了",
          fileIds: ["contract_D_amendment.pdf"],
          note: "契約解除の経緯",
        },
        {
          fieldId: "damages",
          fieldName: "損害の発生",
          fileIds: ["registry_D_current.pdf", "contract_D_main.pdf"],
          note: "損害額：5000万円",
        },
        {
          fieldId: "conclusion",
          fieldName: "結語",
          fileIds: ["registry_D_notes.pdf"],
          note: "よって、損害賠償を請求する",
        },
      ],
      reservationSettings: {
        scheduledDate: "2024-01-13 11:00",
        notificationEmail: "completed@example.com",
        priority: "高",
      },
    },
    {
      id: 5,
      name: "顧客E - 基本情報",
      date: "2024-01-12",
      files: 6,
      uploadedFiles: {
        customerInfo: [
          { name: "customer_E_basic.pdf", size: 178000 },
          { name: "customer_E_contact.pdf", size: 123000 },
        ],
        contractDocs: [
          { name: "contract_E_001.pdf", size: 456000 },
          { name: "contract_E_002.pdf", size: 389000 },
        ],
        registryDocs: [
          { name: "registry_E_main.pdf", size: 678000 },
          { name: "registry_E_appendix.pdf", size: 234000 },
        ],
      },
      fieldMappings: [
        {
          fieldId: "court_name",
          fieldName: "裁判所名",
          fileIds: ["customer_E_basic.pdf"],
          note: "名古屋地方裁判所",
        },
        {
          fieldId: "lawyer_name",
          fieldName: "弁護士名",
          fileIds: ["customer_E_contact.pdf"],
          note: "鈴木花子弁護士",
        },
        {
          fieldId: "parties",
          fieldName: "当事者",
          fileIds: ["customer_E_basic.pdf"],
          note: "",
        },
        {
          fieldId: "contract_content",
          fieldName: "契約の内容",
          fileIds: ["contract_E_001.pdf", "contract_E_002.pdf"],
          note: "取引基本契約",
        },
      ],
      reservationSettings: {
        scheduledDate: "2024-01-12 15:30",
        notificationEmail: "info@example.com",
        priority: "中",
      },
    },
    {
      id: 6,
      name: "顧客F - 契約関連",
      date: "2024-01-11",
      files: 9,
      uploadedFiles: {
        customerInfo: [
          { name: "customer_F_profile.pdf", size: 234000 },
          { name: "customer_F_business.pdf", size: 345000 },
        ],
        contractDocs: [
          { name: "contract_F_main.pdf", size: 567000 },
          { name: "contract_F_sub1.pdf", size: 456000 },
          { name: "contract_F_sub2.pdf", size: 345000 },
          { name: "contract_F_addendum.pdf", size: 234000 },
        ],
        registryDocs: [
          { name: "registry_F_corp.pdf", size: 789000 },
          { name: "registry_F_property.pdf", size: 678000 },
          { name: "registry_F_misc.pdf", size: 456000 },
        ],
      },
      fieldMappings: [
        {
          fieldId: "court_name",
          fieldName: "裁判所名",
          fileIds: ["customer_F_profile.pdf"],
          note: "福岡地方裁判所",
        },
        {
          fieldId: "summary",
          fieldName: "請求の要旨",
          fileIds: ["contract_F_main.pdf"],
          note: "契約金未払いによる請求",
        },
        {
          fieldId: "contract_content",
          fieldName: "契約の内容",
          fileIds: ["contract_F_main.pdf", "contract_F_addendum.pdf"],
          note: "業務委託契約と追加合意",
        },
        {
          fieldId: "breach",
          fieldName: "被告の債務不履行",
          fileIds: ["contract_F_sub1.pdf", "contract_F_sub2.pdf"],
          note: "支払期日を過ぎても未払い",
        },
        {
          fieldId: "damages",
          fieldName: "損害の発生",
          fileIds: ["contract_F_main.pdf"],
          note: "未払金額：2000万円",
        },
      ],
      reservationSettings: {
        scheduledDate: "2024-01-11 10:00",
        notificationEmail: "support@example.com",
        priority: "中",
      },
    },
  ],
}

export default function TopPage() {
  const [selectedJob, setSelectedJob] = useState<number | null>(null)
  const [activeJobTab, setActiveJobTab] = useState<"saved" | "processing" | "completed">("completed")
  const router = useRouter()

  const getJobsByStatus = (status: "saved" | "processing" | "completed") => {
    return mockJobs[status]
  }

  const getSelectedJobData = (): JobData | null => {
    if (!selectedJob) return null
    const allJobs = [...mockJobs.saved, ...mockJobs.processing, ...mockJobs.completed]
    return allJobs.find((job) => job.id === selectedJob) || null
  }

  const handleCopyJob = (jobId: number) => {
    const newJobId = Date.now()
    router.push(`/upload?step=1&jobId=${newJobId}&copyFrom=${jobId}`)
  }

  const selectedJobData = getSelectedJobData()

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="container mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">TOP</h1>
          <Button onClick={() => router.push("/upload?step=1")}>
            <Upload className="mr-2 h-4 w-4" />
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
                  <TabsTrigger value="saved">一時保存</TabsTrigger>
                  <TabsTrigger value="processing">処理中</TabsTrigger>
                  <TabsTrigger value="completed">完了</TabsTrigger>
                </TabsList>

                {(["saved", "processing", "completed"] as const).map((status) => (
                  <TabsContent key={status} value={status}>
                    <ScrollArea className="h-[400px] pr-4">
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
                                {status === "saved" && (
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
                                      // Handle download logic here
                                      console.log("Download job:", job.id)
                                    }}
                                    className="flex-1"
                                  >
                                    <Download className="mr-1 h-3 w-3" />
                                    ダウンロード
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      handleCopyJob(job.id)
                                    }}
                                    className="flex-1"
                                  >
                                    <Copy className="mr-1 h-3 w-3" />
                                    コピー & 編集
                                  </Button>
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
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
                <div className="space-y-4">
                  <div className="rounded-md border p-4">
                    <h3 className="font-semibold mb-3">ジョブ詳細</h3>
                    <div className="space-y-3 text-sm">
                      <div>
                        <span className="font-medium">ジョブID:</span> {selectedJobData.id}
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
                            {selectedJobData.fieldMappings.slice(0, 3).map((mapping, idx) => (
                              <li key={idx}>
                                {mapping.fieldName} ({mapping.fileIds.length}件)
                                {mapping.note && ` - ${mapping.note}`}
                              </li>
                            ))}
                            {selectedJobData.fieldMappings.length > 3 && (
                              <li>他 {selectedJobData.fieldMappings.length - 3}件</li>
                            )}
                          </ul>
                        </div>
                      )}

                      <div>
                        <span className="font-medium">実行予約:</span>
                        <div className="ml-4 mt-1 text-muted-foreground">
                          <p>予定日時: {selectedJobData.reservationSettings.scheduledDate}</p>
                          <p>優先度: {selectedJobData.reservationSettings.priority}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
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
