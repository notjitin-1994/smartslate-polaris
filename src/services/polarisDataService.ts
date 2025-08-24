// Service to access Polaris data from the current page context
export interface PolarisData {
  greetingReport?: string
  orgReport?: string
  requirementReport?: string
  stage1Answers?: Record<string, any>
  stage2Answers?: Record<string, any>
  stage3Answers?: Record<string, any>
  summaryContent?: string
  companyName?: string
  dataSummary?: string
}

// Function to extract data from the current Polaris page context
export function getPolarisDataFromPage(): PolarisData {
  try {
    // Try to get data from localStorage (where Polaris stores its state)
    const stage1Answers = JSON.parse(localStorage.getItem('polaris_stage1') || '{}')
    const stage2Answers = JSON.parse(localStorage.getItem('polaris_stage2') || '{}')
    const stage3Answers = JSON.parse(localStorage.getItem('polaris_stage3') || '{}')
    
    // Check if we're on a Polaris page and can access the data
    let companyName = ''
    let greetingReport = ''
    let orgReport = ''
    let requirementReport = ''
    
    // Try to get company name from various sources
    companyName = stage1Answers.org_name || 
                 stage1Answers.company_name || 
                 stage2Answers.org_name || 
                 stage2Answers.org_industry || 
                 stage1Answers.requester_company || 
                 ''
    
    // Try to get reports from localStorage or other sources
    // Note: Reports are typically stored in React state, not localStorage
    // We'll need to access them differently
    
    return {
      greetingReport,
      orgReport,
      requirementReport,
      stage1Answers,
      stage2Answers,
      stage3Answers,
      companyName,
      summaryContent: stage1Answers.summary_content || stage2Answers.summary_content || ''
    }
  } catch (error) {
    console.warn('Could not gather Polaris data:', error)
    return {}
  }
}

// Function to get Polaris data from saved summaries (if available)
export async function getPolarisDataFromSummary(): Promise<PolarisData> {
  try {
    // This would need to be implemented based on your database access
    // For now, return empty data
    return {}
  } catch (error) {
    console.warn('Could not get Polaris data from summary:', error)
    return {}
  }
}
