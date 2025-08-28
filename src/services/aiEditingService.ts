import { getSupabase } from '@/lib/supabaseClient'
import { callLLM } from './llmClient'
import type { EditRequest } from '@/components/AIReportEditor'

export interface AIEditSession {
  id: string
  summary_id: string
  user_id: string
  edit_history: EditRequest[]
  total_edits: number
  created_at: string
  updated_at: string
}

export interface AIEditLimit {
  user_id: string
  summary_id: string
  edits_used: number
  max_edits: number
  reset_at?: string
}

class AIEditingService {
  private supabase = getSupabase()

  /**
   * Get or create an edit session for a summary
   */
  async getOrCreateEditSession(summaryId: string): Promise<AIEditSession | null> {
    const { data: { user } } = await this.supabase.auth.getUser()
    if (!user) return null

    try {
      // First try to get existing session
      const { data: existingSession, error: fetchError } = await this.supabase
        .from('ai_edit_sessions')
        .select('*')
        .eq('summary_id', summaryId)
        .eq('user_id', user.id)
        .single()

      if (existingSession && !fetchError) {
        return existingSession as AIEditSession
      }

      // Create new session if none exists
      const { data: newSession, error: createError } = await this.supabase
        .from('ai_edit_sessions')
        .insert({
          summary_id: summaryId,
          user_id: user.id,
          edit_history: [],
          total_edits: 0
        })
        .select()
        .single()

      if (createError) {
        console.error('Failed to create edit session:', createError)
        return null
      }

      return newSession as AIEditSession
    } catch (error) {
      console.error('Error managing edit session:', error)
      return null
    }
  }

  /**
   * Save an edit to the session history
   */
  async saveEdit(
    summaryId: string,
    edit: EditRequest
  ): Promise<{ success: boolean; error?: string }> {
    const { data: { user } } = await this.supabase.auth.getUser()
    if (!user) return { success: false, error: 'User not authenticated' }

    try {
      // Get current session
      const session = await this.getOrCreateEditSession(summaryId)
      if (!session) {
        return { success: false, error: 'Could not create edit session' }
      }

      // Update session with new edit
      const updatedHistory = [...(session.edit_history || []), edit]
      const completedEdits = updatedHistory.filter(e => e.status === 'completed').length

      const { error: updateError } = await this.supabase
        .from('ai_edit_sessions')
        .update({
          edit_history: updatedHistory,
          total_edits: completedEdits,
          updated_at: new Date().toISOString()
        })
        .eq('id', session.id)

      if (updateError) {
        console.error('Failed to save edit:', updateError)
        return { success: false, error: 'Failed to save edit to database' }
      }

      return { success: true }
    } catch (error) {
      console.error('Error saving edit:', error)
      return { success: false, error: 'An unexpected error occurred' }
    }
  }

  /**
   * Get edit limits for a user and summary
   */
  async getEditLimits(summaryId: string): Promise<AIEditLimit | null> {
    const { data: { user } } = await this.supabase.auth.getUser()
    if (!user) return null

    try {
      // Get session to check edits used
      const session = await this.getOrCreateEditSession(summaryId)
      if (!session) return null

      const editsUsed = session.edit_history?.filter(e => e.status === 'completed').length || 0

      return {
        user_id: user.id,
        summary_id: summaryId,
        edits_used: editsUsed,
        max_edits: 3 // Default limit
      }
    } catch (error) {
      console.error('Error getting edit limits:', error)
      return null
    }
  }

  /**
   * Process an AI edit request with Claude
   */
  async processEdit(
    currentContent: string,
    userRequest: string,
    context: {
      greetingReport?: string
      orgReport?: string
      requirementReport?: string
    }
  ): Promise<{ 
    success: boolean
    explanation?: string
    editedContent?: string
    error?: string 
  }> {
    try {
      const systemPrompt = `You are an expert report editor helping to refine and improve a needs analysis report. 
      You have access to the following context:
      
      ${context.greetingReport ? `ORIGINAL RESEARCH - Greeting/Context:
      ${context.greetingReport}
      
      ` : ''}${context.orgReport ? `ORIGINAL RESEARCH - Organization Analysis:
      ${context.orgReport}
      
      ` : ''}${context.requirementReport ? `ORIGINAL RESEARCH - Requirements:
      ${context.requirementReport}
      
      ` : ''}CURRENT REPORT CONTENT:
      ${currentContent}
      
      CRITICAL INSTRUCTIONS:
      1. You MUST return the COMPLETE report with ALL sections
      2. NEVER remove any sections, even if editing only one part
      3. MAINTAIN the exact section headers (## Executive Summary, ## Organization & Audience, ## Business Objectives & Requirements, etc.)
      4. PRESERVE all markdown formatting including:
         - Section headers with ## 
         - Subsection headers with ###
         - Bold text with **
         - Bullet points with -
         - Numbered lists
      5. Only modify the specific content requested by the user
      6. Keep all other content exactly as it is
      
      The user has requested the following edit. Make the requested changes while:
      - Maintaining consistency with the research context
      - Preserving the overall structure and flow
      - Ensuring accuracy and professionalism
      - Being specific and actionable
      - Using proper markdown formatting
      
      IMPORTANT: Return your response in this exact JSON format (no other text):
      {
        "explanation": "Brief explanation of the changes made (1-2 sentences)",
        "editedContent": "The COMPLETE edited report content with ALL sections intact, properly formatted in markdown"
      }`

      const userPrompt = `Edit Request: ${userRequest}
      
      REMEMBER: 
      - Return the ENTIRE report with all sections
      - Only modify the parts mentioned in the edit request
      - Keep all section headers exactly as they are (## Executive Summary, ## Organization & Audience, ## Business Objectives & Requirements, etc.)
      - Do not remove or rename any sections
      - Maintain all markdown formatting
      
      Please make the requested changes to the report and return the COMPLETE edited version in the specified JSON format.`

      const response = await callLLM([
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ], {
        temperature: 0.2, // Lower temperature for more consistent formatting
        maxTokens: 12000 // Increased to ensure complete report is returned
      })

      // Parse response
      try {
        // Try to extract JSON from response
        const jsonMatch = response.content.match(/\{[\s\S]*\}/)
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0])
          
          // Validate response structure
          if (!parsed.explanation || !parsed.editedContent) {
            throw new Error('Invalid response structure')
          }
          
          // Validate that the edited content contains expected sections
          const editedContent = parsed.editedContent as string
          const requiredSections = ['## Executive Summary', '## Organization & Audience']
          const missingSections = requiredSections.filter(section => !editedContent.includes(section))
          
          if (missingSections.length > 0) {
            console.error('AI response missing required sections:', missingSections)
            // Try to recover by using the original content with a warning
            return {
              success: false,
              error: `The AI response was incomplete. Missing sections: ${missingSections.join(', ')}. Please try your edit again with a more specific request.`
            }
          }
          
          // Validate that the edited content is not significantly shorter than original
          // (to catch cases where AI might have truncated the response)
          const originalLength = currentContent.length
          const editedLength = editedContent.length
          if (editedLength < originalLength * 0.5) {
            console.error('AI response appears truncated. Original length:', originalLength, 'Edited length:', editedLength)
            return {
              success: false,
              error: 'The AI response appears to be incomplete. Please try your edit again.'
            }
          }
          
          return {
            success: true,
            explanation: parsed.explanation,
            editedContent: parsed.editedContent
          }
        } else {
          throw new Error('No JSON found in response')
        }
      } catch (parseError) {
        console.error('Failed to parse AI response:', parseError)
        
        // Fallback: if the response looks like markdown, use it as the edited content
        if (response.content.includes('#') || response.content.includes('**')) {
          return {
            success: true,
            explanation: 'Changes applied as requested.',
            editedContent: response.content
          }
        }
        
        return {
          success: false,
          error: 'Failed to parse AI response. Please try again.'
        }
      }
    } catch (error: any) {
      console.error('AI edit processing failed:', error)
      return {
        success: false,
        error: error.message || 'Failed to process edit request'
      }
    }
  }

  /**
   * Get edit history for a summary
   */
  async getEditHistory(summaryId: string): Promise<EditRequest[]> {
    const session = await this.getOrCreateEditSession(summaryId)
    return session?.edit_history || []
  }

  /**
   * Clear edit history for a summary (admin only)
   */
  async clearEditHistory(summaryId: string): Promise<{ success: boolean; error?: string }> {
    const { data: { user } } = await this.supabase.auth.getUser()
    if (!user) return { success: false, error: 'User not authenticated' }

    try {
      const { error } = await this.supabase
        .from('ai_edit_sessions')
        .update({
          edit_history: [],
          total_edits: 0,
          updated_at: new Date().toISOString()
        })
        .eq('summary_id', summaryId)
        .eq('user_id', user.id)

      if (error) {
        console.error('Failed to clear edit history:', error)
        return { success: false, error: 'Failed to clear edit history' }
      }

      return { success: true }
    } catch (error) {
      console.error('Error clearing edit history:', error)
      return { success: false, error: 'An unexpected error occurred' }
    }
  }
}

// Export singleton instance
export const aiEditingService = new AIEditingService()
