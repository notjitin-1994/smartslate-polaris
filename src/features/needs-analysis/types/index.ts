// Re-export all types
export * from './database.types'

// Business logic types
export interface ProjectWithRelations {
  project: import('./database.types').NeedsProject
  stakeholders: import('./database.types').NeedsStakeholder[]
  audiences: import('./database.types').NeedsAudience[]
  tasks: import('./database.types').NeedsTaskItem[]
  recommendation?: import('./database.types').NeedsRecommendation
  blendItems: import('./database.types').NeedsBlendItem[]
  estimate?: import('./database.types').NeedsEstimate
  risks: import('./database.types').NeedsRisk[]
  artifacts: import('./database.types').NeedsArtifact[]
}

// Wizard state types
export interface WizardState {
  currentStep: number
  totalSteps: number
  completedSteps: Set<number>
  data: {
    businessContext?: {
      title: string
      businessGoal: string
      successMetrics: Record<string, any>
      deadline?: string
      budgetCap?: number
    }
    stakeholders?: import('./database.types').NeedsStakeholder[]
    audiences?: import('./database.types').NeedsAudience[]
    constraints?: {
      languages: string[]
      timeline?: string
      budget?: number
    }
  }
}

// Diagnostic types
export interface DiagnosticResult {
  isTrainingSolution: boolean
  rootCauses: string[]
  performanceGap: {
    current: number
    target: number
    gap: number
  }
  recommendation: 'training' | 'non-training' | 'hybrid'
  rationale: string
}

// Estimation types
export interface EstimationCoefficients {
  contentNovelty: number // 0-3
  smeAccess: number // 0-3
  interactivity: number // 0-3
  mediaLevel: number // 0-3
  localizationCount: number
}

export interface EstimationResult {
  effortHours: {
    instructionalDesign: number
    contentDevelopment: number
    mediaProduction: number
    qualityAssurance: number
    projectManagement: number
    total: number
  }
  timelineDays: number
  totalCost: number
  assumptions: string[]
}
