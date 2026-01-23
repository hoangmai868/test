"use client"

import { useCallback, type Dispatch, type SetStateAction } from "react"
import { useRouter } from "next/navigation"
import { api } from "@/lib/api"
import { getFieldNameFromIdentifier } from "@/lib/field-identifier"
import { DisplayFile, getDisplayFileCandidates, mapTemplateToIdentifier, MIN_GENERATING_DURATION_MS } from "../utils"
import type { FieldMappingEntry } from "../utils"
import type { FilesMappingState } from "./use-files-mapping-state"

type FilesMappingHandlersState = FilesMappingState & {
  setFieldMappings: Dispatch<SetStateAction<FieldMappingEntry[]>>
  fileKeyLookup: Record<string, string>
}

export const useFilesMappingHandlers = (state: FilesMappingHandlersState) => {
  const router = useRouter()

  const {
    templates,
    setSelectedTemplate,
    setMappings,
    setInstructions,
    setFieldMappings,
    instructions,
    fieldMappings,
    mappings,
    setPromptEntries,
    setEditedPrompts,
    effectivePrompts,
    jobId,
    jobName,
    user,
    setIsPromptModalOpen,
    setIsConfirmReturnOpen,
    loadingStartTimesRef,
    setOutputs,
    setGeneratingStates,
    fileKeyLookup,
    handleSaveJob,
    setJobTemplateId,
    onNext,
    canProceed,
  } = state

  const handleTemplateChange = useCallback(
    (newTemplate: string) => {
      setSelectedTemplate(newTemplate)
      setMappings({})
      setInstructions({})
      setFieldMappings([])
      setPromptEntries({})
      setEditedPrompts({})
      const selectedTemplateDetail = templates.find(
        (template) => mapTemplateToIdentifier(template.fileName) === newTemplate,
      )
      setJobTemplateId(selectedTemplateDetail?.id ?? null)
    },
    [
      templates,
      setMappings,
      setInstructions,
      setFieldMappings,
      setPromptEntries,
      setEditedPrompts,
      setSelectedTemplate,
      setJobTemplateId,
    ],
  )

  const handleCheckboxChange = useCallback(
    (fieldId: string, file: DisplayFile, checked: boolean) => {
      const candidateIds = getDisplayFileCandidates(file)
      if (candidateIds.length === 0) {
        return
      }

      setMappings((prev) => {
        const prevField = prev[fieldId] || {}
        const updated = { ...prevField }
        candidateIds.forEach((id) => {
          if (checked) {
            updated[id] = true
          } else {
            delete updated[id]
          }
        })
        const next = { ...prev }
        if (Object.keys(updated).length === 0) {
          delete next[fieldId]
        } else {
          next[fieldId] = updated
        }
        return next
      })

      setFieldMappings((prev: FieldMappingEntry[]) => {
        const legacy = getFieldNameFromIdentifier(fieldId)
        const existing = prev.find((mapping) => mapping.fieldId === fieldId || mapping.fieldId === legacy)
        if (existing) {
          return prev.map((mapping) => {
            if (mapping.fieldId === fieldId || mapping.fieldId === legacy) {
              const newFileIds = checked
                ? Array.from(new Set([...mapping.fileIds, ...candidateIds]))
                : mapping.fileIds.filter((id) => !candidateIds.includes(id))
              return { ...mapping, fieldId, fileIds: newFileIds }
            }
            return mapping
          })
        }
        if (checked) {
          return [
            ...prev,
            {
              fieldId,
              fileIds: candidateIds,
              note: instructions[fieldId] || "",
              extractedValue: "",
            },
          ]
        }
        return prev
      })
    },
    [instructions, setFieldMappings, setMappings],
  )

  const handleInstructionChange = useCallback(
    (fieldId: string, instruction: string) => {
      setInstructions((prev) => ({ ...prev, [fieldId]: instruction }))
      setFieldMappings((prev: FieldMappingEntry[]) => {
        const legacy = getFieldNameFromIdentifier(fieldId)
        const existing = prev.find((mapping) => mapping.fieldId === fieldId || mapping.fieldId === legacy)
        if (existing) {
          return prev.map((mapping) =>
            mapping.fieldId === fieldId || mapping.fieldId === legacy
              ? { ...mapping, fieldId, note: instruction }
              : mapping,
          )
        }
        return [...prev, { fieldId, fileIds: [], note: instruction, extractedValue: "" }]
      })
    },
    [setInstructions, setFieldMappings],
  )

  const handlePromptChange = useCallback(
    (fieldId: string, value: string) => {
      setEditedPrompts((prev) => ({ ...prev, [fieldId]: value }))
    },
    [setEditedPrompts],
  )

  const startGenerating = useCallback((fieldId: string) => {
    loadingStartTimesRef.current[fieldId] = Date.now()
    setGeneratingStates((prev) => ({ ...prev, [fieldId]: true }))
  }, [setGeneratingStates])

  const stopGenerating = useCallback(
    async (fieldId: string) => {
      const startTime = loadingStartTimesRef.current[fieldId]
      delete loadingStartTimesRef.current[fieldId]
      const elapsed = startTime ? Date.now() - startTime : 0
      const remaining = Math.max(0, MIN_GENERATING_DURATION_MS - elapsed)
      if (remaining > 0) {
        await new Promise((resolve) => setTimeout(resolve, remaining))
      }
      setGeneratingStates((prev) => ({ ...prev, [fieldId]: false }))
    },
    [setGeneratingStates],
  )

  const handleGenerate = useCallback(
    async (fieldId: string) => {
      const legacy = getFieldNameFromIdentifier(fieldId)
      startGenerating(fieldId)
      setOutputs((prev) => ({ ...prev, [fieldId]: "" }))

      try {
        if (!jobId) {
          setOutputs((prev) => ({
            ...prev,
            [fieldId]: "ジョブを一時保存してから生成してください。",
          }))
          return
        }

        const promptValue = effectivePrompts[fieldId] || effectivePrompts[legacy] || ""
        const mapping =
          fieldMappings.find((mapping) => mapping.fieldId === fieldId) ||
          fieldMappings.find((mapping) => mapping.fieldId === legacy)
        const noteValue = instructions[fieldId] || instructions[legacy] || mapping?.note
        if (!promptValue) {
          setOutputs((prev) => ({ ...prev, [fieldId]: "" }))
          return
        }

        const mappedFileIds = mapping?.fileIds || []
        const missingKeys = mappedFileIds.filter((fileId) => !fileKeyLookup[fileId])
        if (missingKeys.length > 0) {
          setOutputs((prev) => ({
            ...prev,
            [fieldId]: "選択したファイルのキーが利用できません。ジョブを保存してから再試行してください。",
          }))
          return
        }

        const fileKeys = Array.from(
          new Set(
            mappedFileIds
              .map((fileId) => fileKeyLookup[fileId])
              .filter((key): key is string => Boolean(key)),
          ),
        )

        try {
          const result = await api.runPrompt({
            jobId,
            fieldName: fieldId,
            prompt: promptValue,
            note: noteValue,
            fileKeys,
          })
          setOutputs((prev) => ({ ...prev, [fieldId]: result.result }))
        } catch (error) {
          setOutputs((prev) => ({
            ...prev,
            [fieldId]: error instanceof Error ? error.message : "生成に失敗しました",
          }))
        }
      } finally {
        await stopGenerating(fieldId)
      }
    },
    [
      effectivePrompts,
      fieldMappings,
      instructions,
      jobId,
      fileKeyLookup,
      startGenerating,
      stopGenerating,
      setOutputs,
    ],
  )

  const handlePromptRegister = useCallback(async () => {
    setIsPromptModalOpen(false)
    if (!canProceed) {
      return
    }
    try {
      await handleSaveJob(false)
    } catch (error) {
      console.error("Auto-save failed:", error)
    }
    onNext()
  }, [canProceed, handleSaveJob, onNext, setIsPromptModalOpen])

  const handleSave = useCallback(() => {
    setIsPromptModalOpen(false)
  }, [setIsPromptModalOpen])

  const handleOpenPromptModal = useCallback(() => {
    if (!user || !jobName.trim()) {
      alert("ジョブ名を入力してください")
      return
    }
    setIsPromptModalOpen(true)
  }, [jobName, user, setIsPromptModalOpen])

  const handleConfirmNavigateHome = useCallback(() => {
    setIsConfirmReturnOpen(false)
    router.push("/")
  }, [router, setIsConfirmReturnOpen])

  return {
    handleTemplateChange,
    handleCheckboxChange,
    handleInstructionChange,
    handlePromptChange,
    handleGenerate,
    handlePromptRegister,
    handleSave,
    handleOpenPromptModal,
    handleConfirmNavigateHome,
  }
}

