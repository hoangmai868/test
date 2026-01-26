"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { api } from "@/lib/api"
import { getFieldNameFromIdentifier } from "@/lib/field-identifier"
import { useAuth } from "@/contexts/auth-context"
import { useUploadContext, type FileInfo } from "@/contexts/upload-context"
import type { Template } from "@/lib/api"
import { FilesMappingProps } from "../types"
import {
  FieldGroup,
  DisplayFile,
  FieldMappingEntry,
  mapTemplateToIdentifier,
  convertSchemaToFieldGroups,
  buildPromptsFromFieldGroups,
} from "../utils"
import { useSaveJob } from "./use-save-job"

export const useFilesMappingState = ({
  uploadedFiles,
  loadedFileInfo,
  fieldMappings,
  setFieldMappings,
  onBack,
  onNext,
  canProceed,
}: FilesMappingProps) => {
  const { user } = useAuth()
  const {
    jobName,
    setJobName,
    jobId,
    setJobId,
    jobTemplateId,
    setJobTemplateId,
    registerStepSaveHandler,
    promptEntries,
    setPromptEntries,
    editedPrompts,
    setEditedPrompts,
  } = useUploadContext()

  const [selectedTemplate, setSelectedTemplate] = useState("typeA")
  const [isPromptModalOpen, setIsPromptModalOpen] = useState(false)
  const [outputs, setOutputs] = useState<Record<string, string>>({})
  const [generatingStates, setGeneratingStates] = useState<Record<string, boolean>>({})
  const loadingStartTimesRef = useRef<Record<string, number>>({})
  const [templateFieldGroups, setTemplateFieldGroups] = useState<Record<string, FieldGroup[]>>({})
  const [templates, setTemplates] = useState<Template[]>([])
  const [isLoadingTemplates, setIsLoadingTemplates] = useState(true)
  const [isConfirmReturnOpen, setIsConfirmReturnOpen] = useState(false)
  const [mappings, setMappings] = useState<Record<string, Record<string, boolean>>>(() => {
    const initial: Record<string, Record<string, boolean>> = {}
    fieldMappings.forEach((mapping) => {
      initial[mapping.fieldId] = {}
      mapping.fileIds.forEach((fileId) => {
        initial[mapping.fieldId][fileId] = true
      })
    })
    return initial
  })
  const [instructions, setInstructions] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {}
    fieldMappings.forEach((mapping) => {
      if (mapping.note) {
        initial[mapping.fieldId] = mapping.note
      }
    })
    return initial
  })

  const templatePrompts = useMemo(
    () => buildPromptsFromFieldGroups(templateFieldGroups[selectedTemplate] || []),
    [templateFieldGroups, selectedTemplate],
  )
  const effectivePrompts = useMemo(
    () => ({ ...templatePrompts, ...promptEntries, ...editedPrompts }),
    [templatePrompts, promptEntries, editedPrompts],
  )

  useEffect(() => {
    const fetchTemplates = async () => {
      try {
        setIsLoadingTemplates(true)
        const fetched = await api.getTemplates()
        setTemplates(fetched)
        const templateMap: Record<string, FieldGroup[]> = {}
        fetched.forEach((template) => {
          templateMap[mapTemplateToIdentifier(template.fileName)] = convertSchemaToFieldGroups(
            template.schemaJson as any[],
          )
        })
        setTemplateFieldGroups(templateMap)
      } catch (error) {
        console.error("Failed to fetch templates:", error)
      } finally {
        setIsLoadingTemplates(false)
      }
    }
    fetchTemplates()
  }, [])

  useEffect(() => {
    if (templates.length === 0) {
      return
    }
    const templateFromJob = jobTemplateId
      ? templates.find((template) => template.id === jobTemplateId)
      : undefined
    const templateToUse = templateFromJob || templates[0]
    const identifier = mapTemplateToIdentifier(templateToUse.fileName)
    setSelectedTemplate(identifier)
  }, [jobTemplateId, templateFieldGroups, templates])

  const currentFieldGroups = templateFieldGroups[selectedTemplate] || []
  const selectedTemplateDisplayName =
    templates.find((template) => mapTemplateToIdentifier(template.fileName) === selectedTemplate)
      ?.displayName ?? "テンプレート"
  const activeTemplateKey = selectedTemplate || "default-template"

  const fileKeyLookup = useMemo(() => {
    const lookup: Record<string, string> = {}
    const appendFileKeys = (items?: FileInfo[]) => {
      items?.forEach((file) => {
        if (!file.fileKey) return
        const normalized = file.fileKey.replace(/^\//, "")
        if (!normalized) {
          return
        }
        lookup[file.fileKey] = normalized
        if (file.name) {
          lookup[file.name] = normalized
        }
      })
    }
    appendFileKeys(loadedFileInfo?.customerInfo)
    appendFileKeys(loadedFileInfo?.contractDocs)
    appendFileKeys(loadedFileInfo?.registryDocs)
    return lookup
  }, [loadedFileInfo])

  const getCombinedFiles = (category: "customerInfo" | "contractDocs" | "registryDocs"): DisplayFile[] => {
    const loaded =
      loadedFileInfo?.[category]?.map((file) => ({
        identifier: file.fileKey || file.name,
        name: file.name,
        fileKey: file.fileKey,
        isLoaded: true,
      })) || []
    const uploaded = uploadedFiles[category].map((file, index) => ({
      identifier: `${category}-uploaded-${index}-${file.name}`,
      name: file.name,
      isLoaded: false,
    }))
    return [...loaded, ...uploaded]
  }

  const fileCategories = useMemo(() => {
    const categories = [
      { category: "顧客情報", files: getCombinedFiles("customerInfo") },
      { category: "契約書類等", files: getCombinedFiles("contractDocs") },
      { category: "登記簿謄本", files: getCombinedFiles("registryDocs") },
    ]
    return categories.filter((entry) => entry.files.length > 0)
  }, [uploadedFiles, loadedFileInfo])

  const fileDisplayNameLookup = useMemo(() => {
    const lookup: Record<string, string> = {}
    fileCategories.forEach((category) => {
      category.files.forEach((file) => {
        if (file.identifier) {
          lookup[file.identifier] = file.name
        }
      })
    })
    return lookup
  }, [fileCategories])

  const promptModalFieldMappings = useMemo(() => {
    const mappingLookup: Record<string, FieldMappingEntry> = {}
    fieldMappings.forEach((mapping) => {
      mappingLookup[mapping.fieldId] = mapping
    })
    return Object.entries(mappings).map(([fieldId, selection]) => {
      const existing =
        mappingLookup[fieldId] || mappingLookup[getFieldNameFromIdentifier(fieldId)]
      return {
        fieldId,
        fileIds: Object.keys(selection),
        note:
          instructions[fieldId] ||
          instructions[getFieldNameFromIdentifier(fieldId)] ||
          existing?.note ||
          "",
        extractedValue: existing?.extractedValue || "",
      }
    })
  }, [fieldMappings, instructions, mappings])

  const { isSaving, handleSaveJob } = useSaveJob({
    currentFieldGroups,
    fieldMappings,
    uploadedFiles,
    loadedFileInfo,
    effectivePrompts,
    templates,
    selectedTemplate,
    jobId,
    jobName,
    user: user ? { id: user.id } : null,
    setJobId,
    setJobName,
    setFieldMappings,
    setPromptEntries,
    setEditedPrompts,
    setMappings,
    setInstructions,
  })

  useEffect(() => {
    const unregister = registerStepSaveHandler(2, async () => {
      const savedJob = await handleSaveJob(false)
      return savedJob?.id ?? jobId
    })
    return () => {
      unregister()
    }
  }, [handleSaveJob, jobId, registerStepSaveHandler])

  return {
    templates,
    isLoadingTemplates,
    selectedTemplate,
    setSelectedTemplate,
    templateFieldGroups,
    selectedTemplateDisplayName,
    activeTemplateKey,
    currentFieldGroups,
    fileCategories,
    fileDisplayNameLookup,
    fileKeyLookup,
    mappings,
    setMappings,
    instructions,
    setInstructions,
    fieldMappings,
    setFieldMappings,
    effectivePrompts,
    outputs,
    setOutputs,
    generatingStates,
    setGeneratingStates,
    loadingStartTimesRef,
    isPromptModalOpen,
    setIsPromptModalOpen,
    isConfirmReturnOpen,
    setIsConfirmReturnOpen,
    promptModalFieldMappings,
    isSaving,
    handleSaveJob,
    jobName,
    user,
    setPromptEntries,
    setEditedPrompts,
    setJobTemplateId,
    jobId,
    registerStepSaveHandler,
    onBack,
    onNext,
    canProceed,
  }
}

export type FilesMappingState = ReturnType<typeof useFilesMappingState> & {
  setFieldMappings: FilesMappingProps["setFieldMappings"]
  fileKeyLookup: Record<string, string>
}

