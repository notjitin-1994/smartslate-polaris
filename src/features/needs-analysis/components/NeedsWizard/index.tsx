import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, ArrowRight, Save } from 'lucide-react'
import { WizardProgress } from './WizardProgress'
import { BusinessContextStep } from './BusinessContextStep'
import { StakeholderStep } from './StakeholderStep'
import { AudienceStep } from './AudienceStep'
import { ConstraintsStep } from './ConstraintsStep'
import { NeedsAnalysisService } from '../../services/needsAnalysisService'
import { useAuth } from '@/contexts/AuthContext'
import type { WizardState, NeedsProjectInsert } from '../../types'

const STEP_TITLES = ['Business Context', 'Stakeholders', 'Audiences', 'Constraints']

export function NeedsWizard({ projectId }: { projectId?: string }) {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const [wizardState, setWizardState] = useState<WizardState>({
    currentStep: 1,
    totalSteps: 4,
    completedSteps: new Set(),
    data: {},
  })

  // Load existing project data if editing
  useEffect(() => {
    if (projectId) {
      loadProject()
    }
  }, [projectId])

  const loadProject = async () => {
    if (!projectId) return
    
    setIsLoading(true)
    try {
      const project = await NeedsAnalysisService.getProjectWithRelations(projectId)
      if (project) {
        // Map project data back to wizard state
        setWizardState({
          ...wizardState,
          data: {
            businessContext: {
              title: project.project.title,
              businessGoal: project.project.business_goal || '',
              successMetrics: project.project.success_metrics || {},
              deadline: project.project.deadline,
              budgetCap: project.project.budget_cap,
            },
            stakeholders: project.stakeholders,
            audiences: project.audiences,
            constraints: {
              languages: project.project.languages || [],
              timeline: project.project.deadline,
              budget: project.project.budget_cap,
            },
          },
        })
      }
    } catch (err) {
      setError('Failed to load project')
      console.error(err)
    } finally {
      setIsLoading(false)
    }
  }

  const handleStepComplete = (stepData: any) => {
    const stepKey = ['businessContext', 'stakeholders', 'audiences', 'constraints'][wizardState.currentStep - 1]
    
    setWizardState(prev => ({
      ...prev,
      data: {
        ...prev.data,
        [stepKey]: stepData,
      },
      completedSteps: new Set([...prev.completedSteps, prev.currentStep]),
    }))
  }

  const handleNext = async () => {
    if (wizardState.currentStep < wizardState.totalSteps) {
      // Save current step data
      await saveProgress()
      
      setWizardState(prev => ({
        ...prev,
        currentStep: prev.currentStep + 1,
      }))
    } else {
      // Complete wizard
      await saveProgress()
      navigate(`/needs-analysis/${projectId || 'new'}/diagnostic`)
    }
  }

  const handlePrevious = () => {
    if (wizardState.currentStep > 1) {
      setWizardState(prev => ({
        ...prev,
        currentStep: prev.currentStep - 1,
      }))
    }
  }

  const saveProgress = async () => {
    if (!user) return
    
    setIsSaving(true)
    setError(null)
    
    try {
      const { businessContext, constraints } = wizardState.data
      
      if (!businessContext?.title) {
        throw new Error('Project title is required')
      }

      const projectData: NeedsProjectInsert = {
        user_id: user.id,
        title: businessContext.title,
        business_goal: businessContext.businessGoal,
        success_metrics: businessContext.successMetrics,
        deadline: businessContext.deadline,
        budget_cap: businessContext.budgetCap,
        languages: constraints?.languages || [],
        status: 'draft',
      }

      if (projectId) {
        // Update existing project
        await NeedsAnalysisService.updateProject(projectId, projectData)
      } else {
        // Create new project
        const newProject = await NeedsAnalysisService.createProject(projectData)
        // Update URL to include project ID
        window.history.replaceState({}, '', `/needs-analysis/${newProject.id}/intake`)
      }

      // Save related data
      if (wizardState.data.stakeholders && projectId) {
        // Save stakeholders (simplified - in real app, handle updates/deletes)
        for (const stakeholder of wizardState.data.stakeholders) {
          if (!stakeholder.id) {
            await NeedsAnalysisService.addStakeholder({
              ...stakeholder,
              project_id: projectId,
            })
          }
        }
      }

      if (wizardState.data.audiences && projectId) {
        // Save audiences
        for (const audience of wizardState.data.audiences) {
          if (!audience.id) {
            await NeedsAnalysisService.addAudience({
              ...audience,
              project_id: projectId,
            })
          }
        }
      }
    } catch (err: any) {
      setError(err.message || 'Failed to save progress')
      console.error(err)
    } finally {
      setIsSaving(false)
    }
  }

  const renderStep = () => {
    switch (wizardState.currentStep) {
      case 1:
        return (
          <BusinessContextStep
            data={wizardState.data.businessContext}
            onChange={handleStepComplete}
          />
        )
      case 2:
        return (
          <StakeholderStep
            stakeholders={wizardState.data.stakeholders || []}
            onChange={handleStepComplete}
          />
        )
      case 3:
        return (
          <AudienceStep
            audiences={wizardState.data.audiences || []}
            onChange={handleStepComplete}
          />
        )
      case 4:
        return (
          <ConstraintsStep
            data={wizardState.data.constraints}
            onChange={handleStepComplete}
          />
        )
      default:
        return null
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h1 className="text-2xl font-semibold text-gray-900">
            Needs Analysis Wizard
          </h1>
          <p className="mt-1 text-sm text-gray-600">
            Let's gather information about your training needs
          </p>
        </div>

        <div className="px-6 py-4">
          <WizardProgress
            currentStep={wizardState.currentStep}
            totalSteps={wizardState.totalSteps}
            stepTitles={STEP_TITLES}
          />
        </div>

        <div className="px-6 py-6">
          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 text-red-700 rounded-md">
              {error}
            </div>
          )}
          
          {renderStep()}
        </div>

        <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
          <button
            onClick={handlePrevious}
            disabled={wizardState.currentStep === 1}
            className={`
              flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md
              ${wizardState.currentStep === 1
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
              }
            `}
          >
            <ArrowLeft className="w-4 h-4" />
            Previous
          </button>

          <button
            onClick={saveProgress}
            disabled={isSaving}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
          >
            <Save className="w-4 h-4" />
            {isSaving ? 'Saving...' : 'Save Progress'}
          </button>

          <button
            onClick={handleNext}
            disabled={isSaving}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
          >
            {wizardState.currentStep === wizardState.totalSteps ? 'Complete' : 'Next'}
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  )
}
