"use client"

import { Fragment, useState } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Loader2, CircleQuestionMark } from "lucide-react"
import { Textarea } from "@/components/ui/textarea"
import { buildFieldIdentifier } from "@/lib/field-identifier"
import { Tooltip, TooltipContent, TooltipTrigger } from "../ui/tooltip"
interface PromptField {
  name: string
  prompt?: string
  isParent?: boolean
}

interface PromptFieldGroup {
  groupName: string
  fields: PromptField[]
}

interface FieldMapping {
  fieldId: string
  fileIds: string[]
  note: string
  extractedValue: string
}

interface PromptSettingsModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  selectedTemplateDisplayName: string
  currentFieldGroups: PromptFieldGroup[]
  fieldMappings: FieldMapping[]
  instructions: Record<string, string>
  prompts: Record<string, string>
  outputs: Record<string, string>
  generatingStates: Record<string, boolean>
  handlePromptChange: (fieldId: string, value: string) => void
  handleGenerate: (fieldId: string) => Promise<void>
  handleSave: () => void
  handlePromptRegister: () => void
  fileNameLookup: Record<string, string>
}

export default function PromptSettingsModal({
  open,
  onOpenChange,
  selectedTemplateDisplayName,
  currentFieldGroups,
  fieldMappings,
  instructions,
  prompts,
  outputs,
  generatingStates,
  handlePromptChange,
  handleGenerate,
  handleSave,
  handlePromptRegister,
  fileNameLookup,
}: PromptSettingsModalProps) {
  const [isPromptTooltipHovered, setIsPromptTooltipHovered] = useState(false)

  const showPromptTooltip = () => setIsPromptTooltipHovered(true)
  const hidePromptTooltip = () => setIsPromptTooltipHovered(false)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="!w-[90vw] !max-w-none max-h-[90vh] flex flex-col">
        <DialogHeader>
          <div className="flex items-center justify-between pr-10">
            <DialogTitle>プロンプト設定</DialogTitle>
            <p className="text-sm text-muted-foreground">
              選択中: {selectedTemplateDisplayName || "テンプレート"}
            </p>
          </div>
        </DialogHeader>

        <ScrollArea className="flex-1 w-full overflow-y-auto">
          <div className="overflow-x-auto w-full">
            <table className="w-full border-collapse table-fixed">
              <colgroup>
                <col className="w-1/5" />
                <col className="w-1/5" />
                <col className="w-[30%]" />
                <col className="w-[30%]" />
              </colgroup>
              <thead>
                <tr className="border-b">
                  <th className="text-left p-3 font-semibold text-sm bg-slate-50 sticky top-0 z-10 col-group">
                    分類
                  </th>
                  <th className="text-left p-3 font-semibold text-sm bg-slate-50 sticky top-0 z-10 col-field">
                    訴状の項目
                  </th>
                  <th className="text-left p-3 font-semibold text-sm bg-slate-50 sticky top-0 z-10 col-instruction">
                    <div className="flex items-center gap-1">
                      <span>プロンプト</span>
                      <Tooltip open={isPromptTooltipHovered}>
                        <TooltipTrigger asChild>
                          <Button
                            size={"sm"}
                            variant="ghost"
                            onPointerEnter={showPromptTooltip}
                            onPointerLeave={hidePromptTooltip}
                          >
                            <CircleQuestionMark />
                          </Button>
                        </TooltipTrigger>

                        <TooltipContent
                          side="right"
                          onPointerEnter={showPromptTooltip}
                          onPointerLeave={hidePromptTooltip}
                        >
                          {"{登録ファイル} / {追加コメント} を使って、使用するファイルやコメントを指定できます。"}
                        </TooltipContent>
                      </Tooltip>
                    </div>
                  </th>
                  <th className="text-center p-3 font-semibold text-sm bg-slate-50 sticky top-0 z-10 col-checkbox">
                    出力結果
                  </th>
                </tr>
              </thead>
              <tbody>
                {currentFieldGroups.map((group, groupIndex) => (
                  <Fragment key={`${group.groupName}-${groupIndex}`}>
                    {group.fields.map((field, fieldIndex) => {
                      const isFirstInGroup = fieldIndex === 0
                      const fieldId = buildFieldIdentifier(group.groupName, field.name)
                      const legacyFieldName = field.name
                      const mapping =
                        fieldMappings.find((m) => m.fieldId === fieldId) ||
                        fieldMappings.find((m) => m.fieldId === legacyFieldName)
                      const selectedFiles = mapping?.fileIds || []
                      const selectedFileNames = selectedFiles.map(
                        (fileId) => fileNameLookup[fileId] || fileId,
                      )
                      const noteForField =
                        instructions[fieldId] || instructions[legacyFieldName] || mapping?.note || ""
                      const promptText =
                        prompts[fieldId] || prompts[legacyFieldName] || ""
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
                            <div className="space-y-3">
                              <Textarea
                                placeholder="プロンプトを入力してください"
                                value={promptText}
                                onChange={(e) => handlePromptChange(fieldId, e.target.value)}
                                rows={4}
                                className="h-[80px] text-sm resize-y overflow-auto"
                              />
                              <div className="text-xs leading-tight text-slate-600 space-y-1">
                                <div>
                                  <span className="font-semibold text-slate-800">登録ファイル：</span>
                                  {selectedFileNames.length > 0
                                    ? selectedFileNames.join("、")
                                    : "未選択"}
                                </div>
                                <div>
                                  <span className="font-semibold text-slate-800">追加コメント：</span>
                                  {noteForField.trim() ? noteForField : "なし"}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className={`px-4 py-3 align-top text-center border col-checkbox`}>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => void handleGenerate(fieldId)}
                              disabled={
                                Boolean(
                                  generatingStates[fieldId] ||
                                    generatingStates[legacyFieldName],
                                )
                              }
                              className="mb-2"
                            >
                              {generatingStates[fieldId] ||
                              generatingStates[legacyFieldName] ? (
                                <>
                                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                  生成中...
                                </>
                              ) : (
                                "生成"
                              )}
                            </Button>
                            {(outputs[fieldId] || outputs[legacyFieldName]) && (
                              <p className="text-xs text-slate-600 mt-2">
                                {outputs[fieldId] || outputs[legacyFieldName]}
                              </p>
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

        <DialogFooter className="pt-4 gap-2 border-t">
          <Button onClick={handleSave} variant="outline">
            保存
          </Button>
          <Button onClick={handlePromptRegister} className="bg-yellow-500 hover:bg-yellow-600 text-white">
            プロンプト登録
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}


