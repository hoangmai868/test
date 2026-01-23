"use client"

import { buildFieldIdentifier } from "@/lib/field-identifier"

export interface Field {
  name: string
  prompt?: string
  isParent?: boolean
}

export interface FieldGroup {
  groupName: string
  fields: Field[]
}

export interface TemplateJsonField {
  name: string
  fileNames: string[]
  fileKeys: string[]
  note: string
  extractedValue: string
  prompt: string
}

export interface TemplateJsonGroup {
  groupName: string
  fields: TemplateJsonField[]
}

export interface DisplayFile {
  identifier: string
  name: string
  fileKey?: string
  isLoaded: boolean
}

export type FieldMappingEntry = {
  fieldId: string
  fileIds: string[]
  note: string
  extractedValue: string
}

export const MIN_GENERATING_DURATION_MS = 400

export const truncateFileName = (fileName: string): string => {
  return fileName.length > 15 ? `${fileName.substring(0, 12)}...` : fileName
}

export const isCheckboxClickTarget = (target: EventTarget | null): boolean => {
  return (
    target instanceof HTMLElement &&
    Boolean(target.closest('[data-slot="checkbox"]'))
  )
}

export const getDisplayFileCandidates = (file: DisplayFile): string[] => {
  return Array.from(
    new Set(
      [file.identifier, file.name]
        .filter(Boolean)
        .map((value) => value.trim())
        .filter(Boolean),
    ),
  )
}

export const mapTemplateToIdentifier = (fileName: string | null): string => {
  return fileName || "unknown"
}

export const convertSchemaToFieldGroups = (schemaJson: any[]): FieldGroup[] => {
  return schemaJson.map((group) => ({
    groupName: group.groupName,
    fields: group.fields.map((field: any) => ({
      name: field.name,
      prompt: field.prompt ?? "",
      isParent: field.isParent ?? false,
    })),
  }))
}

export const buildPromptsFromFieldGroups = (fieldGroups: FieldGroup[]): Record<string, string> => {
  const promptEntries: Record<string, string> = {}
  fieldGroups.forEach((group) => {
    group.fields.forEach((field) => {
      if (field.name) {
        const fieldId = buildFieldIdentifier(group.groupName, field.name)
        promptEntries[fieldId] = field.prompt ?? ""
      }
    })
  })
  return promptEntries
}

