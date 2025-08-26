import { unifiedAIService } from './unifiedAIService'
import { promptService } from './promptService'
import { AppError } from '@/lib/errors'

export interface Question {
  id: string
  type: 'text' | 'textarea' | 'single_select' | 'multi_select' | 'slider' | 'number' | 'calendar_date' | 'calendar_range' | 'boolean'
  label: string
  help?: string
  required?: boolean
  placeholder?: string
  validation?: {
    pattern?: string
    min?: number
    max?: number
    minLength?: number
    maxLength?: number
    custom?: string // Custom validation message
  }
  conditional?: {
    dependsOn: string // Question ID
    condition: 'equals' | 'not_equals' | 'contains' | 'greater_than' | 'less_than'
    value: any
  }
  options?: Array<{
    value: string
    label: string
    description?: string
  }>
  min?: number
  max?: number
  step?: number
  unit?: string
  default?: any
}

export interface QuestionnaireStage {
  id: string
  title: string
  description?: string
  questions: Question[]
  metadata?: {
    estimatedTime: string
    purpose: string
    focusArea?: string
  }
}

export interface QuestionnaireContext {
  experienceLevel: 'novice' | 'intermediate' | 'expert'
  currentStage: number
  totalStages: number
  previousAnswers: Record<string, any>
  researchData?: {
    greeting?: string
    organization?: string
    requirements?: string
    preliminary?: string
  }
  focusAreas?: string[]
  skipPatterns?: Record<string, any>
}

/**
 * Enhanced Dynamic Questionnaire Service
 */
export class QuestionnaireService {
  private readonly MAX_QUESTIONS_PER_STAGE = 9
  private readonly MIN_QUESTIONS_PER_STAGE = 6
  private readonly FOCUS_AREAS = [
    'Delivery Modalities',
    'Target Audiences',
    'Key Competencies',
    'Content Strategy',
    'Technology Requirements',
    'Assessment Methods',
    'Implementation Timeline',
    'Budget Allocation',
    'Change Management',
    'Success Metrics'
  ]

  /**
   * Generate dynamic questionnaire stages based on context
   */
  async generateDynamicStages(
    context: QuestionnaireContext,
    customPrompts?: string[]
  ): Promise<QuestionnaireStage[]> {
    console.log('[Questionnaire] Generating dynamic stages')
    
    // Determine optimal number of stages
    const stageCount = this.determineStageCount(context)
    
    // Identify focus areas that need coverage
    const focusAreas = this.identifyFocusAreas(context)
    
    // Generate stages in parallel for efficiency
    const stagePromises = []
    for (let i = 0; i < stageCount; i++) {
      const focusArea = focusAreas[i] || this.FOCUS_AREAS[i % this.FOCUS_AREAS.length]
      const customPrompt = customPrompts?.[i]
      
      stagePromises.push(
        this.generateStage(
          i + 1,
          context,
          focusArea,
          customPrompt
        )
      )
    }
    
    const stages = await Promise.all(stagePromises)
    
    // Validate and optimize the generated stages
    return this.optimizeStages(stages, context)
  }

  /**
   * Generate a single questionnaire stage
   */
  private async generateStage(
    stageNumber: number,
    context: QuestionnaireContext,
    focusArea: string,
    customPrompt?: string
  ): Promise<QuestionnaireStage> {
    console.log(`[Questionnaire] Generating stage ${stageNumber}: ${focusArea}`)
    
    // Build context-aware prompt
    const prompt = this.buildStagePrompt(stageNumber, context, focusArea, customPrompt)
    
    try {
      const response = await unifiedAIService.call({
        prompt,
        inputType: 'text',
        capabilities: ['reasoning'],
        temperature: 0.6, // Balanced creativity
        maxTokens: 3000,
        preferredProvider: 'anthropic'
      })
      
      // Parse the JSON response
      const stage = this.parseStageResponse(response.content, stageNumber, focusArea)
      
      // Validate questions
      this.validateStage(stage)
      
      return stage
      
    } catch (error) {
      console.error(`[Questionnaire] Failed to generate stage ${stageNumber}:`, error)
      
      // Return a fallback stage
      return this.createFallbackStage(stageNumber, focusArea, context)
    }
  }

  /**
   * Build optimized prompt for stage generation
   */
  private buildStagePrompt(
    stageNumber: number,
    context: QuestionnaireContext,
    focusArea: string,
    customPrompt?: string
  ): string {
    const basePrompt = promptService.generateQuestionnairePrompt(
      stageNumber,
      {
        experienceLevel: context.experienceLevel,
        previousAnswers: context.previousAnswers,
        researchData: context.researchData
      },
      focusArea
    )
    
    const enhancements = `
STAGE ${stageNumber} OF ${context.totalStages}
FOCUS: ${focusArea}

${customPrompt || ''}

CRITICAL REQUIREMENTS:
1. Questions must be highly relevant to ${focusArea}
2. Avoid duplicating information already in previous answers
3. Use varied question types for better engagement
4. Each question should provide actionable data
5. Include conditional logic where appropriate
6. ${context.experienceLevel === 'novice' ? 'Include helpful descriptions and examples' : 'Be concise and assume domain knowledge'}

QUESTION TYPE PREFERENCES:
- For options: Use single_select or multi_select with 3-7 choices
- For quantities: Use slider (0-100) or number with units
- For dates: Use calendar_date or calendar_range
- For detailed responses: Use textarea sparingly (max 2 per stage)
- For binary choices: Use boolean with clear labels

${this.getAnswerContext(context)}

OUTPUT: Valid JSON only, no other text`
    
    return basePrompt + '\n\n' + enhancements
  }

  /**
   * Get context from previous answers for better question generation
   */
  private getAnswerContext(context: QuestionnaireContext): string {
    const answers = context.previousAnswers || {}
    const keyInsights = []
    
    // Extract key information that influences questions
    if (answers.org_size) {
      keyInsights.push(`Organization size: ${answers.org_size}`)
    }
    if (answers.project_budget_range) {
      keyInsights.push(`Budget range: ${answers.project_budget_range}`)
    }
    if (answers.project_timeline) {
      keyInsights.push(`Timeline: ${JSON.stringify(answers.project_timeline)}`)
    }
    if (answers.target_audience) {
      keyInsights.push(`Target audience: ${answers.target_audience}`)
    }
    if (answers.delivery_preference) {
      keyInsights.push(`Delivery preference: ${answers.delivery_preference}`)
    }
    
    return keyInsights.length > 0
      ? `KEY CONTEXT FROM PREVIOUS ANSWERS:\n${keyInsights.join('\n')}`
      : ''
  }

  /**
   * Parse and validate stage response
   */
  private parseStageResponse(
    content: string,
    stageNumber: number,
    focusArea: string
  ): QuestionnaireStage {
    try {
      // Clean the response
      const cleaned = content
        .replace(/```json\n?/g, '')
        .replace(/```\n?/g, '')
        .trim()
      
      const parsed = JSON.parse(cleaned)
      
      // Ensure required fields
      const stage: QuestionnaireStage = {
        id: `stage_${stageNumber}`,
        title: parsed.title || `Stage ${stageNumber}: ${focusArea}`,
        description: parsed.description,
        questions: this.normalizeQuestions(parsed.questions || []),
        metadata: {
          estimatedTime: parsed.metadata?.estimatedTime || '5-10 minutes',
          purpose: parsed.metadata?.purpose || `Gather information about ${focusArea}`,
          focusArea
        }
      }
      
      return stage
      
    } catch (error) {
      console.error('[Questionnaire] Failed to parse stage response:', error)
      throw new AppError('Invalid questionnaire format', 'PARSE_ERROR')
    }
  }

  /**
   * Normalize questions to ensure consistent format
   */
  private normalizeQuestions(questions: any[]): Question[] {
    return questions.map((q, index) => {
      const normalized: Question = {
        id: q.id || `q_${Date.now()}_${index}`,
        type: this.normalizeQuestionType(q.type),
        label: q.label || 'Question',
        help: q.help,
        required: q.required !== false, // Default to required
        placeholder: q.placeholder
      }
      
      // Add type-specific properties
      if (['single_select', 'multi_select'].includes(normalized.type)) {
        normalized.options = this.normalizeOptions(q.options)
      }
      
      if (['slider', 'number'].includes(normalized.type)) {
        normalized.min = q.min ?? 0
        normalized.max = q.max ?? 100
        normalized.step = q.step ?? 1
        normalized.unit = q.unit
      }
      
      // Add validation if present
      if (q.validation) {
        normalized.validation = q.validation
      }
      
      // Add conditional logic if present
      if (q.conditional) {
        normalized.conditional = q.conditional
      }
      
      // Set default value if provided
      if (q.default !== undefined) {
        normalized.default = q.default
      }
      
      return normalized
    })
  }

  /**
   * Normalize question type to valid values
   */
  private normalizeQuestionType(type: string): Question['type'] {
    const typeMap: Record<string, Question['type']> = {
      'text': 'text',
      'textarea': 'textarea',
      'select': 'single_select',
      'single_select': 'single_select',
      'multi_select': 'multi_select',
      'multiselect': 'multi_select',
      'slider': 'slider',
      'range': 'slider',
      'number': 'number',
      'numeric': 'number',
      'date': 'calendar_date',
      'calendar_date': 'calendar_date',
      'daterange': 'calendar_range',
      'calendar_range': 'calendar_range',
      'boolean': 'boolean',
      'checkbox': 'boolean',
      'yesno': 'boolean'
    }
    
    return typeMap[type.toLowerCase()] || 'text'
  }

  /**
   * Normalize options for select questions
   */
  private normalizeOptions(options: any): Question['options'] {
    if (!options || !Array.isArray(options)) {
      return [
        { value: 'option1', label: 'Option 1' },
        { value: 'option2', label: 'Option 2' },
        { value: 'option3', label: 'Option 3' }
      ]
    }
    
    return options.map((opt, index) => {
      if (typeof opt === 'string') {
        return {
          value: opt.toLowerCase().replace(/\s+/g, '_'),
          label: opt
        }
      }
      
      return {
        value: opt.value || `option_${index}`,
        label: opt.label || opt.value || `Option ${index + 1}`,
        description: opt.description
      }
    })
  }

  /**
   * Validate a questionnaire stage
   */
  private validateStage(stage: QuestionnaireStage): void {
    if (!stage.questions || stage.questions.length === 0) {
      throw new AppError('Stage has no questions', 'VALIDATION_ERROR')
    }
    
    if (stage.questions.length > this.MAX_QUESTIONS_PER_STAGE) {
      console.warn(`[Questionnaire] Stage has ${stage.questions.length} questions, trimming to ${this.MAX_QUESTIONS_PER_STAGE}`)
      stage.questions = stage.questions.slice(0, this.MAX_QUESTIONS_PER_STAGE)
    }
    
    // Ensure unique question IDs
    const ids = new Set<string>()
    for (const question of stage.questions) {
      if (ids.has(question.id)) {
        question.id = `${question.id}_${Date.now()}`
      }
      ids.add(question.id)
    }
  }

  /**
   * Create a fallback stage if generation fails
   */
  private createFallbackStage(
    stageNumber: number,
    focusArea: string,
    context: QuestionnaireContext
  ): QuestionnaireStage {
    const fallbackQuestions = this.getFallbackQuestions(focusArea, context)
    
    return {
      id: `stage_${stageNumber}`,
      title: `Stage ${stageNumber}: ${focusArea}`,
      description: `Please provide information about ${focusArea.toLowerCase()}`,
      questions: fallbackQuestions,
      metadata: {
        estimatedTime: '5-10 minutes',
        purpose: `Gather essential ${focusArea.toLowerCase()} information`,
        focusArea
      }
    }
  }

  /**
   * Get fallback questions for a focus area
   */
  private getFallbackQuestions(focusArea: string, context: QuestionnaireContext): Question[] {
    // Mark context as used to satisfy TS noUnusedParameters
    void context
    const fallbackMap: Record<string, Question[]> = {
      'Delivery Modalities': [
        {
          id: 'delivery_format',
          type: 'single_select',
          label: 'Preferred primary delivery format',
          required: true,
          options: [
            { value: 'online_self_paced', label: 'Online Self-Paced' },
            { value: 'online_instructor_led', label: 'Online Instructor-Led' },
            { value: 'classroom', label: 'In-Person Classroom' },
            { value: 'blended', label: 'Blended Learning' },
            { value: 'mobile', label: 'Mobile Learning' }
          ]
        },
        {
          id: 'session_duration',
          type: 'slider',
          label: 'Ideal session duration (minutes)',
          min: 15,
          max: 480,
          step: 15,
          unit: 'minutes',
          default: 60,
          required: true
        }
      ],
      'Target Audiences': [
        {
          id: 'audience_segments',
          type: 'multi_select',
          label: 'Select all audience segments',
          required: true,
          options: [
            { value: 'new_hires', label: 'New Hires' },
            { value: 'managers', label: 'Managers' },
            { value: 'individual_contributors', label: 'Individual Contributors' },
            { value: 'executives', label: 'Executives' },
            { value: 'technical_staff', label: 'Technical Staff' },
            { value: 'customer_facing', label: 'Customer-Facing Roles' }
          ]
        },
        {
          id: 'audience_size',
          type: 'number',
          label: 'Approximate total number of learners',
          min: 1,
          max: 100000,
          required: true
        }
      ]
      // Add more fallback questions for other focus areas
    }
    
    return fallbackMap[focusArea] || [
      {
        id: 'general_info',
        type: 'textarea',
        label: `Please provide any relevant information about ${focusArea}`,
        help: 'Share key requirements, constraints, or preferences',
        required: false
      }
    ]
  }

  /**
   * Determine optimal number of stages based on context
   */
  private determineStageCount(context: QuestionnaireContext): number {
    const answerCount = Object.keys(context.previousAnswers || {}).length
    
    // More complex projects need more stages
    if (answerCount > 50) return 4
    if (answerCount > 30) return 3
    if (answerCount > 15) return 2
    
    // Default based on experience level
    switch (context.experienceLevel) {
      case 'novice':
        return 3 // More guided stages for novices
      case 'expert':
        return 2 // Fewer, more comprehensive stages for experts
      default:
        return 2
    }
  }

  /**
   * Identify which focus areas need coverage
   */
  private identifyFocusAreas(context: QuestionnaireContext): string[] {
    if (context.focusAreas && context.focusAreas.length > 0) {
      return context.focusAreas
    }
    
    const covered = new Set<string>()
    const answers = context.previousAnswers || {}
    
    // Map answer keys to focus areas
    const coverageMap: Record<string, string> = {
      'delivery': 'Delivery Modalities',
      'audience': 'Target Audiences',
      'competenc': 'Key Competencies',
      'content': 'Content Strategy',
      'tech': 'Technology Requirements',
      'assess': 'Assessment Methods',
      'timeline': 'Implementation Timeline',
      'budget': 'Budget Allocation',
      'change': 'Change Management',
      'metric': 'Success Metrics',
      'kpi': 'Success Metrics'
    }
    
    // Check which areas are already covered
    for (const answerKey of Object.keys(answers)) {
      const lowerKey = answerKey.toLowerCase()
      for (const [pattern, area] of Object.entries(coverageMap)) {
        if (lowerKey.includes(pattern)) {
          covered.add(area)
        }
      }
    }
    
    // Return uncovered areas first, then least covered
    const uncovered = this.FOCUS_AREAS.filter(area => !covered.has(area))
    const priority = [...uncovered, ...this.FOCUS_AREAS.filter(area => covered.has(area))]
    
    return priority
  }

  /**
   * Optimize generated stages for better flow
   */
  private optimizeStages(stages: QuestionnaireStage[], context: QuestionnaireContext): QuestionnaireStage[] {
    // Mark context as used to satisfy TS noUnusedParameters
    void context
    // Remove duplicate questions across stages
    const seenQuestions = new Set<string>()
    
    for (const stage of stages) {
      stage.questions = stage.questions.filter(q => {
        const key = `${q.type}:${q.label.toLowerCase()}`
        if (seenQuestions.has(key)) {
          console.log(`[Questionnaire] Removing duplicate question: ${q.label}`)
          return false
        }
        seenQuestions.add(key)
        return true
      })
      
      // Ensure minimum questions per stage
      if (stage.questions.length < this.MIN_QUESTIONS_PER_STAGE) {
        console.warn(`[Questionnaire] Stage ${stage.id} has only ${stage.questions.length} questions`)
      }
    }
    
    // Order stages by logical flow
    return this.orderStagesByDependencies(stages)
  }

  /**
   * Order stages based on logical dependencies
   */
  private orderStagesByDependencies(stages: QuestionnaireStage[]): QuestionnaireStage[] {
    const priorityOrder = [
      'Target Audiences',
      'Delivery Modalities', 
      'Key Competencies',
      'Content Strategy',
      'Technology Requirements',
      'Implementation Timeline',
      'Budget Allocation',
      'Assessment Methods',
      'Success Metrics',
      'Change Management'
    ]
    
    return stages.sort((a, b) => {
      const aIndex = priorityOrder.indexOf(a.metadata?.focusArea || '')
      const bIndex = priorityOrder.indexOf(b.metadata?.focusArea || '')
      
      if (aIndex === -1) return 1
      if (bIndex === -1) return -1
      
      return aIndex - bIndex
    })
  }

  /**
   * Apply skip logic based on previous answers
   */
  applySkipLogic(
    stages: QuestionnaireStage[],
    answers: Record<string, any>
  ): QuestionnaireStage[] {
    // Example skip logic implementations
    const filtered = stages.map(stage => {
      const filteredQuestions = stage.questions.filter(question => {
        // Check conditional display
        if (question.conditional) {
          const dependValue = answers[question.conditional.dependsOn]
          
          switch (question.conditional.condition) {
            case 'equals':
              return dependValue === question.conditional.value
            case 'not_equals':
              return dependValue !== question.conditional.value
            case 'contains':
              return String(dependValue).includes(question.conditional.value)
            case 'greater_than':
              return Number(dependValue) > Number(question.conditional.value)
            case 'less_than':
              return Number(dependValue) < Number(question.conditional.value)
            default:
              return true
          }
        }
        
        return true
      })
      
      return {
        ...stage,
        questions: filteredQuestions
      }
    })
    
    // Remove stages with no questions after filtering
    return filtered.filter(stage => stage.questions.length > 0)
  }
}

// Export singleton instance
export const questionnaireService = new QuestionnaireService()

// Export convenience functions
export const generateDynamicQuestionnaire = (
  context: QuestionnaireContext,
  customPrompts?: string[]
) => questionnaireService.generateDynamicStages(context, customPrompts)

export const applyQuestionnaireSkipLogic = (
  stages: QuestionnaireStage[],
  answers: Record<string, any>
) => questionnaireService.applySkipLogic(stages, answers)
