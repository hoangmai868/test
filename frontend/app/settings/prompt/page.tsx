"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { X } from "lucide-react"
import { useRouter } from "next/navigation"

const fieldGroups = [
  {
    groupName: "名称",
    fields: ["裁判所名", "弁護士名", "原告と被告"],
  },
  {
    groupName: "請求の要旨",
    fields: ["請求の要旨"],
  },
  {
    groupName: "請求の原因",
    fields: ["当事者", "契約の内容", "被告の債務不履行", "契約の終了", "損害の発生", "結語"],
  },
  {
    groupName: "証拠書類",
    fields: ["証拠書類"],
  },
]

export default function PromptSettingsPage() {
  const router = useRouter()
  const [prompts, setPrompts] = useState<Record<string, string>>({})
  const [outputs, setOutputs] = useState<Record<string, string>>({})

  const handlePromptChange = (fieldName: string, value: string) => {
    setPrompts((prev) => ({ ...prev, [fieldName]: value }))
  }

  const handleGenerate = (fieldName: string) => {
    // Simulate generation
    setOutputs((prev) => ({ ...prev, [fieldName]: "生成中..." }))
    setTimeout(() => {
      setOutputs((prev) => ({ ...prev, [fieldName]: "生成完了" }))
    }, 1000)
  }

  return (
    <div className="container mx-auto py-8 space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>プロンプト設定</CardTitle>
            <Button variant="ghost" size="icon" onClick={() => router.push("/upload?step=2")} className="h-9 w-9">
              <X className="h-5 w-5" />
            </Button>
          </div>
        </CardHeader>

        <CardContent>
          <div className="w-full rounded-md border overflow-auto max-h-[calc(100vh-240px)]">
            <style jsx>{`
              .settings-table {
                table-layout: auto;
                border-collapse: collapse;
                width: 100%;
              }
              
              .settings-table th,
              .settings-table td {
                border: 1px solid rgb(226, 232, 240);
              }
              
              .dark .settings-table th,
              .dark .settings-table td {
                border: 1px solid rgb(51, 65, 85);
              }
              
              .sticky-header {
                position: sticky;
                top: 0;
                z-index: 20;
                background: white;
                border-bottom: 2px solid rgb(226, 232, 240);
              }
              
              .dark .sticky-header {
                background: hsl(var(--background));
                border-bottom: 2px solid rgb(51, 65, 85);
              }
              
              .sticky-col {
                position: sticky;
                left: 0;
                z-index: 10;
                background: white;
              }
              
              .dark .sticky-col {
                background: hsl(var(--background));
              }
              
              .sticky-col-2 {
                position: sticky;
                left: 100px;
                z-index: 10;
                background: white;
              }
              
              .dark .sticky-col-2 {
                background: hsl(var(--background));
              }
              
              .group-border-bottom {
                border-bottom: 2px solid rgb(100, 116, 139) !important;
              }
            `}</style>

            <table className="settings-table">
              <thead>
                <tr>
                  <th className="sticky-header sticky-col text-center font-bold text-sm px-4 py-3 w-[100px] bg-blue-50 dark:bg-blue-950">
                    分類
                  </th>
                  <th className="sticky-header sticky-col-2 text-center font-bold text-sm px-4 py-3 w-[180px] bg-blue-50 dark:bg-blue-950">
                    項目名
                  </th>
                  <th className="sticky-header text-center font-bold text-sm px-4 py-3 bg-blue-50 dark:bg-blue-950">
                    プロンプト
                  </th>
                  <th className="sticky-header text-center font-bold text-sm px-4 py-3 w-[200px] bg-blue-50 dark:bg-blue-950">
                    出力結果
                  </th>
                </tr>
              </thead>

              <tbody>
                {fieldGroups.map((group, groupIndex) =>
                  group.fields.map((field, fieldIndex) => {
                    const isFirstFieldInGroup = fieldIndex === 0
                    const isLastFieldInGroup = fieldIndex === group.fields.length - 1
                    const rowKey = `${group.groupName}-${field}`

                    return (
                      <tr key={rowKey} className="hover:bg-muted/50">
                        {isFirstFieldInGroup && (
                          <td
                            rowSpan={group.fields.length}
                            className={`sticky-col font-bold text-sm px-4 py-3 text-center bg-gray-50 dark:bg-gray-900 ${
                              isLastFieldInGroup ? "group-border-bottom" : ""
                            }`}
                          >
                            <div className="whitespace-nowrap">{group.groupName}</div>
                          </td>
                        )}

                        <td
                          className={`sticky-col-2 font-medium text-sm px-4 py-3 ${
                            isLastFieldInGroup ? "group-border-bottom" : ""
                          }`}
                        >
                          <div className="whitespace-nowrap" title={field}>
                            {field}
                          </div>
                        </td>

                        <td className={`px-4 py-3 ${isLastFieldInGroup ? "group-border-bottom" : ""}`}>
                          <Textarea
                            placeholder="【登録ファイル】から、情報を取得し、訴状として以下のように記載。最後に、X追加したコメントを追加すること。"
                            value={prompts[field] || ""}
                            onChange={(e) => handlePromptChange(field, e.target.value)}
                            className="min-h-[80px] text-sm"
                          />
                        </td>

                        <td
                          className={`px-4 py-3 align-top text-center ${
                            isLastFieldInGroup ? "group-border-bottom" : ""
                          }`}
                        >
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleGenerate(field)}
                            className="mb-2 w-full"
                          >
                            生成
                          </Button>
                          {outputs[field] && <div className="text-xs text-muted-foreground mt-2">{outputs[field]}</div>}
                        </td>
                      </tr>
                    )
                  }),
                )}
              </tbody>
            </table>
          </div>

          <div className="mt-6 flex justify-center">
            <Button className="w-full max-w-md bg-yellow-500 hover:bg-yellow-600 text-white font-bold">
              プロンプト登録
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
