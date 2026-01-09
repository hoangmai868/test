export interface TemplateField {
  name: string;
  note?: string;
  extractedValue?: string;
}

export interface TemplateGroup {
  groupName: string;
  fields: TemplateField[];
}

export function isTemplateGroup(value: unknown): value is TemplateGroup {
  return (
    typeof value === 'object' &&
    value !== null &&
    'groupName' in value &&
    'fields' in value &&
    Array.isArray((value as any).fields)
  );
}
