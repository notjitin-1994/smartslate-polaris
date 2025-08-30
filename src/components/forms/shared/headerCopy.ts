// Centralized header copy for questionnaire flows

export const HEADER_TITLE = 'Your Discovery Journey'

export function getStaticSubheading(step: 'requestor' | 'group'): string {
  if (step === 'requestor') {
    return "Tell us a bit about you so we can personalize your journey."
  }
  return 'Help us understand your team, constraints, and desired outcomes.'
}

export function getDynamicSubheading(
  stageName: string,
  stageDescription?: string,
  currentStageIndex?: number,
  totalStages?: number
): string {
  if (stageDescription && stageDescription.trim().length > 0) return stageDescription
  const index = (currentStageIndex ?? 0) + 1
  const total = totalStages ?? undefined
  if (total) return `Stage ${index} of ${total}: ${stageName}`
  return stageName
}

export function getLoadingSubheading(): string {
  return 'Preparing your personalized questionnaire — this usually takes under a minute.'
}

export function getFinalReportSubheading(): string {
  return 'Crafting your implementation-ready blueprint — this usually takes under a minute.'
}


