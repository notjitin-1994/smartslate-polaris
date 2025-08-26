/**
 * Enhanced Prompt Service with optimized templates and dynamic prompt generation
 */

export interface PromptContext {
  experienceLevel?: 'novice' | 'intermediate' | 'expert'
  industry?: string
  companySize?: string
  objectives?: string[]
  constraints?: string[]
  audience?: string
  budget?: string
  timeline?: string
  previousAnswers?: Record<string, any>
  researchData?: {
    greeting?: string
    organization?: string
    requirements?: string
  }
}

export class PromptService {
  /**
   * Generate optimized prompts with context-aware instructions
   */
  generatePrompt(
    type: 'greeting' | 'organization' | 'requirements' | 'questionnaire' | 'report' | 'analysis',
    context: PromptContext,
    additionalInstructions?: string
  ): string {
    const basePrompt = this.getBasePrompt(type)
    const contextualEnhancements = this.getContextualEnhancements(context)
    const outputFormat = this.getOutputFormat(type)
    
    return `${basePrompt}

${contextualEnhancements}

${additionalInstructions || ''}

${outputFormat}`
  }

  private getBasePrompt(type: 'greeting' | 'organization' | 'requirements' | 'questionnaire' | 'report' | 'analysis'): string {
    const prompts = {
      greeting: `You are an expert Learning Experience Designer conducting a comprehensive needs analysis.
Your role is to gather critical information about the requester to understand their context, challenges, and requirements.

APPROACH:
- Be conversational yet professional
- Focus on actionable insights
- Connect findings to L&D implications
- Prioritize relevance over breadth`,

      organization: `You are analyzing an organization's learning and development landscape.
Your goal is to understand the organizational context that will shape the learning solution.

FOCUS AREAS:
- Strategic alignment with business goals
- Compliance and regulatory requirements
- Cultural and operational constraints
- Technology infrastructure and capabilities
- Change readiness and adoption factors`,

      requirements: `You are scoping a learning and development project based on stated requirements.
Your objective is to translate business needs into actionable L&D recommendations.

KEY CONSIDERATIONS:
- Solution feasibility within constraints
- Risk identification and mitigation
- Resource optimization strategies
- Innovation opportunities
- Success metrics and measurement`,

      questionnaire: `You are designing a dynamic questionnaire to gather deeper insights.
Create questions that are:
- Specific and actionable
- Appropriate for the user's experience level
- Varied in format (not just text inputs)
- Progressive (building on previous answers)
- Focused on gaps in current information`,

      report: `You are creating a comprehensive, decision-ready report.
The report should be:
- Executive-friendly yet detailed
- Action-oriented with clear next steps
- Grounded in provided data (no speculation)
- Structured for easy scanning and decision-making
- Honest about uncertainties and gaps`,

      analysis: `You are performing a deep analysis of learning and development needs.
Your analysis should:
- Identify patterns and connections
- Surface hidden assumptions
- Recommend evidence-based solutions
- Consider multiple stakeholder perspectives
- Balance ideal and practical approaches`
    }
    
    return prompts[type] || prompts.analysis
  }

  private getContextualEnhancements(context: PromptContext): string {
    const enhancements: string[] = []

    // Experience level calibration
    if (context.experienceLevel) {
      const levelGuidance = {
        novice: `User is new to L&D. Provide more context, definitions, and examples. Avoid jargon.`,
        intermediate: `User has moderate L&D experience. Balance guidance with efficiency.`,
        expert: `User is highly experienced. Be concise, focus on advanced considerations.`
      }
      enhancements.push(`USER EXPERIENCE LEVEL: ${levelGuidance[context.experienceLevel]}`)
    }

    // Industry-specific considerations
    if (context.industry) {
      enhancements.push(`INDUSTRY CONTEXT: Consider ${context.industry}-specific regulations, standards, and best practices.`)
    }

    // Company size implications
    if (context.companySize) {
      const sizeFactors = {
        'startup': 'agility, resource constraints, rapid scaling needs',
        'small': 'budget efficiency, multi-role responsibilities, growth preparation',
        'medium': 'standardization, process maturity, departmental coordination',
        'large': 'scale complexity, governance requirements, change management',
        'enterprise': 'global considerations, compliance complexity, system integration'
      }
      const factor = this.mapCompanySize(context.companySize)
      enhancements.push(`ORGANIZATION SIZE: Account for ${sizeFactors[factor] || 'organizational scale'}`)
    }

    // Objectives alignment
    if (context.objectives && context.objectives.length > 0) {
      enhancements.push(`PRIMARY OBJECTIVES:\n${context.objectives.map(o => `- ${o}`).join('\n')}`)
    }

    // Constraints consideration
    if (context.constraints && context.constraints.length > 0) {
      enhancements.push(`KEY CONSTRAINTS:\n${context.constraints.map(c => `- ${c}`).join('\n')}`)
    }

    // Budget awareness
    if (context.budget) {
      enhancements.push(`BUDGET CONTEXT: ${context.budget} - Optimize recommendations for cost-effectiveness`)
    }

    // Timeline urgency
    if (context.timeline) {
      enhancements.push(`TIMELINE: ${context.timeline} - Prioritize speed-to-impact solutions`)
    }

    // Research data integration
    if (context.researchData) {
      const research = []
      if (context.researchData.greeting) {
        research.push('Individual context and role analysis available')
      }
      if (context.researchData.organization) {
        research.push('Organizational research and compliance data available')
      }
      if (context.researchData.requirements) {
        research.push('Requirements analysis and benchmarks available')
      }
      if (research.length > 0) {
        enhancements.push(`RESEARCH CONTEXT: ${research.join(', ')}. Leverage these insights in your response.`)
      }
    }

    // Previous answers context
    if (context.previousAnswers && Object.keys(context.previousAnswers).length > 0) {
      enhancements.push(`BUILD ON PREVIOUS INPUTS: User has already provided detailed information. Avoid redundancy, focus on gaps and clarifications.`)
    }

    return enhancements.join('\n\n')
  }

  private getOutputFormat(type: 'greeting' | 'organization' | 'requirements' | 'questionnaire' | 'report' | 'analysis'): string {
    const formats = {
      greeting: `OUTPUT FORMAT:
Return a structured analysis with these sections:
1. Role & Impact Summary (50-80 words)
2. L&D Challenges (3-5 items, prioritized)
3. Best Practices (3-5 actionable items)
4. Current Trends (2-3 relevant items from last 18 months)
5. Discovery Questions (5-7 targeted questions)
6. Next Steps (2-3 immediate actions)

Use markdown formatting. Be specific and cite sources where applicable.`,

      organization: `OUTPUT FORMAT:
Structure your analysis as:
1. Organization Overview (80-100 words)
2. Strategic Context & Goals
3. Compliance & Regulatory Landscape
4. L&D Maturity Assessment
5. Technology & Infrastructure Readiness
6. Culture & Change Factors
7. Stakeholder Map & Influence
8. Recommendations & Priorities

Use clear headings, bullet points, and callout boxes for critical items.`,

      requirements: `OUTPUT FORMAT:
Provide a requirements brief with:
1. Executive Summary (100 words max)
2. Solution Architecture
   - Delivery modalities with rationale
   - Technology stack recommendations
   - Content strategy
3. Implementation Roadmap
   - Phases with timelines
   - Milestones and dependencies
   - Resource requirements
4. Success Metrics & KPIs
5. Risk Analysis & Mitigation
6. Budget Allocation Strategy
7. Innovation Opportunities
8. Immediate Next Steps

Be specific with recommendations and include confidence levels.`,

      questionnaire: `OUTPUT FORMAT:
Return ONLY valid JSON matching this schema:
{
  "title": "Stage title (5-10 words)",
  "description": "Brief stage description (20-30 words)",
  "questions": [
    {
      "id": "unique_identifier",
      "type": "text|textarea|single_select|multi_select|slider|number|calendar_date|calendar_range",
      "label": "Clear, specific question",
      "help": "Additional context or examples",
      "required": true|false,
      "validation": { /* optional validation rules */ },
      "conditional": { /* optional conditional display */ },
      "options": ["for select types"],
      "min": 0, "max": 100, "step": 1, "unit": "%" // for numeric types
    }
  ],
  "metadata": {
    "estimatedTime": "5-10 minutes",
    "purpose": "What this stage accomplishes"
  }
}

NO additional text, NO markdown formatting, ONLY the JSON object.`,

      report: `OUTPUT FORMAT:
Generate a professional report with:

# [Report Title]

## Executive Summary
[Concise overview with key findings and recommendations]

## Current State Analysis
[Data-driven assessment of the present situation]

## Recommended Solution
### Delivery Strategy
### Technology Architecture
### Content & Curriculum
### Implementation Approach

## Learner Experience Design
[User journey and engagement strategy]

## Measurement Framework
[Success metrics, analytics, and reporting]

## Resource Planning
### Budget Breakdown
### Timeline & Milestones
### Team & Expertise Requirements

## Risk Assessment
[Identified risks with mitigation strategies]

## Next Steps
[Prioritized action items with owners and dates]

## Appendices
[Supporting data, research, and references]

Use professional formatting, clear headings, and data visualizations where appropriate.`,

      analysis: `OUTPUT FORMAT:
Provide a comprehensive analysis including:
1. Situation Assessment
2. Root Cause Analysis
3. Opportunity Identification
4. Solution Options (with pros/cons)
5. Recommended Approach
6. Implementation Considerations
7. Success Factors
8. Potential Barriers
9. Measurement Strategy
10. Conclusion & Call to Action

Use structured thinking, evidence-based reasoning, and clear recommendations.`
    }

    return formats[type] || formats.analysis
  }

  private mapCompanySize(size: string): 'startup' | 'small' | 'medium' | 'large' | 'enterprise' {
    const sizeMap: Record<string, string> = {
      '1-10': 'startup',
      '11-50': 'startup',
      '51-200': 'small',
      '201-500': 'small',
      '501-1000': 'medium',
      '1001-5000': 'medium',
      '5001-10000': 'large',
      '10001+': 'enterprise',
      'startup': 'startup',
      'small': 'small',
      'medium': 'medium',
      'large': 'large',
      'enterprise': 'enterprise'
    }
    return (sizeMap[size.toLowerCase()] || 'medium') as 'startup' | 'small' | 'medium' | 'large' | 'enterprise'
  }

  /**
   * Generate dynamic questionnaire prompts based on stage and context
   */
  generateQuestionnairePrompt(
    stage: number,
    context: PromptContext,
    focusArea?: string
  ): string {
    const stageGuidance: Record<1 | 2 | 3 | 4 | 5, string> = {
      1: 'Initial discovery - understand the baseline',
      2: 'Deep dive - explore specifics and nuances',
      3: 'Validation - confirm assumptions and fill gaps',
      4: 'Refinement - finalize details and edge cases',
      5: 'Consolidation - ensure completeness'
    }

    const baseFocus = focusArea || this.determineStageAndFocus(stage, context)

    return this.generatePrompt('questionnaire', context, `
STAGE ${stage}: ${stageGuidance[(stage as 1 | 2 | 3 | 4 | 5)] || stageGuidance[2]}
FOCUS AREA: ${baseFocus}

Generate 6-9 questions that:
1. Are highly relevant to ${baseFocus}
2. Build on previous answers without repetition
3. Use appropriate input types (prefer selects, sliders, dates over text)
4. Include validation and helpful examples
5. Can be answered in 5-10 minutes total

Previous stage data is available - reference it to avoid redundancy.
Questions should progressively narrow from general to specific.
Include at least one question that surfaces risks or concerns.`)
  }

  private determineStageAndFocus(stage: number, context: PromptContext): string {
    const focusAreas = [
      'Delivery Modalities and Learning Design',
      'Target Audiences and Learner Profiles',
      'Competencies and Performance Outcomes',
      'Content Strategy and Development',
      'Technology and Platform Requirements',
      'Measurement and Success Criteria',
      'Change Management and Adoption',
      'Budget and Resource Allocation'
    ]

    // Intelligently select focus based on what's missing
    if (!context.previousAnswers) {
      return focusAreas[Math.min(stage - 1, focusAreas.length - 1)]
    }

    // Analyze previous answers to determine gaps
    const answered = new Set(Object.keys(context.previousAnswers))
    const focusMap: Record<string, string[]> = {
      'Delivery Modalities and Learning Design': ['delivery_mode', 'learning_format', 'synchronous', 'blended'],
      'Target Audiences and Learner Profiles': ['audience', 'learner_segments', 'demographics', 'personas'],
      'Competencies and Performance Outcomes': ['competencies', 'skills', 'performance', 'objectives'],
      'Content Strategy and Development': ['content', 'curriculum', 'modules', 'topics'],
      'Technology and Platform Requirements': ['technology', 'platform', 'lms', 'tools'],
      'Measurement and Success Criteria': ['metrics', 'kpis', 'assessment', 'evaluation'],
      'Change Management and Adoption': ['change', 'adoption', 'rollout', 'communication'],
      'Budget and Resource Allocation': ['budget', 'resources', 'team', 'timeline']
    }

    // Find the area with least coverage
    let minCoverage = Infinity
    let selectedArea = focusAreas[0]

    for (const [area, keywords] of Object.entries(focusMap)) {
      const coverage = keywords.filter(kw => 
        Array.from(answered).some(a => a.toLowerCase().includes(kw))
      ).length
      
      if (coverage < minCoverage) {
        minCoverage = coverage
        selectedArea = area
      }
    }

    return selectedArea
  }

  /**
   * Generate report generation prompts with enhanced context
   */
  generateReportPrompt(
    reportType: 'preliminary' | 'final' | 'executive',
    context: PromptContext,
    allData: Record<string, any>
  ): string {
    const reportGuidance = {
      preliminary: `Generate a preliminary report that:
- Summarizes findings to date
- Identifies gaps and uncertainties
- Proposes initial recommendations
- Suggests areas for deeper investigation`,
      
      final: `Generate a comprehensive final report that:
- Provides definitive recommendations
- Includes detailed implementation plans
- Addresses all stakeholder concerns
- Offers clear success metrics`,
      
      executive: `Generate an executive summary that:
- Highlights key decisions needed
- Summarizes costs and benefits
- Presents risks and mitigation
- Provides clear next steps`
    }

    return this.generatePrompt('report', context, `
REPORT TYPE: ${reportType.toUpperCase()}
${reportGuidance[reportType]}

DATA AVAILABLE:
${JSON.stringify(allData, null, 2)}

REQUIREMENTS:
1. Base all conclusions on provided data
2. Call out assumptions explicitly
3. Provide confidence levels for recommendations
4. Include specific, actionable next steps
5. Format for ${context.experienceLevel || 'intermediate'} audience

CRITICAL SUCCESS FACTORS:
- Alignment with stated objectives
- Feasibility within constraints
- Measurable outcomes
- Risk mitigation
- Stakeholder buy-in`)
  }
}

// Export singleton instance
export const promptService = new PromptService()

// Export convenience functions
export const generatePrompt = (
  type: 'greeting' | 'organization' | 'requirements' | 'questionnaire' | 'report' | 'analysis',
  context: PromptContext,
  additionalInstructions?: string
) => promptService.generatePrompt(type, context, additionalInstructions)

export const generateQuestionnairePrompt = (
  stage: number,
  context: PromptContext,
  focusArea?: string
) => promptService.generateQuestionnairePrompt(stage, context, focusArea)

export const generateReportPrompt = (
  reportType: 'preliminary' | 'final' | 'executive',
  context: PromptContext,
  allData: Record<string, any>
) => promptService.generateReportPrompt(reportType, context, allData)
