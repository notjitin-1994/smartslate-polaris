import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

const supabase = createClient(supabaseUrl, supabaseServiceKey)

// Simple training vs non-training analysis
function analyzeTrainingSolution(rootCauses: string[]) {
  const nonTrainingKeywords = ['tools', 'process', 'policy', 'resources', 'motivation', 'environment', 'system']
  const trainingKeywords = ['knowledge', 'skills', 'awareness', 'practice', 'understanding']

  const nonTrainingCount = rootCauses.filter(cause => 
    nonTrainingKeywords.some(keyword => cause.toLowerCase().includes(keyword))
  ).length

  const trainingCount = rootCauses.filter(cause =>
    trainingKeywords.some(keyword => cause.toLowerCase().includes(keyword))
  ).length

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

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')

  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
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

    // Get task items to analyze root causes
    const { data: tasks, error: tasksError } = await supabase
      .from('needs_task_items')
      .select('*')
      .eq('project_id', projectId)

    if (tasksError) throw tasksError

    // Aggregate root causes from all tasks
    const allRootCauses = tasks?.flatMap(task => task.root_causes || []) || []
    
    // Analyze training vs non-training
    const analysis = analyzeTrainingSolution(allRootCauses)

    // Calculate performance gap if we have task data
    let performanceGap = null
    if (tasks && tasks.length > 0) {
      const avgCurrentError = tasks.reduce((sum, task) => sum + (task.current_error_rate || 0), 0) / tasks.length
      const avgTargetError = tasks.reduce((sum, task) => sum + (task.target_error_rate || 0), 0) / tasks.length
      
      performanceGap = {
        current: avgCurrentError,
        target: avgTargetError,
        gap: avgCurrentError - avgTargetError,
      }
    }

    const result = {
      ...analysis,
      performanceGap,
      rootCauses: allRootCauses,
    }

    return res.status(200).json(result)
  } catch (error: any) {
    console.error('API error:', error)
    return res.status(500).json({ error: error.message || 'Internal server error' })
  }
}
