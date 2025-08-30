// Types for the two-phase Starmap request form

export type ContactMethod = 'email' | 'phone' | 'other'

export type GroupType = 
  | 'team'
  | 'organization' 
  | 'department'
  | 'school'
  | 'program'
  | 'club'
  | 'other'

export type IndustryType =
  | 'technology'
  | 'healthcare'
  | 'education'
  | 'finance'
  | 'retail'
  | 'manufacturing'
  | 'nonprofit'
  | 'government'
  | 'consulting'
  | 'media'
  | 'hospitality'
  | 'other'

export type GroupSize = 
  | '1-10'
  | '11-50'
  | '51-200'
  | '201-1000'
  | '1000+'
  | 'not-sure'

export interface RequestorInfo {
  fullName: string
  workEmail: string
  role?: string
  phone?: string
  preferredContact: ContactMethod
  context: string
}

export interface GroupInfo {
  groupName: string
  groupType: GroupType
  industry: IndustryType
  size: GroupSize
  primaryStakeholders: string[]
  desiredOutcomes: string
  timelineTarget?: string
  constraints?: string
}

export interface StarmapRequestData {
  requestor: RequestorInfo
  group: GroupInfo
}

// Validation error types
export interface ValidationError {
  field: string
  message: string
}

export type FormStep = 'requestor' | 'group'

// Props for the main form component
export interface StarmapRequestFormProps {
  onComplete?: (data: StarmapRequestData) => void
  initialStep?: FormStep
  starmapId?: string
  initialData?: Partial<StarmapRequestData>
  loading?: boolean
}

// Options for select fields
export const GROUP_TYPE_OPTIONS: Array<{ value: GroupType; label: string }> = [
  { value: 'team', label: 'Team' },
  { value: 'organization', label: 'Organization' },
  { value: 'department', label: 'Department' },
  { value: 'school', label: 'School' },
  { value: 'program', label: 'Program' },
  { value: 'club', label: 'Club' },
  { value: 'other', label: 'Other' },
]

export const INDUSTRY_OPTIONS: Array<{ value: IndustryType; label: string }> = [
  { value: 'technology', label: 'Technology' },
  { value: 'healthcare', label: 'Healthcare' },
  { value: 'education', label: 'Education' },
  { value: 'finance', label: 'Finance' },
  { value: 'retail', label: 'Retail' },
  { value: 'manufacturing', label: 'Manufacturing' },
  { value: 'nonprofit', label: 'Non-profit' },
  { value: 'government', label: 'Government' },
  { value: 'consulting', label: 'Consulting' },
  { value: 'media', label: 'Media & Entertainment' },
  { value: 'hospitality', label: 'Hospitality' },
  { value: 'other', label: 'Other' },
]

export const GROUP_SIZE_OPTIONS: Array<{ value: GroupSize; label: string }> = [
  { value: '1-10', label: '1-10 people' },
  { value: '11-50', label: '11-50 people' },
  { value: '51-200', label: '51-200 people' },
  { value: '201-1000', label: '201-1,000 people' },
  { value: '1000+', label: '1,000+ people' },
  { value: 'not-sure', label: 'Not sure' },
]
