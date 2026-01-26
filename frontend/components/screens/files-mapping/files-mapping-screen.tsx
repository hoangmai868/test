"use client"

import { useFilesMappingLogic } from "./hooks/use-files-mapping-logic"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Loader2, Settings, ChevronLeft, ChevronRight, Home } from "lucide-react"
import { MappingTable } from "./components/MappingTable"
import ConfirmReturnTopModal from "@/components/modals/confirm-return-top-modal"
import PromptSettingsModal from "@/components/modals/prompt-settings-modal"
import { mapTemplateToIdentifier } from "./utils"
import type { FilesMappingProps } from "./types"

export default function FilesMappingScreen(props: FilesMappingProps) {
  const {
    templates,
    isLoadingTemplates,
    selectedTemplate,
    selectedTemplateDisplayName,
    activeTemplateKey,
    currentFieldGroups,
    fileCategories,
    mappings,
    instructions,
    fileDisplayNameLookup,
    promptModalFieldMappings,
    outputs,
    generatingStates,
    effectivePrompts,
    isPromptModalOpen,
    setIsPromptModalOpen,
    isConfirmReturnOpen,
    setIsConfirmReturnOpen,
    handleTemplateChange,
    handleCheckboxChange,
    handleInstructionChange,
    handlePromptChange,
    handleGenerate,
    handleSave,
    handleOpenPromptModal,
    handleConfirmNavigateHome,
    isSaving,
    handleSaveJob,
    onBack,
    onNext,
    canProceed,
    jobName,
    user,
  } = useFilesMappingLogic(props)

  return (
    <div className="space-y-6">
      {isSaving && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 backdrop-blur">
          <div className="flex flex-col items-center gap-3 rounded-lg bg-slate-950/90 px-6 py-5 text-center text-white shadow-lg">
            <Loader2 className="h-8 w-8 animate-spin text-white" />
            <p className="text-base font-medium">保存中...</p>
            <p className="text-sm text-white/70">しばらくお待ちください</p>
          </div>
        </div>
      )}
      <Card className="!rounded-none">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>登録ファイルと項目の紐づけ</CardTitle>
            <div className="flex items-center gap-4">
              <Button variant="outline" size="sm" onClick={() => setIsConfirmReturnOpen(true)}>
                <Home className="mr-2 h-4 w-4" />
                TOPへ戻る
              </Button>

              <Select
                value={selectedTemplate}
                onValueChange={handleTemplateChange}
                disabled={isLoadingTemplates}
              >
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder={isLoadingTemplates ? "読み込み中..." : "テンプレートを選択"} />
                </SelectTrigger>
                <SelectContent className="z-50">
                {templates.map((template) => {
                  const identifier = mapTemplateToIdentifier(template.fileName)
                  return (
                    <SelectItem key={template.id} value={identifier}>
                      {template.displayName}
                    </SelectItem>
                  )
                })}
                </SelectContent>
              </Select>

              <Button
                variant="outline"
                size="sm"
                onClick={() => handleSaveJob(true)}
                disabled={isSaving || !jobName.trim() || !user}
              >
                一時保存
              </Button>

              <Button variant="outline" size="icon" onClick={handleOpenPromptModal}>
                <Settings className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          {isLoadingTemplates ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              <span className="ml-2 text-muted-foreground">テンプレートを読み込み中...</span>
            </div>
          ) : currentFieldGroups.length === 0 ? (
            <div className="flex items-center justify-center py-12">
              <span className="text-muted-foreground">テンプレートが見つかりません</span>
            </div>
          ) : (
            <MappingTable
              activeTemplateKey={activeTemplateKey}
              currentFieldGroups={currentFieldGroups}
              fileCategories={fileCategories}
              mappings={mappings}
              instructions={instructions}
              onCheckboxChange={handleCheckboxChange}
              onInstructionChange={handleInstructionChange}
            />
          )}

          <div className="flex items-center justify-between mt-6">
            <Button variant="outline" onClick={onBack}>
              <ChevronLeft className="mr-2 h-4 w-4" />
              戻る
            </Button>
            <Button
              onClick={async () => {
                try {
                  await handleSaveJob(false)
                } catch (error) {
                  console.error("Auto-save failed:", error)
                }
                onNext()
              }}
              disabled={!canProceed}
            >
              次へ
              <ChevronRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      <PromptSettingsModal
        open={isPromptModalOpen}
        onOpenChange={setIsPromptModalOpen}
        selectedTemplateDisplayName={selectedTemplateDisplayName}
        currentFieldGroups={currentFieldGroups}
        fieldMappings={promptModalFieldMappings}
        instructions={instructions}
        prompts={effectivePrompts}
        outputs={outputs}
        generatingStates={generatingStates}
        handlePromptChange={handlePromptChange}
        handleGenerate={handleGenerate}
        handleSave={handleSave}
        fileNameLookup={fileDisplayNameLookup}
      />

      <ConfirmReturnTopModal
        open={isConfirmReturnOpen}
        onOpenChange={setIsConfirmReturnOpen}
        onConfirm={handleConfirmNavigateHome}
      />
    </div>
  )
}

