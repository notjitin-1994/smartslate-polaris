// Stub functions for removed backend services
// These provide basic interfaces for frontend components that previously relied on backend services

export type StarmapJob = {
  id: string
  title: string
  status: string
  created_at: string
  // Add other fields as needed by frontend components
}

export type PolarisSummary = {
  id: string
  title: string
  content: string
  created_at: string
  // Add other fields as needed by frontend components
}

export type ReportJob = {
  id: string
  status: string
  created_at: string
  // Add other fields as needed by frontend components
}

// Stub functions that return empty data or throw not implemented errors
export const getStarmapJob = async (id: string): Promise<StarmapJob | null> => {
  console.warn('Backend service removed: getStarmapJob')
  return null
}

export const getUserStarmapJobsPaginated = async (page: number, pageSize: number, status?: string, search?: string) => {
  console.warn('Backend service removed: getUserStarmapJobsPaginated')
  return { data: [], error: null, count: 0 }
}

export const getStarmapJobStats = async () => {
  console.warn('Backend service removed: getStarmapJobStats')
  return { data: { total: 0, in_progress: 0, completed: 0, failed: 0 }, error: null }
}

export const deleteStarmapJob = async (id: string) => {
  console.warn('Backend service removed: deleteStarmapJob')
  return { error: null }
}

export const saveJobReport = async (id: string, report: string): Promise<void> => {
  console.warn('Backend service removed: saveJobReport')
}

export const getSummaryById = async (id: string): Promise<PolarisSummary | null> => {
  console.warn('Backend service removed: getSummaryById')
  return null
}

export const saveSummary = async (summary: Partial<PolarisSummary>): Promise<PolarisSummary> => {
  console.warn('Backend service removed: saveSummary')
  throw new Error('Backend service not available')
}

export const getAllSummaries = async (): Promise<PolarisSummary[]> => {
  console.warn('Backend service removed: getAllSummaries')
  return []
}

export const deleteSummary = async (id: string): Promise<void> => {
  console.warn('Backend service removed: deleteSummary')
}

export const getUserSummaryCount = async (): Promise<number> => {
  console.warn('Backend service removed: getUserSummaryCount')
  return 0
}

export const getUserCreatedCount = async (): Promise<number> => {
  console.warn('Backend service removed: getUserCreatedCount')
  return 0
}

export const getUserReportJobs = async (): Promise<ReportJob[]> => {
  console.warn('Backend service removed: getUserReportJobs')
  return []
}

export const getJobStatistics = async () => {
  console.warn('Backend service removed: getJobStatistics')
  return { total: 0, pending: 0, completed: 0, failed: 0 }
}

export const cancelReportJob = async (id: string): Promise<void> => {
  console.warn('Backend service removed: cancelReportJob')
}

export const callLLM = async (messages: any[], config?: any): Promise<string> => {
  console.warn('Backend service removed: callLLM')
  throw new Error('LLM service not available in frontend-only mode')
}

export const getReportPublicStatus = async (id: string): Promise<boolean> => {
  console.warn('Backend service removed: getReportPublicStatus')
  return false
}

export const toggleReportPublicStatus = async (id: string): Promise<boolean> => {
  console.warn('Backend service removed: toggleReportPublicStatus')
  return false
}

export const getStarmapPublicStatus = async (id: string): Promise<boolean> => {
  console.warn('Backend service removed: getStarmapPublicStatus')
  return false
}

export const toggleStarmapPublicStatus = async (id: string): Promise<boolean> => {
  console.warn('Backend service removed: toggleStarmapPublicStatus')
  return false
}

export const updateSummaryFinalContent = async (id: string, content: string): Promise<void> => {
  console.warn('Backend service removed: updateSummaryFinalContent')
}

// Constants that were previously in backend services
export const CREATION_LIMIT = 10
export const SAVED_LIMIT = 50

// AI Editing Service stub
export const aiEditingService = {
  editContent: async (content: string, instruction: string): Promise<string> => {
    console.warn('Backend service removed: aiEditingService.editContent')
    throw new Error('AI editing service not available in frontend-only mode')
  }
}

// Other stub functions as needed
export const getPolarisDataFromPage = async (url: string): Promise<any> => {
  console.warn('Backend service removed: getPolarisDataFromPage')
  return null
}

export const regenerateStarmapFinalReportWithContext = async (...args: any[]): Promise<string> => {
  console.warn('Backend service removed: regenerateStarmapFinalReportWithContext')
  throw new Error('Report generation service not available in frontend-only mode')
}

export const buildComprehensiveReportPrompt = (...args: any[]): string => {
  console.warn('Backend service removed: buildComprehensiveReportPrompt')
  return ''
}
