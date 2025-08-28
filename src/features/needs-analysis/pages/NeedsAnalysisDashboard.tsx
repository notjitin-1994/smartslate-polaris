import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, FileText, Clock, CheckCircle } from 'lucide-react'
import { NeedsAnalysisFeatureGate } from '../components/FeatureGate'
import { NeedsAnalysisService } from '../services/needsAnalysisService'
import { useAuth } from '@/contexts/AuthContext'
import type { NeedsProject } from '../types'

export function NeedsAnalysisDashboard() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [projects, setProjects] = useState<NeedsProject[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (user) {
      loadProjects()
    }
  }, [user])

  const loadProjects = async () => {
    if (!user) return
    
    setIsLoading(true)
    setError(null)
    
    try {
      const data = await NeedsAnalysisService.listProjects(user.id)
      setProjects(data)
    } catch (err) {
      setError('Failed to load projects')
      console.error(err)
    } finally {
      setIsLoading(false)
    }
  }

  const getStatusIcon = (status?: string) => {
    switch (status) {
      case 'draft':
        return <Clock className="w-4 h-4 text-gray-500" />
      case 'in_progress':
        return <Clock className="w-4 h-4 text-blue-500" />
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-green-500" />
      case 'approved':
        return <CheckCircle className="w-4 h-4 text-green-600" />
      default:
        return <FileText className="w-4 h-4 text-gray-400" />
    }
  }

  const getStatusLabel = (status?: string) => {
    switch (status) {
      case 'draft':
        return 'Draft'
      case 'in_progress':
        return 'In Progress'
      case 'completed':
        return 'Completed'
      case 'approved':
        return 'Approved'
      default:
        return 'Unknown'
    }
  }

  return (
    <NeedsAnalysisFeatureGate redirect="/portal">
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">Needs Analysis</h1>
            <p className="mt-2 text-gray-600">
              Create and manage training needs analysis projects
            </p>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-md">
              {error}
            </div>
          )}

          <div className="mb-6 flex justify-between items-center">
            <h2 className="text-xl font-semibold text-gray-800">Your Projects</h2>
            <button
              onClick={() => navigate('/needs-analysis/new')}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-5 h-5" />
              New Analysis
            </button>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
            </div>
          ) : projects.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
              <FileText className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-4 text-lg font-medium text-gray-900">No projects yet</h3>
              <p className="mt-2 text-gray-600">
                Get started by creating your first needs analysis project
              </p>
              <button
                onClick={() => navigate('/needs-analysis/new')}
                className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Create Project
              </button>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {projects.map((project) => (
                <div
                  key={project.id}
                  onClick={() => navigate(`/needs-analysis/${project.id}`)}
                  className="bg-white p-6 rounded-lg border border-gray-200 hover:shadow-md transition-shadow cursor-pointer"
                >
                  <div className="flex items-start justify-between mb-4">
                    <h3 className="text-lg font-medium text-gray-900 line-clamp-2">
                      {project.title}
                    </h3>
                    <div className="flex items-center gap-2">
                      {getStatusIcon(project.status)}
                      <span className="text-sm text-gray-600">
                        {getStatusLabel(project.status)}
                      </span>
                    </div>
                  </div>
                  
                  {project.business_goal && (
                    <p className="text-sm text-gray-600 line-clamp-3 mb-4">
                      {project.business_goal}
                    </p>
                  )}
                  
                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <span>
                      Created {new Date(project.created_at).toLocaleDateString()}
                    </span>
                    {project.deadline && (
                      <span>
                        Due {new Date(project.deadline).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </NeedsAnalysisFeatureGate>
  )
}
