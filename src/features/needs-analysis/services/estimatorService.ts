import type { EstimationCoefficients, EstimationResult } from '../types'

/**
 * Service for calculating project estimates based on complexity factors
 */
export class EstimatorService {
  // Base hours for different roles per module
  private static readonly BASE_HOURS = {
    instructionalDesign: 40,
    contentDevelopment: 60,
    mediaProduction: 30,
    qualityAssurance: 20,
    projectManagement: 15,
  }

  // Multipliers for complexity factors (0-3 scale)
  private static readonly COMPLEXITY_MULTIPLIERS = {
    contentNovelty: [1.0, 1.2, 1.5, 2.0],
    smeAccess: [1.0, 1.1, 1.3, 1.6],
    interactivity: [1.0, 1.3, 1.6, 2.0],
    mediaLevel: [1.0, 1.2, 1.5, 1.8],
  }

  // Hours per language for localization
  private static readonly LOCALIZATION_HOURS_PER_LANGUAGE = 20

  // Average hourly rates by role (can be configured)
  private static readonly HOURLY_RATES = {
    instructionalDesign: 125,
    contentDevelopment: 100,
    mediaProduction: 110,
    qualityAssurance: 90,
    projectManagement: 135,
  }

  /**
   * Calculate project estimate based on complexity coefficients
   */
  static calculateEstimate(coefficients: EstimationCoefficients): EstimationResult {
    // Calculate complexity multiplier
    const complexityMultiplier = this.calculateComplexityMultiplier(coefficients)

    // Calculate effort hours by role
    const effortHours = {
      instructionalDesign: Math.round(
        this.BASE_HOURS.instructionalDesign * complexityMultiplier
      ),
      contentDevelopment: Math.round(
        this.BASE_HOURS.contentDevelopment * complexityMultiplier
      ),
      mediaProduction: Math.round(
        this.BASE_HOURS.mediaProduction * 
        this.COMPLEXITY_MULTIPLIERS.mediaLevel[coefficients.mediaLevel]
      ),
      qualityAssurance: Math.round(
        this.BASE_HOURS.qualityAssurance * complexityMultiplier * 0.8
      ),
      projectManagement: Math.round(
        this.BASE_HOURS.projectManagement * complexityMultiplier * 0.9
      ),
      total: 0, // Calculated below
    }

    // Add localization hours
    const localizationHours = coefficients.localizationCount * this.LOCALIZATION_HOURS_PER_LANGUAGE
    effortHours.contentDevelopment += localizationHours

    // Calculate total hours
    effortHours.total = Object.entries(effortHours)
      .filter(([key]) => key !== 'total')
      .reduce((sum, [_, hours]) => sum + hours, 0)

    // Calculate timeline (assuming 6 productive hours per day, some parallel work)
    const timelineDays = Math.ceil(effortHours.total / 6 / 2) // Divide by 2 for parallel work

    // Calculate total cost
    const totalCost = Object.entries(effortHours)
      .filter(([key]) => key !== 'total')
      .reduce((sum, [role, hours]) => {
        const rate = this.HOURLY_RATES[role as keyof typeof this.HOURLY_RATES]
        return sum + (hours * rate)
      }, 0)

    // Generate assumptions
    const assumptions = this.generateAssumptions(coefficients)

    return {
      effortHours,
      timelineDays,
      totalCost,
      assumptions,
    }
  }

  /**
   * Calculate overall complexity multiplier
   */
  private static calculateComplexityMultiplier(coefficients: EstimationCoefficients): number {
    const factors = [
      this.COMPLEXITY_MULTIPLIERS.contentNovelty[coefficients.contentNovelty],
      this.COMPLEXITY_MULTIPLIERS.smeAccess[coefficients.smeAccess],
      this.COMPLEXITY_MULTIPLIERS.interactivity[coefficients.interactivity],
    ]

    // Use weighted average
    return factors.reduce((sum, factor) => sum + factor, 0) / factors.length
  }

  /**
   * Generate assumptions based on coefficients
   */
  private static generateAssumptions(coefficients: EstimationCoefficients): string[] {
    const assumptions: string[] = [
      'Estimate assumes standard business hours availability',
      'One round of stakeholder review included',
      'Standard LMS deployment included',
    ]

    if (coefficients.contentNovelty >= 2) {
      assumptions.push('Additional research time included for novel content')
    }

    if (coefficients.smeAccess >= 2) {
      assumptions.push('Extended timeline due to limited SME availability')
    }

    if (coefficients.interactivity >= 2) {
      assumptions.push('Custom interactions and simulations included')
    }

    if (coefficients.mediaLevel >= 2) {
      assumptions.push('Professional media production included')
    }

    if (coefficients.localizationCount > 0) {
      assumptions.push(`Localization for ${coefficients.localizationCount} languages included`)
    }

    return assumptions
  }

  /**
   * Determine if training is the right solution based on root causes
   */
  static analyzeTrainingSolution(rootCauses: string[]): {
    isTrainingSolution: boolean
    recommendation: 'training' | 'non-training' | 'hybrid'
    rationale: string
  } {
    const nonTrainingCauses = [
      'tools', 
      'process', 
      'policy', 
      'resources', 
      'motivation',
      'environment',
      'system',
    ]

    const trainingCauses = [
      'knowledge',
      'skills',
      'awareness',
      'practice',
      'understanding',
    ]

    // Count causes by category
    const nonTrainingCount = rootCauses.filter(cause => 
      nonTrainingCauses.some(ntc => cause.toLowerCase().includes(ntc))
    ).length

    const trainingCount = rootCauses.filter(cause =>
      trainingCauses.some(tc => cause.toLowerCase().includes(tc))
    ).length

    // Determine recommendation
    let recommendation: 'training' | 'non-training' | 'hybrid'
    let rationale: string

    if (nonTrainingCount > trainingCount * 2) {
      recommendation = 'non-training'
      rationale = 'Root cause analysis indicates performance gaps are primarily due to system, process, or environmental factors. Consider job aids, process improvements, or tool enhancements.'
    } else if (trainingCount > nonTrainingCount * 2) {
      recommendation = 'training'
      rationale = 'Root cause analysis indicates performance gaps are primarily due to knowledge or skill deficiencies. A comprehensive training solution is recommended.'
    } else {
      recommendation = 'hybrid'
      rationale = 'Root cause analysis indicates a mix of training and non-training factors. A blended approach combining training with job aids and process improvements is recommended.'
    }

    return {
      isTrainingSolution: recommendation !== 'non-training',
      recommendation,
      rationale,
    }
  }
}
