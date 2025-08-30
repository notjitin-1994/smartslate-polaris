export interface DynamicQuestion {
  id: string
  type: 'text' | 'textarea' | 'number' | 'single_select' | 'multi_select' | 'boolean' | 'slider' | 'date' | 'email' | 'url' | 'tags' | 'toggle' | 'rating' | 'time' | 'color'
  text?: string // API returns 'text' instead of 'label'
  label?: string // Keep for backward compatibility
  placeholder?: string
  help?: string // API returns 'help' instead of 'helperText'
  helperText?: string // Keep for backward compatibility
  required?: boolean
  options?: Array<{ value: string; label: string; description?: string }>
  validation?: {
    minLength?: number
    maxLength?: number
    min?: number
    max?: number
    step?: number
    pattern?: string
    message?: string
    maxTags?: number // For tag input
  }
  default?: any // API returns 'default' instead of 'defaultValue'
  defaultValue?: any // Keep for backward compatibility
  conditional?: Array<{
    when: {
      question_id: string
      operator: 'eq' | 'neq' | 'gt' | 'lt' | 'in' | 'not_in' | 'gte' | 'lte'
      value: string | number | boolean
    }
    then: {
      show?: boolean
      set_default?: string | number | boolean | null
    }
  }>
  metadata?: {
    // Additional configuration for specific input types
    suggestions?: string[] // For tag input
    labels?: string[] // For rating component
    presetColors?: string[] // For color picker
    allowCustomColor?: boolean // For color picker
    toggleLabels?: { on?: string; off?: string } // For toggle switch
    timeStep?: number // For time picker (in minutes)
    [key: string]: any
  }
}

export interface Stage {
  id: string
  name: string
  description?: string
  questions: DynamicQuestion[]
}

export interface DynamicQuestions {
  stages: Stage[]
  metadata?: {
    version?: string
    generatedAt?: string
    model?: string
  }
}

export interface StageAnswers {
  [key: string]: any
}

export interface DynamicQuestionnaireProps {
  recordId: string
  starmapId?: string
  dynamicQuestions: DynamicQuestions
  onComplete?: (answers: StageAnswers) => void
}

export interface DynamicQuestionInputProps {
  question: DynamicQuestion
  value: any
  onChange: (value: any) => void
  touched?: boolean
  onBlur?: () => void
}

