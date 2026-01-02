"use client"

import { useRouter } from "next/navigation"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { Settings, ChevronLeft, ChevronRight } from "lucide-react"
import type { JSX } from "react/jsx-runtime"

interface FileMappingScreenProps {
  uploadedFiles: {
    customerInfo: File[]
    contractDocs: File[]
    registryDocs: File[]
  }
  fieldMappings: Array<{ fieldId: string; fileIds: string[]; note: string }>
  setFieldMappings: React.Dispatch<React.SetStateAction<Array<{ fieldId: string; fileIds: string[]; note: string }>>>
  onBack: () => void
  onNext: () => void
  canProceed: boolean
}

const truncateFileName = (fileName: string): string => {
  return fileName.length > 15 ? fileName.substring(0, 12) + "..." : fileName
}

const templateFieldGroups: Record<string, any> = {
  typeA: [
    {
      groupName: "裁判所",
      fields: [{ name: "裁判所", isParent: false }],
    },
    {
      groupName: "原告ら訴訟代理人弁護士",
      fields: [{ name: "原告ら訴訟代理人弁護士", isParent: false }],
    },
    {
      groupName: "同弁護士",
      fields: [{ name: "同弁護士", isParent: false }],
    },
    {
      groupName: "当事者の表示",
      fields: [
        { name: "原告（個人）", isParent: true },
        { name: "原告（法人）", isParent: true },
        { name: "被告（借主・個人）", isParent: true },
        { name: "被告（借主・法人）", isParent: true },
        { name: "被告（連帯保証人・個人）", isParent: true },
        { name: "被告（連帯保証人・法人）", isParent: true },
        { name: "被告（同居人・個人）", isParent: true },
      ],
    },
    {
      groupName: "当事者目録（個人）",
      fields: [
        { name: "郵便番号", isParent: false },
        { name: "住所", isParent: false },
        { name: "氏名", isParent: false },
      ],
    },
    {
      groupName: "当事者目録（法人）",
      fields: [
        { name: "郵便番号", isParent: false },
        { name: "住所", isParent: false },
        { name: "法人名", isParent: false },
        { name: "代表者役職", isParent: false },
        { name: "代表者氏名", isParent: false },
      ],
    },
    {
      groupName: "物件引き渡し日",
      fields: [{ name: "物件引き渡し日", isParent: false }],
    },
    {
      groupName: "物件目録（建物）",
      fields: [
        { name: "所在", isParent: false },
        { name: "家屋番号", isParent: false },
        { name: "種類", isParent: false },
        { name: "構造", isParent: false },
        { name: "床面積", isParent: false },
        { name: "占有情報", isParent: false },
        { name: "住居表示", isParent: false },
      ],
    },
    {
      groupName: "物件目録（区分所有マンション）",
      fields: [
        { name: "建物の名称", isParent: false },
        { name: "構造", isParent: false },
        { name: "床面積", isParent: false },
        { name: "土地の符号", isParent: false },
        { name: "所在及び地番", isParent: false },
        { name: "地目", isParent: false },
        { name: "地積", isParent: false },
        { name: "家屋番号", isParent: false },
        { name: "敷地権の種類", isParent: false },
        { name: "敷地権の割合", isParent: false },
      ],
    },
    {
      groupName: "物件目録（土地）",
      fields: [
        { name: "所在", isParent: false },
        { name: "地番", isParent: false },
        { name: "地目", isParent: false },
        { name: "地籍", isParent: false },
        { name: "占有情報", isParent: false },
        { name: "住居表示", isParent: false },
      ],
    },
    {
      groupName: "請求の原因詳細",
      fields: [
        { name: "契約年月日", isParent: false },
        { name: "契約期間", isParent: false },
        { name: "月額賃料等", isParent: false },
        { name: "家賃", isParent: false },
        { name: "共益費", isParent: false },
        { name: "事務手数料", isParent: false },
        { name: "支払期", isParent: false },
        { name: "契約の解除　条項", isParent: false },
        { name: "契約の解除　条文", isParent: false },
        { name: "滞納賃料", isParent: false },
        { name: "滞納期間", isParent: false },
        { name: "催告書発送日", isParent: false },
        { name: "催告書到達日（内容証明）", isParent: false },
        { name: "催告書到達日（特定記録）", isParent: false },
        { name: "催告書到達方法", isParent: false },
        { name: "催告内容", isParent: false },
        { name: "満了日", isParent: false },
      ],
    },
    {
      groupName: "賃貸借契約書作成日",
      fields: [{ name: "契約日", isParent: false }],
    },
    {
      groupName: "解除予告通知作成日",
      fields: [{ name: "発送日", isParent: false }],
    },
    {
      groupName: "検索結果詳細（内容証明）",
      fields: [{ name: "到達日", isParent: false }],
    },
    {
      groupName: "検索結果詳細（特定記録）",
      fields: [{ name: "到達日", isParent: false }],
    },
  ],
  typeB: [
    {
      groupName: "裁判所情報",
      fields: [{ name: "裁判所名", isParent: false }],
    },
    {
      groupName: "訴訟代理人",
      fields: [
        { name: "主任弁護士", isParent: false },
        { name: "副弁護士", isParent: false },
      ],
    },
    {
      groupName: "当事者",
      fields: [
        { name: "原告名", isParent: false },
        { name: "被告名", isParent: false },
      ],
    },
    {
      groupName: "契約情報",
      fields: [
        { name: "契約締結日", isParent: false },
        { name: "契約期間", isParent: false },
        { name: "月額賃料", isParent: false },
      ],
    },
    {
      groupName: "物件情報",
      fields: [
        { name: "物件所在地", isParent: false },
        { name: "物件種別", isParent: false },
        { name: "床面積", isParent: false },
      ],
    },
  ],
  typeC: [
    {
      groupName: "基本情報",
      fields: [
        { name: "裁判所", isParent: false },
        { name: "事件番号", isParent: false },
      ],
    },
    {
      groupName: "原告情報",
      fields: [
        { name: "原告氏名", isParent: false },
        { name: "原告住所", isParent: false },
        { name: "原告代理人", isParent: false },
      ],
    },
    {
      groupName: "被告情報",
      fields: [
        { name: "被告氏名", isParent: false },
        { name: "被告住所", isParent: false },
      ],
    },
    {
      groupName: "請求内容",
      fields: [
        { name: "請求の趣旨", isParent: false },
        { name: "請求額", isParent: false },
      ],
    },
    {
      groupName: "添付書類",
      fields: [
        { name: "証拠書類", isParent: false },
        { name: "契約書", isParent: false },
      ],
    },
  ],
}

export default function FileMappingScreen({
  uploadedFiles,
  fieldMappings,
  setFieldMappings,
  onBack,
  onNext,
  canProceed,
}: FileMappingScreenProps) {
  const router = useRouter()
  const [selectedTemplate, setSelectedTemplate] = useState("typeA")
  const [isPromptModalOpen, setIsPromptModalOpen] = useState(false)
  const [isMasterPromptModalOpen, setIsMasterPromptModalOpen] = useState(false)
  const [prompts, setPrompts] = useState<Record<string, string>>({})
  const [outputs, setOutputs] = useState<Record<string, string>>({})

  const currentFieldGroups = templateFieldGroups[selectedTemplate] || templateFieldGroups.typeA

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
        return [...prev, { fieldId: fieldName, fileIds: [fileName], note: instructions[fieldName] || "" }]
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
        return [...prev, { fieldId: fieldName, fileIds: [], note: instruction }]
      }
    })
  }

  const handlePromptChange = (fieldName: string, value: string) => {
    setPrompts((prev) => ({ ...prev, [fieldName]: value }))
  }

  const handleGenerate = (fieldName: string) => {
    setOutputs((prev) => ({ ...prev, [fieldName]: "生成中..." }))
    setTimeout(() => {
      setOutputs((prev) => ({ ...prev, [fieldName]: "生成完了" }))
    }, 1000)
  }

  const handlePromptRegister = () => {
    setIsPromptModalOpen(false)
    if (canProceed) {
      onNext()
    }
  }

  const fileCategories = [
    {
      category: "顧客情報",
      files: uploadedFiles.customerInfo.map((f) => f.name),
    },
    {
      category: "契約書類等",
      files: uploadedFiles.contractDocs.map((f) => f.name),
    },
    {
      category: "登記簿謄本",
      files: uploadedFiles.registryDocs.map((f) => f.name),
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
                className={`sticky-col-0 font-bold text-sm px-3 py-2 bg-blue-50 dark:bg-blue-950 text-center align-middle border`}
              >
                <div className="whitespace-nowrap" title={group.groupName}>
                  {group.groupName}
                </div>
              </td>
            )}

            <td className={`sticky-col-1 font-medium text-sm px-3 py-2 border`}>
              <div className="whitespace-nowrap" title={field.name}>
                {field.name}
              </div>
            </td>

            {fileCategories.map((category) =>
              category.files.map((fileName, fileIdx) => (
                <td
                  key={`${category.category}-${fileIdx}`}
                  className={`w-[40px] min-w-[40px] p-0 text-center cursor-pointer hover:bg-muted/50 border`}
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

            <td className={`instruction-cell p-2 border`}>
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
              <Select value={selectedTemplate} onValueChange={handleTemplateChange}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="テンプレートを選択" />
                </SelectTrigger>
                <SelectContent className="z-50">
                  <SelectItem value="typeA">訴状タイプA</SelectItem>
                  <SelectItem value="typeB">訴状タイプB</SelectItem>
                  <SelectItem value="typeC">訴状タイプC</SelectItem>
                </SelectContent>
              </Select>

              <Button variant="outline" size="sm">
                一次保存
              </Button>

              <Button variant="outline" size="icon" onClick={() => setIsPromptModalOpen(true)}>
                <Settings className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          <div className="w-full rounded-md border overflow-auto max-h-[700px]">
            <table className="matrix-table">
              <thead>
                <tr>
                  <th className="sticky-corner-1 text-center font-bold text-sm px-4 h-[42px]" rowSpan={2}>
                    分類
                  </th>
                  <th className="sticky-corner-2 text-center font-bold text-sm px-4 h-[42px]" rowSpan={2}>
                    訴状の必要な項目
                  </th>

                  {fileCategories.map((category, idx) => (
                    <th
                      key={idx}
                      colSpan={category.files.length}
                      className="sticky-header-1 text-center font-bold text-sm bg-blue-50 dark:bg-blue-950 px-4 h-[42px] border"
                    >
                      {category.category}
                    </th>
                  ))}

                  <th className="instruction-col-header text-center font-bold text-sm px-4 h-[42px] border" rowSpan={2}>
                    追加指示
                  </th>
                </tr>

                <tr>
                  {fileCategories.map((category) =>
                    category.files.map((fileName, fileIdx) => (
                      <th key={`${category.category}-${fileIdx}`} className="sticky-header-2 w-[40px] min-w-[40px] p-0 border">
                        <div className="vertical-text" title={fileName}>
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

          <div className="flex items-center justify-between mt-6">
            <Button variant="outline" onClick={onBack}>
              <ChevronLeft className="mr-2 h-4 w-4" />
              戻る
            </Button>
            <Button onClick={onNext} disabled={!canProceed}>
              次へ
              <ChevronRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      <Dialog open={isPromptModalOpen} onOpenChange={setIsPromptModalOpen}>
        <DialogContent className="!w-[90vw] !max-w-none max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>プロンプト設定</DialogTitle>
            <div className="flex items-center gap-4">
              <Select value={selectedTemplate} onValueChange={handleTemplateChange}>
                <SelectTrigger className="w-[250px]">
                  <SelectValue placeholder="テンプレートを選択" />
                </SelectTrigger>
                <SelectContent className="z-50">
                  <SelectItem value="typeA">訴状タイプA</SelectItem>
                  <SelectItem value="typeB">訴状タイプB</SelectItem>
                  <SelectItem value="typeC">訴状タイプC</SelectItem>
                </SelectContent>
              </Select>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsMasterPromptModalOpen(true)}
                disabled={!selectedTemplate}
              >
                マスタープロンプトを表示
              </Button>
            </div>
          </DialogHeader>

          <div className="flex-1 overflow-auto">
            <div className="w-full rounded-md border">
              <table className="settings-table">
                <thead>
                  <tr>
                    <th className="sticky-header text-center font-bold text-sm px-4 py-3 w-[100px] bg-blue-50 dark:bg-blue-950">
                      分類
                    </th>
                    <th className="sticky-header text-center font-bold text-sm px-4 py-3 w-[180px] bg-blue-50 dark:bg-blue-950">
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
                  {currentFieldGroups.map((group, groupIndex) =>
                    group.fields.map((field, fieldIndex) => {
                      const isFirstFieldInGroup = fieldIndex === 0
                      const rowKey = `${group.groupName}-${field.name}`

                      return (
                        <tr key={rowKey} className="hover:bg-muted/50">
                          {isFirstFieldInGroup && (
                            <td
                              rowSpan={group.fields.length}
                              className={`sticky-col font-bold text-sm px-4 py-3 text-center bg-gray-50 dark:bg-gray-900`}
                            >
                              <div className="whitespace-nowrap">{group.groupName}</div>
                            </td>
                          )}

                          <td className={`sticky-col-2 font-medium text-sm px-4 py-3`}>
                            <div className="whitespace-nowrap" title={field.name}>
                              {field.name}
                            </div>
                          </td>

                          <td className={`px-4 py-3`}>
                            <Textarea
                              placeholder="【登録ファイル】から、情報を取得し、訴状として以下のように記載。最後に、X追加したコメントを追加すること。"
                              value={prompts[field.name] || ""}
                              onChange={(e) => handlePromptChange(field.name, e.target.value)}
                              className="min-h-[80px] text-sm"
                            />
                          </td>

                          <td className={`px-4 py-3 align-top text-center`}>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleGenerate(field.name)}
                              className="mb-2 w-full"
                            >
                              生成
                            </Button>
                            {outputs[field.name] && (
                              <div className="text-xs text-muted-foreground mt-2">{outputs[field.name]}</div>
                            )}
                          </td>
                        </tr>
                      )
                    }),
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-4 border-t">
            <Button onClick={handlePromptRegister} className="bg-yellow-500 hover:bg-yellow-600 text-white">
              プロンプト登録
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isMasterPromptModalOpen} onOpenChange={setIsMasterPromptModalOpen}>
        <DialogContent className="max-w-5xl! max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>
              マスタープロンプト -{" "}
              {selectedTemplate === "typeA"
                ? "訴状タイプA"
                : selectedTemplate === "typeB"
                  ? "訴状タイプB"
                  : "訴状タイプC"}
            </DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-auto space-y-4 p-4">
            <div>
              <h3 className="font-semibold mb-2">システムプロンプト</h3>
              <div className="bg-muted p-3 rounded text-sm">
                {selectedTemplate === "typeA" &&
                  "あなたは訴状作成の専門家です。提供された情報から正確な訴状を作成してください。"}
                {selectedTemplate === "typeB" &&
                  "あなたは契約書レビューの専門家です。契約内容を詳しく分析してください。"}
                {selectedTemplate === "typeC" &&
                  "あなたは法的文書作成のエキスパートです。適切な法的表現を用いて文書を作成してください。"}
              </div>
            </div>
            <div>
              <h3 className="font-semibold mb-2">出力フォーマット</h3>
              <div className="bg-muted p-3 rounded text-sm font-mono">
                {selectedTemplate === "typeA" && "訴状\n1. 当事者\n2. 請求の趣旨\n3. 請求の原因"}
                {selectedTemplate === "typeB" && "契約書レビュー\n1. 契約概要\n2. リスク分析\n3. 推奨事項"}
                {selectedTemplate === "typeC" && "法的文書\n1. タイトル\n2. 本文\n3. 結論"}
              </div>
            </div>
            <div>
              <h3 className="font-semibold mb-2">制約事項</h3>
              <ul className="list-disc list-inside bg-muted p-3 rounded text-sm space-y-1">
                <li>正確な法的用語を使用すること</li>
                <li>事実と推測を明確に区別すること</li>
                <li>日本の法律に準拠すること</li>
              </ul>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
