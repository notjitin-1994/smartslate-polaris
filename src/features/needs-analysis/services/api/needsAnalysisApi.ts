import { supabase } from '@/lib/supabaseClient'
import type {
  NeedsProject,
  NeedsProjectInsert,
  NeedsProjectUpdate,
  ProjectWithRelations,
  DiagnosticResult,
} from '../../types'

/**
 * API client for needs analysis endpoints
 * Uses Supabase auth token for authentication
 */
export class NeedsAnalysisApi {
  private static async getAuthToken(): Promise<string> {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.access_token) {
      throw new Error('No authentication token available')
    }
    return session.access_token
  }

  private static async request<T>(
    path: string,
    options: RequestInit = {}
  ): Promise<T> {
    const token = await this.getAuthToken()
    const baseUrl = import.meta.env.VITE_SITE_URL || window.location.origin
    
    const response = await fetch(`${baseUrl}/api/needs${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        ...options.headers,
      },
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Request failed' }))
      throw new Error(error.error || `HTTP ${response.status}`)
    }

    // Handle 204 No Content
    if (response.status === 204) {
      return null as any
    }

    return response.json()
  }

  // Project endpoints
  static async listProjects(): Promise<NeedsProject[]> {
    const data = await this.request<{ projects: NeedsProject[] }>('/projects')
    return data.projects
  }

  static async createProject(project: NeedsProjectInsert): Promise<NeedsProject> {
    const data = await this.request<{ project: NeedsProject }>('/projects', {
      method: 'POST',
      body: JSON.stringify(project),
    })
    return data.project
  }

  static async getProject(id: string): Promise<ProjectWithRelations> {
    return this.request<ProjectWithRelations>(`/projects/${id}`)
  }

  static async updateProject(id: string, updates: NeedsProjectUpdate): Promise<NeedsProject> {
    const data = await this.request<{ project: NeedsProject }>(`/projects/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    })
    return data.project
  }

  static async deleteProject(id: string): Promise<void> {
    await this.request(`/projects/${id}`, {
      method: 'DELETE',
    })
  }

  // Analysis endpoints
  static async analyzeProject(id: string): Promise<DiagnosticResult> {
    return this.request<DiagnosticResult>(`/projects/${id}/analyze`, {
      method: 'POST',
    })
  }

  static async generateRecommendation(id: string, data: any): Promise<any> {
    return this.request(`/projects/${id}/recommend`, {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  static async getReport(id: string): Promise<string> {
    const response = await fetch(`/api/needs/projects/${id}/report`, {
      headers: {
        'Authorization': `Bearer ${await this.getAuthToken()}`,
      },
    })
    
    if (!response.ok) {
      throw new Error(`Failed to get report: ${response.status}`)
    }
    
    return response.text()
  }

  static async approveProject(id: string): Promise<void> {
    await this.request(`/projects/${id}/approve`, {
      method: 'POST',
    })
  }

  // Helper endpoints for related entities
  static async addStakeholder(projectId: string, stakeholder: any): Promise<any> {
    return this.request(`/projects/${projectId}/stakeholders`, {
      method: 'POST',
      body: JSON.stringify(stakeholder),
    })
  }

  static async addAudience(projectId: string, audience: any): Promise<any> {
    return this.request(`/projects/${projectId}/audiences`, {
      method: 'POST',
      body: JSON.stringify(audience),
    })
  }

  static async addTask(projectId: string, task: any): Promise<any> {
    return this.request(`/projects/${projectId}/tasks`, {
      method: 'POST',
      body: JSON.stringify(task),
    })
  }
}
