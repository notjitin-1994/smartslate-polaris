/**
 * Database types for needs analysis feature
 * These types match the Supabase schema
 */

export interface NeedsProject {
  id: string
  user_id: string
  title: string
  business_goal?: string
  success_metrics?: Record<string, any>
  deadline?: string // ISO date
  budget_cap?: number
  languages?: string[]
  status?: 'draft' | 'in_progress' | 'completed' | 'approved'
  created_at: string
  updated_at: string
}

export interface NeedsStakeholder {
  id: string
  project_id: string
  name: string
  role: string
  email?: string
  is_approver: boolean
  created_at: string
}

export interface NeedsAudience {
  id: string
  project_id: string
  name: string
  size?: number
  devices?: string[]
  accessibility_needs?: string[]
  locales?: string[]
  created_at: string
}

export interface NeedsTaskItem {
  id: string
  project_id: string
  name: string
  frequency?: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly'
  impact?: 'low' | 'medium' | 'high' | 'critical'
  current_error_rate?: number
  target_error_rate?: number
  root_causes?: string[]
  created_at: string
}

export interface NeedsRecommendation {
  id: string
  project_id: string
  rationale: string
  status?: 'draft' | 'final' | 'approved'
  created_at: string
  updated_at: string
}

export interface NeedsBlendItem {
  id: string
  recommendation_id: string
  type: 'microlearning' | 'guided_practice' | 'job_aid' | 'ilt' | 'vilt' | 'simulation'
  parameters?: Record<string, any>
  order_index?: number
  created_at: string
}

export interface NeedsEstimate {
  id: string
  project_id: string
  assumptions?: Record<string, any>
  effort_hours?: Record<string, number>
  timeline_days?: number
  total_cost?: number
  created_at: string
}

export interface NeedsRisk {
  id: string
  project_id: string
  name: string
  mitigation?: string
  severity?: 'low' | 'medium' | 'high'
  created_at: string
}

export interface NeedsArtifact {
  id: string
  project_id: string
  kind: 'report' | 'sow' | 'charter'
  url?: string
  version?: number
  approved_at?: string
  approved_by?: string
  created_at: string
}

// Insert types (for creating new records)
export type NeedsProjectInsert = Omit<NeedsProject, 'id' | 'created_at' | 'updated_at'>
export type NeedsStakeholderInsert = Omit<NeedsStakeholder, 'id' | 'created_at'>
export type NeedsAudienceInsert = Omit<NeedsAudience, 'id' | 'created_at'>
export type NeedsTaskItemInsert = Omit<NeedsTaskItem, 'id' | 'created_at'>
export type NeedsRecommendationInsert = Omit<NeedsRecommendation, 'id' | 'created_at' | 'updated_at'>
export type NeedsBlendItemInsert = Omit<NeedsBlendItem, 'id' | 'created_at'>
export type NeedsEstimateInsert = Omit<NeedsEstimate, 'id' | 'created_at'>
export type NeedsRiskInsert = Omit<NeedsRisk, 'id' | 'created_at'>
export type NeedsArtifactInsert = Omit<NeedsArtifact, 'id' | 'created_at'>

// Update types (for partial updates)
export type NeedsProjectUpdate = Partial<Omit<NeedsProject, 'id' | 'user_id' | 'created_at'>>
export type NeedsStakeholderUpdate = Partial<Omit<NeedsStakeholder, 'id' | 'project_id' | 'created_at'>>
export type NeedsAudienceUpdate = Partial<Omit<NeedsAudience, 'id' | 'project_id' | 'created_at'>>
export type NeedsTaskItemUpdate = Partial<Omit<NeedsTaskItem, 'id' | 'project_id' | 'created_at'>>
export type NeedsRecommendationUpdate = Partial<Omit<NeedsRecommendation, 'id' | 'project_id' | 'created_at'>>
export type NeedsBlendItemUpdate = Partial<Omit<NeedsBlendItem, 'id' | 'recommendation_id' | 'created_at'>>
export type NeedsEstimateUpdate = Partial<Omit<NeedsEstimate, 'id' | 'project_id' | 'created_at'>>
export type NeedsRiskUpdate = Partial<Omit<NeedsRisk, 'id' | 'project_id' | 'created_at'>>
export type NeedsArtifactUpdate = Partial<Omit<NeedsArtifact, 'id' | 'project_id' | 'created_at'>>
