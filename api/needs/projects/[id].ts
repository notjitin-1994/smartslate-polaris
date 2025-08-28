import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

const supabase = createClient(supabaseUrl, supabaseServiceKey)

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, PATCH, DELETE, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')

  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  // Get user from Authorization header
  const authHeader = req.headers.authorization
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  const token = authHeader.substring(7)
  const { data: { user }, error: authError } = await supabase.auth.getUser(token)

  if (authError || !user) {
    return res.status(401).json({ error: 'Invalid token' })
  }

  const projectId = req.query.id as string

  try {
    // Verify user owns the project
    const { data: project, error: projectError } = await supabase
      .from('needs_projects')
      .select('*')
      .eq('id', projectId)
      .eq('user_id', user.id)
      .single()

    if (projectError || !project) {
      return res.status(404).json({ error: 'Project not found' })
    }

    switch (req.method) {
      case 'GET':
        // Get project with all relations
        const [
          stakeholdersResult,
          audiencesResult,
          tasksResult,
          recommendationResult,
          estimateResult,
          risksResult,
          artifactsResult,
        ] = await Promise.all([
          supabase.from('needs_stakeholders').select('*').eq('project_id', projectId),
          supabase.from('needs_audiences').select('*').eq('project_id', projectId),
          supabase.from('needs_task_items').select('*').eq('project_id', projectId),
          supabase.from('needs_recommendations').select('*').eq('project_id', projectId).single(),
          supabase.from('needs_estimates').select('*').eq('project_id', projectId).single(),
          supabase.from('needs_risks').select('*').eq('project_id', projectId),
          supabase.from('needs_artifacts').select('*').eq('project_id', projectId),
        ])

        // Get blend items if recommendation exists
        let blendItems = []
        if (recommendationResult.data) {
          const { data } = await supabase
            .from('needs_blend_items')
            .select('*')
            .eq('recommendation_id', recommendationResult.data.id)
            .order('order_index')
          
          blendItems = data || []
        }

        return res.status(200).json({
          project,
          stakeholders: stakeholdersResult.data || [],
          audiences: audiencesResult.data || [],
          tasks: tasksResult.data || [],
          recommendation: recommendationResult.data,
          blendItems,
          estimate: estimateResult.data,
          risks: risksResult.data || [],
          artifacts: artifactsResult.data || [],
        })

      case 'PATCH':
        // Update project
        const { data: updatedProject, error: updateError } = await supabase
          .from('needs_projects')
          .update({ ...req.body, updated_at: new Date().toISOString() })
          .eq('id', projectId)
          .eq('user_id', user.id)
          .select()
          .single()

        if (updateError) throw updateError
        return res.status(200).json({ project: updatedProject })

      case 'DELETE':
        // Delete project (cascade deletes relations)
        const { error: deleteError } = await supabase
          .from('needs_projects')
          .delete()
          .eq('id', projectId)
          .eq('user_id', user.id)

        if (deleteError) throw deleteError
        return res.status(204).end()

      default:
        return res.status(405).json({ error: 'Method not allowed' })
    }
  } catch (error: any) {
    console.error('API error:', error)
    return res.status(500).json({ error: error.message || 'Internal server error' })
  }
}
