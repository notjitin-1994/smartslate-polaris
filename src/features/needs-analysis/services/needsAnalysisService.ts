import { supabase } from '@/lib/supabaseClient'
import type {
  NeedsProject,
  NeedsProjectInsert,
  NeedsProjectUpdate,
  NeedsStakeholder,
  NeedsStakeholderInsert,
  NeedsAudience,
  NeedsAudienceInsert,
  NeedsTaskItem,
  NeedsTaskItemInsert,
  NeedsRecommendation,
  NeedsRecommendationInsert,
  NeedsBlendItem,
  NeedsBlendItemInsert,
  NeedsEstimate,
  NeedsEstimateInsert,
  NeedsRisk,
  NeedsRiskInsert,
  NeedsArtifact,
  NeedsArtifactInsert,
  ProjectWithRelations,
} from '../types'

export class NeedsAnalysisService {
  // Project CRUD operations
  static async createProject(data: NeedsProjectInsert): Promise<NeedsProject> {
    const { data: project, error } = await supabase
      .from('needs_projects')
      .insert(data)
      .select()
      .single()
    
    if (error) throw error
    return project
  }

  static async getProject(id: string): Promise<NeedsProject | null> {
    const { data, error } = await supabase
      .from('needs_projects')
      .select('*')
      .eq('id', id)
      .single()
    
    if (error && error.code !== 'PGRST116') throw error
    return data
  }

  static async getProjectWithRelations(id: string): Promise<ProjectWithRelations | null> {
    const [
      projectResult,
      stakeholdersResult,
      audiencesResult,
      tasksResult,
      recommendationResult,
      estimateResult,
      risksResult,
      artifactsResult,
    ] = await Promise.all([
      supabase.from('needs_projects').select('*').eq('id', id).single(),
      supabase.from('needs_stakeholders').select('*').eq('project_id', id),
      supabase.from('needs_audiences').select('*').eq('project_id', id),
      supabase.from('needs_task_items').select('*').eq('project_id', id),
      supabase.from('needs_recommendations').select('*').eq('project_id', id).single(),
      supabase.from('needs_estimates').select('*').eq('project_id', id).single(),
      supabase.from('needs_risks').select('*').eq('project_id', id),
      supabase.from('needs_artifacts').select('*').eq('project_id', id),
    ])

    if (projectResult.error && projectResult.error.code !== 'PGRST116') {
      throw projectResult.error
    }

    if (!projectResult.data) return null

    // Get blend items if recommendation exists
    let blendItems: NeedsBlendItem[] = []
    if (recommendationResult.data) {
      const { data } = await supabase
        .from('needs_blend_items')
        .select('*')
        .eq('recommendation_id', recommendationResult.data.id)
        .order('order_index')
      
      blendItems = data || []
    }

    return {
      project: projectResult.data,
      stakeholders: stakeholdersResult.data || [],
      audiences: audiencesResult.data || [],
      tasks: tasksResult.data || [],
      recommendation: recommendationResult.data,
      blendItems,
      estimate: estimateResult.data,
      risks: risksResult.data || [],
      artifacts: artifactsResult.data || [],
    }
  }

  static async listProjects(userId: string): Promise<NeedsProject[]> {
    const { data, error } = await supabase
      .from('needs_projects')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
    
    if (error) throw error
    return data || []
  }

  static async updateProject(id: string, data: NeedsProjectUpdate): Promise<NeedsProject> {
    const { data: project, error } = await supabase
      .from('needs_projects')
      .update({ ...data, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single()
    
    if (error) throw error
    return project
  }

  static async deleteProject(id: string): Promise<void> {
    const { error } = await supabase
      .from('needs_projects')
      .delete()
      .eq('id', id)
    
    if (error) throw error
  }

  // Stakeholder operations
  static async addStakeholder(data: NeedsStakeholderInsert): Promise<NeedsStakeholder> {
    const { data: stakeholder, error } = await supabase
      .from('needs_stakeholders')
      .insert(data)
      .select()
      .single()
    
    if (error) throw error
    return stakeholder
  }

  static async updateStakeholder(id: string, data: Partial<NeedsStakeholder>): Promise<NeedsStakeholder> {
    const { data: stakeholder, error } = await supabase
      .from('needs_stakeholders')
      .update(data)
      .eq('id', id)
      .select()
      .single()
    
    if (error) throw error
    return stakeholder
  }

  static async deleteStakeholder(id: string): Promise<void> {
    const { error } = await supabase
      .from('needs_stakeholders')
      .delete()
      .eq('id', id)
    
    if (error) throw error
  }

  // Audience operations
  static async addAudience(data: NeedsAudienceInsert): Promise<NeedsAudience> {
    const { data: audience, error } = await supabase
      .from('needs_audiences')
      .insert(data)
      .select()
      .single()
    
    if (error) throw error
    return audience
  }

  static async updateAudience(id: string, data: Partial<NeedsAudience>): Promise<NeedsAudience> {
    const { data: audience, error } = await supabase
      .from('needs_audiences')
      .update(data)
      .eq('id', id)
      .select()
      .single()
    
    if (error) throw error
    return audience
  }

  static async deleteAudience(id: string): Promise<void> {
    const { error } = await supabase
      .from('needs_audiences')
      .delete()
      .eq('id', id)
    
    if (error) throw error
  }

  // Task operations
  static async addTask(data: NeedsTaskItemInsert): Promise<NeedsTaskItem> {
    const { data: task, error } = await supabase
      .from('needs_task_items')
      .insert(data)
      .select()
      .single()
    
    if (error) throw error
    return task
  }

  static async updateTask(id: string, data: Partial<NeedsTaskItem>): Promise<NeedsTaskItem> {
    const { data: task, error } = await supabase
      .from('needs_task_items')
      .update(data)
      .eq('id', id)
      .select()
      .single()
    
    if (error) throw error
    return task
  }

  static async deleteTask(id: string): Promise<void> {
    const { error } = await supabase
      .from('needs_task_items')
      .delete()
      .eq('id', id)
    
    if (error) throw error
  }

  // Recommendation operations
  static async createRecommendation(data: NeedsRecommendationInsert): Promise<NeedsRecommendation> {
    const { data: recommendation, error } = await supabase
      .from('needs_recommendations')
      .insert(data)
      .select()
      .single()
    
    if (error) throw error
    return recommendation
  }

  static async updateRecommendation(id: string, data: Partial<NeedsRecommendation>): Promise<NeedsRecommendation> {
    const { data: recommendation, error } = await supabase
      .from('needs_recommendations')
      .update({ ...data, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single()
    
    if (error) throw error
    return recommendation
  }

  // Blend item operations
  static async addBlendItem(data: NeedsBlendItemInsert): Promise<NeedsBlendItem> {
    const { data: item, error } = await supabase
      .from('needs_blend_items')
      .insert(data)
      .select()
      .single()
    
    if (error) throw error
    return item
  }

  static async updateBlendItem(id: string, data: Partial<NeedsBlendItem>): Promise<NeedsBlendItem> {
    const { data: item, error } = await supabase
      .from('needs_blend_items')
      .update(data)
      .eq('id', id)
      .select()
      .single()
    
    if (error) throw error
    return item
  }

  static async deleteBlendItem(id: string): Promise<void> {
    const { error } = await supabase
      .from('needs_blend_items')
      .delete()
      .eq('id', id)
    
    if (error) throw error
  }

  // Estimate operations
  static async createEstimate(data: NeedsEstimateInsert): Promise<NeedsEstimate> {
    const { data: estimate, error } = await supabase
      .from('needs_estimates')
      .insert(data)
      .select()
      .single()
    
    if (error) throw error
    return estimate
  }

  static async updateEstimate(id: string, data: Partial<NeedsEstimate>): Promise<NeedsEstimate> {
    const { data: estimate, error } = await supabase
      .from('needs_estimates')
      .update(data)
      .eq('id', id)
      .select()
      .single()
    
    if (error) throw error
    return estimate
  }

  // Risk operations
  static async addRisk(data: NeedsRiskInsert): Promise<NeedsRisk> {
    const { data: risk, error } = await supabase
      .from('needs_risks')
      .insert(data)
      .select()
      .single()
    
    if (error) throw error
    return risk
  }

  static async updateRisk(id: string, data: Partial<NeedsRisk>): Promise<NeedsRisk> {
    const { data: risk, error } = await supabase
      .from('needs_risks')
      .update(data)
      .eq('id', id)
      .select()
      .single()
    
    if (error) throw error
    return risk
  }

  static async deleteRisk(id: string): Promise<void> {
    const { error } = await supabase
      .from('needs_risks')
      .delete()
      .eq('id', id)
    
    if (error) throw error
  }

  // Artifact operations
  static async createArtifact(data: NeedsArtifactInsert): Promise<NeedsArtifact> {
    const { data: artifact, error } = await supabase
      .from('needs_artifacts')
      .insert(data)
      .select()
      .single()
    
    if (error) throw error
    return artifact
  }

  static async updateArtifact(id: string, data: Partial<NeedsArtifact>): Promise<NeedsArtifact> {
    const { data: artifact, error } = await supabase
      .from('needs_artifacts')
      .update(data)
      .eq('id', id)
      .select()
      .single()
    
    if (error) throw error
    return artifact
  }

  // Approval operations
  static async approveProject(projectId: string, userId: string): Promise<void> {
    // Update project status
    await this.updateProject(projectId, { status: 'approved' })
    
    // Update latest report artifact
    const { data: artifacts } = await supabase
      .from('needs_artifacts')
      .select('*')
      .eq('project_id', projectId)
      .eq('kind', 'report')
      .order('version', { ascending: false })
      .limit(1)
    
    if (artifacts && artifacts[0]) {
      await this.updateArtifact(artifacts[0].id, {
        approved_at: new Date().toISOString(),
        approved_by: userId,
      })
    }
  }
}
