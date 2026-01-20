export const FIELD_IDENTIFIER_SEPARATOR = "||"

export const buildFieldIdentifier = (groupName: string, fieldName: string): string => {
  return `${groupName}${FIELD_IDENTIFIER_SEPARATOR}${fieldName}`
}

export const splitFieldIdentifier = (
  identifier: string,
): { groupName: string; fieldName: string } => {
  const separatorIndex = identifier.indexOf(FIELD_IDENTIFIER_SEPARATOR)
  if (separatorIndex === -1) {
    return { groupName: "", fieldName: identifier }
  }
  return {
    groupName: identifier.substring(0, separatorIndex),
    fieldName: identifier.substring(separatorIndex + FIELD_IDENTIFIER_SEPARATOR.length),
  }
}

export const getFieldNameFromIdentifier = (identifier: string): string => {
  return splitFieldIdentifier(identifier).fieldName
}

export const getFieldGroupFromIdentifier = (identifier: string): string => {
  return splitFieldIdentifier(identifier).groupName
}

