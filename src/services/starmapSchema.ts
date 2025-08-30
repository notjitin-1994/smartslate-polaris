// Column mapping for master_discovery. Adjust these names to match your DB.
// Utilities for dynamic, conservative mapping to existing columns only
function toSnakeCase(input: string): string {
  return input
    .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
    .replace(/\s+/g, '_')
    .replace(/-+/g, '_')
    .toLowerCase()
}

function candidateNames(field: string, section?: 'requestor' | 'group'): string[] {
  const snake = toSnakeCase(field)
  const names = new Set<string>([
    field, // e.g. fullName
    snake, // e.g. full_name
  ])
  if (section) {
    names.add(`${section}_${snake}`) // e.g. requestor_full_name
    names.add(`${section}${field.charAt(0).toUpperCase()}${field.slice(1)}`) // e.g. requestorFullName
  }
  // Some sensible generic fallbacks
  if (field === 'groupName') names.add('name')
  if (field === 'workEmail') names.add('email')
  if (field === 'primaryStakeholders') names.add('stakeholders')
  if (field === 'timelineTarget') names.add('timeline')
  return Array.from(names)
}

export function buildUpdatePayloadFromFormDynamic(
  form: {
    requestor?: Record<string, any>
    group?: Record<string, any>
  },
  allowedColumns: Set<string>
): Record<string, any> {
  // Individual columns have been removed for master_discovery static fields.
  // Keep this function returning an empty payload except pass-through of safe top-level fields.
  return {}
}

export function mapRowToFormDynamic(row: Record<string, any>) {
  // Deprecated: individual columns are removed; the app hydrates from static_answers instead.
  return { requestor: {}, group: {} }
}


