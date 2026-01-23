"use client"

import { Checkbox } from "@/components/ui/checkbox"
import { Textarea } from "@/components/ui/textarea"
import { Fragment } from "react"
import { buildFieldIdentifier } from "@/lib/field-identifier"
import { FieldGroup, DisplayFile, isCheckboxClickTarget, truncateFileName } from "../utils"

interface MappingTableProps {
  activeTemplateKey: string
  currentFieldGroups: FieldGroup[]
  fileCategories: Array<{ category: string; files: DisplayFile[] }>
  mappings: Record<string, Record<string, boolean>>
  instructions: Record<string, string>
  onCheckboxChange: (fieldId: string, file: DisplayFile, checked: boolean) => void
  onInstructionChange: (fieldId: string, instruction: string) => void
}

export function MappingTable({
  activeTemplateKey,
  currentFieldGroups,
  fileCategories,
  mappings,
  instructions,
  onCheckboxChange,
  onInstructionChange,
}: MappingTableProps) {
  return (
    <div className="w-full rounded-md border overflow-auto max-h-[600px]">
      <table className="matrix-table">
        <thead>
          <tr>
            <th
              className="sticky-corner-1 text-left font-bold text-sm px-4 h-[42px] col-group"
              rowSpan={2}
            >
              分類
            </th>
            <th
              className="sticky-corner-2 text-left font-bold text-sm px-4 h-[42px] col-field"
              rowSpan={2}
            >
              訴状の必要な項目
            </th>
            {fileCategories.map((category, idx) => (
              <th
                key={`${category.category}-${idx}`}
                colSpan={category.files.length}
                className="sticky-header-1 text-center font-bold text-sm bg-blue-50 dark:bg-blue-950 px-4 h-[42px] whitespace-nowrap"
              >
                {category.category}
              </th>
            ))}
            <th
              className="instruction-col-header bg-white text-left font-bold text-sm px-4 h-[42px] col-instruction"
              rowSpan={2}
            >
              追加指示
            </th>
          </tr>
          <tr>
            {fileCategories.map((category) =>
              category.files.map((file) => (
                <th
                  key={`${category.category}-${file.identifier}`}
                  className="sticky-header-2 col-checkbox p-0 text-center align-middle"
                >
                  <div
                    className="w-full flex items-center justify-center vertical-text"
                    title={file.name}
                  >
                    {truncateFileName(file.name)}
                  </div>
                </th>
              )),
            )}
          </tr>
        </thead>
        <tbody key={activeTemplateKey}>
          {currentFieldGroups.map((group) => {
            return (
              <Fragment key={group.groupName}>
                {group.fields.map((field, fieldIndex) => {
                  const fieldId = buildFieldIdentifier(group.groupName, field.name)
                  const currentMappings = mappings[fieldId] || {}

                  return (
                    <tr key={`${activeTemplateKey}-${group.groupName}-${field.name}`} className="hover:bg-muted/50">
                      {fieldIndex === 0 && (
                        <td
                          rowSpan={group.fields.length}
                          className="sticky-col-0 font-bold text-sm px-3 py-2 bg-blue-50 dark:bg-blue-950 text-left align-middle col-group"
                        >
                          <div className="whitespace-nowrap" title={group.groupName}>
                            {group.groupName}
                          </div>
                        </td>
                      )}
                      <td className="sticky-col-1 font-medium text-sm px-3 py-2 text-left col-field">
                        <div className="whitespace-nowrap" title={field.name}>
                          {field.name}
                        </div>
                      </td>

                      {fileCategories.map((category) =>
                        category.files.map((file) => {
                          const fileCandidates = [file.identifier, file.name].filter(Boolean)
                          const currentValue = fileCandidates.some((candidate) => currentMappings[candidate])

                          return (
                            <td
                              key={`${category.category}-${file.identifier}`}
                              className="col-checkbox p-0 text-center cursor-pointer hover:bg-muted/50"
                            onClick={(event) => {
                              if (isCheckboxClickTarget(event.target)) {
                                return
                              }
                              onCheckboxChange(fieldId, file, !currentValue)
                            }}
                            >
                              <div className="flex items-center justify-center h-full py-2">
                                <Checkbox
                                  checked={currentValue}
                                  onCheckedChange={(checked) =>
                                    onCheckboxChange(fieldId, file, checked as boolean)
                                  }
                                />
                              </div>
                            </td>
                          )
                        }),
                      )}

                      <td className="instruction-cell p-2 text-left !col-instruction">
                        <Textarea
                          placeholder="追加指示を入力"
                          value={instructions[fieldId] || ""}
                          onChange={(event) => onInstructionChange(fieldId, event.target.value)}
                          rows={3}
                          className="text-sm w-full resize-none overflow-y-auto h-12"
                        />
                    </td>
                  </tr>
                )
              })}
            </Fragment>
          )
        })}
      </tbody>
    </table>
  </div>
)
}

