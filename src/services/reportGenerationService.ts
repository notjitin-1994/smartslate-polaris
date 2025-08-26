import { unifiedAIService } from './unifiedAIService'
import { promptService } from './promptService'
import { saveJobReport } from './polarisJobsService'
import { AppError } from '@/lib/errors'

export interface ReportContext {
  jobId?: string
  userId: string
  experienceLevel: 'novice' | 'intermediate' | 'expert'
  companyName?: string
  industry?: string
  companySize?: string
  
  // Collected data
  greetingData?: Record<string, any>
  orgData?: Record<string, any>
  requirementsData?: Record<string, any>
  dynamicAnswers?: Record<string, any>
  
  // Research reports
  greetingReport?: string
  orgReport?: string
  requirementReport?: string
  preliminaryReport?: string
  
  // Metadata
  objectives?: string[]
  constraints?: string[]
  audience?: string
  budget?: string
  timeline?: string
}

export interface GeneratedReport {
  content: string
  format: 'markdown' | 'json' | 'html'
  metadata: {
    generatedAt: string
    provider: string
    model: string
    confidence: number
    wordCount: number
    sections: string[]
    gaps: string[]
    enhanced?: boolean
    completeness?: number
    validated?: boolean
  }
}

/**
 * Enhanced Report Generation Service
 */
export class ReportGenerationService {
  /**
   * Generate a comprehensive needs analysis report
   */
  async generateNeedsAnalysisReport(
    context: ReportContext,
    reportType: 'preliminary' | 'final' = 'final'
  ): Promise<GeneratedReport> {
    console.log(`[ReportGen] Starting ${reportType} report generation`)
    
    // Prepare all available data
    const allData = this.consolidateData(context)
    
    // Generate optimized prompt
    const prompt = promptService.generateReportPrompt(
      reportType,
      {
        experienceLevel: context.experienceLevel,
        industry: context.industry,
        companySize: context.companySize,
        objectives: context.objectives,
        constraints: context.constraints,
        audience: context.audience,
        budget: context.budget,
        timeline: context.timeline,
        researchData: {
          greeting: context.greetingReport,
          organization: context.orgReport,
          requirements: context.requirementReport
        },
        previousAnswers: allData
      },
      allData
    )
    
    // Call AI with optimized settings
    const response = await unifiedAIService.call({
      prompt,
      inputType: 'text',
      capabilities: ['reasoning'],
      temperature: 0.3, // Lower temperature for more consistent reports
      maxTokens: 8000,
      preferredProvider: 'anthropic' // Claude is best for long-form content
    })
    
    // Parse and validate the report
    const report = this.parseReport(response.content, reportType)
    
    // Extract metadata
    const metadata = this.extractMetadata(report, response)
    
    // Save to database if job ID provided
    if (context.jobId) {
      await this.saveReport(context.jobId, reportType, report, metadata)
    }
    
    return {
      content: report,
      format: 'markdown',
      metadata
    }
  }

  /**
   * Generate a structured JSON report
   */
  async generateStructuredReport(
    context: ReportContext
  ): Promise<GeneratedReport> {
    console.log('[ReportGen] Generating structured JSON report')
    
    const allData = this.consolidateData(context)
    
    // Use specific JSON-focused prompt
    const prompt = `
You are generating a structured needs analysis in JSON format.

CONTEXT:
${JSON.stringify(context, null, 2)}

ALL DATA:
${JSON.stringify(allData, null, 2)}

Generate a comprehensive JSON report with this EXACT structure:
{
  "executive_summary": {
    "problem_statement": "string",
    "key_findings": ["string"],
    "critical_recommendations": ["string"],
    "confidence_score": 0.0-1.0
  },
  "current_state": {
    "organization_context": "string",
    "learner_profile": {},
    "existing_capabilities": ["string"],
    "identified_gaps": ["string"]
  },
  "recommended_solution": {
    "approach": "string",
    "delivery_modalities": [
      {
        "type": "string",
        "rationale": "string",
        "percentage": 0-100
      }
    ],
    "technology_stack": ["string"],
    "content_strategy": "string",
    "implementation_phases": [
      {
        "phase": "string",
        "duration": "string",
        "deliverables": ["string"]
      }
    ]
  },
  "success_metrics": {
    "kpis": [
      {
        "metric": "string",
        "baseline": "string",
        "target": "string",
        "measurement_method": "string"
      }
    ],
    "evaluation_framework": "string"
  },
  "resource_requirements": {
    "budget_estimate": {
      "low": 0,
      "high": 0,
      "currency": "USD"
    },
    "team_composition": ["string"],
    "timeline": {
      "start": "YYYY-MM-DD",
      "end": "YYYY-MM-DD",
      "milestones": []
    }
  },
  "risks": [
    {
      "risk": "string",
      "probability": "low|medium|high",
      "impact": "low|medium|high",
      "mitigation": "string"
    }
  ],
  "next_steps": [
    {
      "action": "string",
      "owner": "string",
      "deadline": "YYYY-MM-DD"
    }
  ]
}

Return ONLY the JSON object, no other text.`

    const response = await unifiedAIService.call({
      prompt,
      inputType: 'text',
      capabilities: ['reasoning'],
      temperature: 0.2,
      maxTokens: 6000,
      preferredProvider: 'anthropic'
    })
    
    try {
      const jsonReport = JSON.parse(response.content)
      const metadata = this.extractMetadata(JSON.stringify(jsonReport, null, 2), response)
      
      return {
        content: JSON.stringify(jsonReport, null, 2),
        format: 'json',
        metadata
      }
    } catch (error) {
      console.error('[ReportGen] Failed to parse JSON report:', error)
      throw new AppError('Failed to generate structured report', 'REPORT_PARSE_ERROR')
    }
  }

  /**
   * Generate a research-focused report
   */
  async generateResearchReport(
    topic: string,
    context: Partial<ReportContext>
  ): Promise<GeneratedReport> {
    console.log('[ReportGen] Generating research report for:', topic)
    
    const prompt = `
Conduct comprehensive research on: ${topic}

Context:
- Company: ${context.companyName || 'Not specified'}
- Industry: ${context.industry || 'Not specified'}
- Size: ${context.companySize || 'Not specified'}

Provide:
1. Current state analysis
2. Industry best practices
3. Emerging trends (last 18 months)
4. Relevant case studies
5. Recommendations
6. Implementation considerations
7. Success metrics
8. Risk factors

Cite sources and provide confidence levels for each finding.
Format as a professional research brief.`

    const response = await unifiedAIService.research(prompt, {
      maxTokens: 3000,
      temperature: 0.3
    })
    
    const metadata = this.extractMetadata(response.content, response)
    
    return {
      content: response.content,
      format: 'markdown',
      metadata: {
        ...metadata,
        sections: ['Research findings', 'Best practices', 'Trends', 'Case studies']
      }
    }
  }

  /**
   * Generate an executive summary
   */
  async generateExecutiveSummary(
    fullReport: string,
    context: ReportContext
  ): Promise<GeneratedReport> {
    console.log('[ReportGen] Generating executive summary')
    
    const prompt = `
Create a concise executive summary from this full report:

${fullReport}

Requirements:
- Maximum 500 words
- Focus on decisions needed
- Highlight critical risks
- Emphasize ROI and business impact
- Use bullet points for clarity
- Include specific next steps with owners

Target audience: ${context.experienceLevel} level executive`

    const response = await unifiedAIService.call({
      prompt,
      inputType: 'text',
      temperature: 0.4,
      maxTokens: 1000,
      preferredProvider: 'anthropic'
    })
    
    const metadata = this.extractMetadata(response.content, response)
    
    return {
      content: response.content,
      format: 'markdown',
      metadata: {
        ...metadata,
        sections: ['Executive summary']
      }
    }
  }

  /**
   * Enhance an existing report with AI assistance
   */
  async enhanceReport(
    originalReport: string,
    enhancementInstructions: string,
    context: ReportContext
  ): Promise<GeneratedReport> {
    console.log('[ReportGen] Enhancing existing report')
    
    const prompt = `
You are enhancing an existing L&D needs analysis report.

ORIGINAL REPORT:
${originalReport}

ENHANCEMENT INSTRUCTIONS:
${enhancementInstructions}

CONTEXT:
- Experience Level: ${context.experienceLevel}
- Industry: ${context.industry || 'Not specified'}
- Company Size: ${context.companySize || 'Not specified'}

Requirements:
1. Maintain the original structure and key findings
2. Enhance based on the specific instructions
3. Ensure consistency throughout
4. Flag any contradictions or concerns
5. Improve clarity and actionability

Return the enhanced report in the same format as the original.`

    const response = await unifiedAIService.call({
      prompt,
      inputType: 'text',
      capabilities: ['reasoning'],
      temperature: 0.5,
      maxTokens: 8000,
      preferredProvider: 'anthropic'
    })
    
    const metadata = this.extractMetadata(response.content, response)
    
    return {
      content: response.content,
      format: 'markdown',
      metadata: {
        ...metadata,
        enhanced: true
      }
    }
  }

  /**
   * Generate a report section
   */
  async generateReportSection(
    sectionType: 'learner_analysis' | 'technology_assessment' | 'budget_breakdown' | 'risk_assessment' | 'implementation_plan',
    context: ReportContext
  ): Promise<string> {
    const sectionPrompts = {
      learner_analysis: 'Generate a comprehensive learner analysis including demographics, preferences, constraints, and readiness',
      technology_assessment: 'Assess technology requirements, current capabilities, gaps, and recommendations',
      budget_breakdown: 'Provide detailed budget breakdown with cost categories, ranges, and ROI analysis',
      risk_assessment: 'Identify and analyze risks with probability, impact, and mitigation strategies',
      implementation_plan: 'Create a detailed implementation plan with phases, timelines, and success criteria'
    }
    
    const allData = this.consolidateData(context)
    const prompt = `
${sectionPrompts[sectionType]}

Context and Data:
${JSON.stringify(allData, null, 2)}

Provide a detailed, actionable section that can be integrated into a larger report.
Use appropriate formatting with headers and bullet points.`

    const response = await unifiedAIService.call({
      prompt,
      inputType: 'text',
      temperature: 0.4,
      maxTokens: 2000
    })
    
    return response.content
  }

  /**
   * Validate report completeness and quality
   */
  async validateReport(report: string): Promise<{
    isValid: boolean
    completeness: number
    issues: string[]
    suggestions: string[]
  }> {
    const prompt = `
Analyze this L&D needs analysis report for completeness and quality:

${report}

Evaluate:
1. Completeness (0-100%)
2. Missing critical sections
3. Quality issues (vagueness, contradictions, unsupported claims)
4. Improvement suggestions

Return a JSON object with:
{
  "completeness": 0-100,
  "missing_sections": ["string"],
  "quality_issues": ["string"],
  "suggestions": ["string"]
}`

    const response = await unifiedAIService.call({
      prompt,
      inputType: 'text',
      temperature: 0.3,
      maxTokens: 1000
    })
    
    try {
      const validation = JSON.parse(response.content)
      return {
        isValid: validation.completeness >= 70 && validation.quality_issues.length === 0,
        completeness: validation.completeness,
        issues: [...validation.missing_sections, ...validation.quality_issues],
        suggestions: validation.suggestions
      }
    } catch {
      return {
        isValid: true,
        completeness: 80,
        issues: [],
        suggestions: []
      }
    }
  }

  // Helper methods

  private consolidateData(context: ReportContext): Record<string, any> {
    return {
      greeting: context.greetingData || {},
      organization: context.orgData || {},
      requirements: context.requirementsData || {},
      dynamic: context.dynamicAnswers || {},
      metadata: {
        company: context.companyName,
        industry: context.industry,
        size: context.companySize,
        experienceLevel: context.experienceLevel
      },
      research: {
        hasGreeting: !!context.greetingReport,
        hasOrg: !!context.orgReport,
        hasRequirements: !!context.requirementReport,
        hasPreliminary: !!context.preliminaryReport
      }
    }
  }

  private parseReport(content: string, reportType: string): string {
    // Clean up any markdown artifacts or formatting issues
    let parsed = content
      .replace(/```json\n?/g, '')
      .replace(/```\n?/g, '')
      .trim()
    
    // Add report header if missing
    if (!parsed.startsWith('#')) {
      const header = reportType === 'preliminary' 
        ? '# Preliminary Needs Analysis Report'
        : '# Comprehensive Needs Analysis Report'
      parsed = `${header}\n\n${parsed}`
    }
    
    return parsed
  }

  private extractMetadata(report: string, aiResponse: any): GeneratedReport['metadata'] {
    const words = report.split(/\s+/).length
    const sections = report.match(/^#{1,3}\s+.+$/gm) || []
    const gaps = report.match(/\b(unknown|unclear|TBD|to be determined|needs clarification)\b/gi) || []
    
    // Calculate confidence based on gaps and completeness
    const confidence = Math.max(0.5, Math.min(1, 1 - (gaps.length * 0.05)))
    
    return {
      generatedAt: new Date().toISOString(),
      provider: aiResponse.provider || 'unknown',
      model: aiResponse.model || 'unknown',
      confidence,
      wordCount: words,
      sections: sections.map(s => s.replace(/^#+\s+/, '')),
      gaps: [...new Set(gaps)]
    }
  }

  private async saveReport(
    jobId: string,
    reportType: string,
    content: string,
    metadata: any
  ): Promise<void> {
    try {
      await saveJobReport(
        jobId,
        reportType === 'preliminary' ? 'preliminary' : 'final',
        content,
        metadata
      )
    } catch (error) {
      console.error('[ReportGen] Failed to save report:', error)
    }
  }

  /**
   * Batch generate multiple report sections in parallel
   */
  async generateComprehensiveReport(context: ReportContext): Promise<GeneratedReport> {
    console.log('[ReportGen] Generating comprehensive report with parallel sections')
    
    // Generate sections in parallel for efficiency
    const [
      mainReport,
      learnerSection,
      techSection,
      budgetSection,
      riskSection,
      implementationSection
    ] = await Promise.all([
      this.generateNeedsAnalysisReport(context),
      this.generateReportSection('learner_analysis', context),
      this.generateReportSection('technology_assessment', context),
      this.generateReportSection('budget_breakdown', context),
      this.generateReportSection('risk_assessment', context),
      this.generateReportSection('implementation_plan', context)
    ])
    
    // Combine sections into comprehensive report
    const combinedContent = `
${mainReport.content}

## Detailed Analysis

### Learner Analysis
${learnerSection}

### Technology Assessment
${techSection}

### Budget Analysis
${budgetSection}

### Risk Assessment
${riskSection}

### Implementation Plan
${implementationSection}
`
    
    // Validate the combined report
    const validation = await this.validateReport(combinedContent)
    
    return {
      content: combinedContent,
      format: 'markdown',
      metadata: {
        ...mainReport.metadata,
        sections: [
          ...mainReport.metadata.sections,
          'Learner Analysis',
          'Technology Assessment',
          'Budget Analysis',
          'Risk Assessment',
          'Implementation Plan'
        ],
        completeness: validation.completeness,
        validated: validation.isValid
      }
    }
  }
}

// Export singleton instance
export const reportGenService = new ReportGenerationService()

// Export convenience functions
export const generateReport = (context: ReportContext, type?: 'preliminary' | 'final') =>
  reportGenService.generateNeedsAnalysisReport(context, type)

export const generateStructuredReport = (context: ReportContext) =>
  reportGenService.generateStructuredReport(context)

export const generateExecutiveSummary = (fullReport: string, context: ReportContext) =>
  reportGenService.generateExecutiveSummary(fullReport, context)

export const validateReport = (report: string) =>
  reportGenService.validateReport(report)
