import { useMemo } from 'react'
import type { NAField } from '@/polaris/needs-analysis/types'

export function useAdaptiveQuestions(allAnswers: Record<string, unknown>, experienceLevel?: string): NAField[] {
  return useMemo(() => {
    const questions: NAField[] = []
    const missing = (id: string) => allAnswers[id] === undefined || allAnswers[id] === null || allAnswers[id] === '' || (Array.isArray(allAnswers[id]) && (allAnswers[id] as unknown[]).length === 0)

    if (missing('kickoff_window')) {
      questions.push({ id: 'kickoff_window', label: 'Preferred kickoff window', type: 'calendar_range', required: true, help: 'Improves timeline and resource planning.' })
    }
    if (missing('success_metrics')) {
      questions.push({ id: 'success_metrics', label: 'Key metrics you track', type: 'multi_select', options: ['Completion','Assessment scores','Time-to-productivity','Sales KPIs','CSAT/NPS','Quality/Defects','Attrition'], required: true })
    }
    if (experienceLevel && experienceLevel.toLowerCase().includes('novice')) {
      questions.push({ id: 'stakeholder_alignment', label: 'Are stakeholders aligned on objectives?', type: 'single_select', options: ['Yes','Partially','No','Unsure'], help: 'Improves risk and next steps guidance.' })
    }
    return questions.slice(0, 6)
  }, [allAnswers, experienceLevel])
}

export default useAdaptiveQuestions


