import type { RequestorInfo, GroupInfo, ValidationError } from './types'

// Email validation regex
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

// International phone validation (basic)
const PHONE_REGEX = /^[\d\s+\-().]+$/

// Validation for RequestorInfo
export function validateRequestorInfo(data: Partial<RequestorInfo>): ValidationError[] {
  const errors: ValidationError[] = []

  // Full name validation
  if (!data.fullName || data.fullName.trim().length < 2) {
    errors.push({
      field: 'fullName',
      message: 'Please enter your full name (at least 2 characters)'
    })
  }

  // Email validation
  if (!data.workEmail) {
    errors.push({
      field: 'workEmail',
      message: 'Please enter your work email address'
    })
  } else if (!EMAIL_REGEX.test(data.workEmail)) {
    errors.push({
      field: 'workEmail',
      message: 'Please enter a valid email address (e.g., name@company.com)'
    })
  }

  // Phone validation (optional field)
  if (data.phone && !PHONE_REGEX.test(data.phone)) {
    errors.push({
      field: 'phone',
      message: 'Please enter a valid phone number (digits, spaces, +, -, (), . allowed)'
    })
  }

  // Context validation
  if (!data.context || data.context.trim().length < 50) {
    errors.push({
      field: 'context',
      message: 'Please provide more details about your goals and needs (at least 50 characters)'
    })
  } else if (data.context.trim().length > 600) {
    errors.push({
      field: 'context',
      message: 'Please shorten your context to 600 characters or less'
    })
  }

  // Preferred contact validation
  if (!data.preferredContact) {
    errors.push({
      field: 'preferredContact',
      message: 'Please select how you prefer to be contacted (email, phone, or other)'
    })
  }

  return errors
}

// Validation for GroupInfo
export function validateGroupInfo(data: Partial<GroupInfo>): ValidationError[] {
  const errors: ValidationError[] = []

  // Group name validation
  if (!data.groupName || data.groupName.trim().length < 2) {
    errors.push({
      field: 'groupName',
      message: 'Please enter your group or team name (at least 2 characters)'
    })
  }

  // Group type validation
  if (!data.groupType) {
    errors.push({
      field: 'groupType',
      message: 'Please select the type that best describes your group'
    })
  }

  // Industry validation
  if (!data.industry) {
    errors.push({
      field: 'industry',
      message: 'Please select your industry or discipline from the list'
    })
  }

  // Size validation
  if (!data.size) {
    errors.push({
      field: 'size',
      message: 'Please select the size range that fits your group'
    })
  }

  // Stakeholders validation
  if (!data.primaryStakeholders || data.primaryStakeholders.length === 0) {
    errors.push({
      field: 'primaryStakeholders',
      message: 'Please add at least one stakeholder (press Enter after typing each name)'
    })
  }

  // Desired outcomes validation
  if (!data.desiredOutcomes || data.desiredOutcomes.trim().length < 50) {
    errors.push({
      field: 'desiredOutcomes',
      message: 'Please describe what success looks like for your Starmap (at least 50 characters)'
    })
  } else if (data.desiredOutcomes.trim().length > 1000) {
    errors.push({
      field: 'desiredOutcomes',
      message: 'Please shorten your success criteria to 1000 characters or less'
    })
  }

  return errors
}

// Helper to get field error message
export function getFieldError(errors: ValidationError[], fieldName: string): string | undefined {
  return errors.find(error => error.field === fieldName)?.message
}

// Helper to check if form step is valid
export function isStepValid(step: 'requestor' | 'group', data: any): boolean {
  if (step === 'requestor') {
    return validateRequestorInfo(data).length === 0
  } else {
    return validateGroupInfo(data).length === 0
  }
}
