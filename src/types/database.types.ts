export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      starmaps_master: {
        Row: {
          id: string
          user_id: string
          starmap_job_id: string
          title: string | null
          description: string | null
          static_questions: Json | null
          static_answers: Json | null
          dynamic_questions_prompt: string | null
          dynamic_questions: Json | null
          dynamic_answers: Json | null
          final_prompt: string | null
          final_report: string | null
          preliminary_report: string | null
          report_format: 'standard' | 'detailed' | 'executive' | 'technical'
          report_length: number | null
          report_sections: Json | null
          tags: string[] | null
          category: string | null
          industry: string | null
          progress_percentage: number | null
          current_step: string | null
          steps_completed: Json | null
          error_message: string | null
          error_details: Json | null
          status:
            | 'draft'
            | 'in_progress'
            | 'generating_static_questions'
            | 'awaiting_static_answers'
            | 'generating_dynamic_questions'
            | 'awaiting_dynamic_answers'
            | 'generating_report'
            | 'review'
            | 'completed'
            | 'failed'
            | 'cancelled'
            | 'archived'
          created_at: string
          updated_at: string
          started_at: string | null
          completed_at: string | null
          last_accessed_at: string | null
          version: number | null
          parent_starmap_id: string | null
          is_published: boolean | null
          published_at: string | null
          total_questions_count: number | null
          answered_questions_count: number | null
          completion_time_seconds: number | null
          ai_model: string | null
          ai_model_version: string | null
          total_tokens_used: number | null
          metadata: Json | null
        }
        Insert: {
          id?: string
          user_id: string
          starmap_job_id: string
          title?: string | null
          description?: string | null
          static_questions?: Json | null
          static_answers?: Json | null
          dynamic_questions_prompt?: string | null
          dynamic_questions?: Json | null
          dynamic_answers?: Json | null
          final_prompt?: string | null
          final_report?: string | null
          preliminary_report?: string | null
          report_format?: 'standard' | 'detailed' | 'executive' | 'technical'
          report_length?: number | null
          report_sections?: Json | null
          tags?: string[] | null
          category?: string | null
          industry?: string | null
          progress_percentage?: number | null
          current_step?: string | null
          steps_completed?: Json | null
          error_message?: string | null
          error_details?: Json | null
          status?:
            | 'draft'
            | 'in_progress'
            | 'generating_static_questions'
            | 'awaiting_static_answers'
            | 'generating_dynamic_questions'
            | 'awaiting_dynamic_answers'
            | 'generating_report'
            | 'review'
            | 'completed'
            | 'failed'
            | 'cancelled'
            | 'archived'
          created_at?: string
          updated_at?: string
          started_at?: string | null
          completed_at?: string | null
          last_accessed_at?: string | null
          version?: number | null
          parent_starmap_id?: string | null
          is_published?: boolean | null
          published_at?: string | null
          total_questions_count?: number | null
          answered_questions_count?: number | null
          completion_time_seconds?: number | null
          ai_model?: string | null
          ai_model_version?: string | null
          total_tokens_used?: number | null
          metadata?: Json | null
        }
        Update: {
          id?: string
          user_id?: string
          starmap_job_id?: string
          title?: string | null
          description?: string | null
          static_questions?: Json | null
          static_answers?: Json | null
          dynamic_questions_prompt?: string | null
          dynamic_questions?: Json | null
          dynamic_answers?: Json | null
          final_prompt?: string | null
          final_report?: string | null
          preliminary_report?: string | null
          report_format?: 'standard' | 'detailed' | 'executive' | 'technical'
          report_length?: number | null
          report_sections?: Json | null
          tags?: string[] | null
          category?: string | null
          industry?: string | null
          progress_percentage?: number | null
          current_step?: string | null
          steps_completed?: Json | null
          error_message?: string | null
          error_details?: Json | null
          status?:
            | 'draft'
            | 'in_progress'
            | 'generating_static_questions'
            | 'awaiting_static_answers'
            | 'generating_dynamic_questions'
            | 'awaiting_dynamic_answers'
            | 'generating_report'
            | 'review'
            | 'completed'
            | 'failed'
            | 'cancelled'
            | 'archived'
          created_at?: string
          updated_at?: string
          started_at?: string | null
          completed_at?: string | null
          last_accessed_at?: string | null
          version?: number | null
          parent_starmap_id?: string | null
          is_published?: boolean | null
          published_at?: string | null
          total_questions_count?: number | null
          answered_questions_count?: number | null
          completion_time_seconds?: number | null
          ai_model?: string | null
          ai_model_version?: string | null
          total_tokens_used?: number | null
          metadata?: Json | null
        }
      }
      profiles: {
        Row: {
          id: string
          username: string | null
          full_name: string | null
          job_title: string | null
          company: string | null
          website: string | null
          location: string | null
          country: string | null
          bio: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          username?: string | null
          full_name?: string | null
          job_title?: string | null
          company?: string | null
          website?: string | null
          location?: string | null
          country?: string | null
          bio?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          username?: string | null
          full_name?: string | null
          job_title?: string | null
          company?: string | null
          website?: string | null
          location?: string | null
          country?: string | null
          bio?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      polaris_summaries: {
        Row: {
          id: string
          user_id: string
          company_name: string | null
          report_title: string | null
          summary_content: string
          stage1_answers: Json
          stage2_answers: Json
          stage3_answers: Json
          stage2_questions: Json
          stage3_questions: Json
          greeting_report: string | null
          org_report: string | null
          requirement_report: string | null
          prelim_report: string | null
          dynamic_questionnaire_report: string | null
          edited_content: string | null
          is_edited: boolean
          last_edited_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          company_name?: string | null
          report_title?: string | null
          summary_content: string
          stage1_answers: Json
          stage2_answers: Json
          stage3_answers: Json
          stage2_questions: Json
          stage3_questions: Json
          greeting_report?: string | null
          org_report?: string | null
          requirement_report?: string | null
          prelim_report?: string | null
          dynamic_questionnaire_report?: string | null
          edited_content?: string | null
          is_edited?: boolean
          last_edited_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          company_name?: string | null
          report_title?: string | null
          summary_content?: string
          stage1_answers?: Json
          stage2_answers?: Json
          stage3_answers?: Json
          stage2_questions?: Json
          stage3_questions?: Json
          greeting_report?: string | null
          org_report?: string | null
          requirement_report?: string | null
          prelim_report?: string | null
          dynamic_questionnaire_report?: string | null
          edited_content?: string | null
          is_edited?: boolean
          last_edited_at?: string | null
          created_at?: string
        }
      }
      discovery_sessions: {
        Row: {
          id: string
          user_id: string
          starmap_job_id: string
          session_title: string | null
          company_name: string | null
          status: 'draft' | 'in_progress' | 'completed' | 'failed'
          created_at: string
          updated_at: string
          completed_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          starmap_job_id: string
          session_title?: string | null
          company_name?: string | null
          status?: 'draft' | 'in_progress' | 'completed' | 'failed'
          created_at?: string
          updated_at?: string
          completed_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          starmap_job_id?: string
          session_title?: string | null
          company_name?: string | null
          status?: 'draft' | 'in_progress' | 'completed' | 'failed'
          created_at?: string
          updated_at?: string
          completed_at?: string | null
        }
      }
      discovery_prompts: {
        Row: {
          id: string
          session_id: string
          prompt_type: 'initial_research' | 'dynamic_questions' | 'final_report'
          prompt_text: string
          ai_provider: string | null
          ai_model: string | null
          prompt_tokens: number | null
          created_at: string
        }
        Insert: {
          id?: string
          session_id: string
          prompt_type: 'initial_research' | 'dynamic_questions' | 'final_report'
          prompt_text: string
          ai_provider?: string | null
          ai_model?: string | null
          prompt_tokens?: number | null
          created_at?: string
        }
        Update: {
          id?: string
          session_id?: string
          prompt_type?: 'initial_research' | 'dynamic_questions' | 'final_report'
          prompt_text?: string
          ai_provider?: string | null
          ai_model?: string | null
          prompt_tokens?: number | null
          created_at?: string
        }
      }
      discovery_responses: {
        Row: {
          id: string
          session_id: string
          prompt_id: string
          response_type: 'research_data' | 'dynamic_questions' | 'final_report'
          response_text: string
          response_json: Json | null
          ai_provider: string | null
          ai_model: string | null
          response_tokens: number | null
          processing_time_ms: number | null
          created_at: string
        }
        Insert: {
          id?: string
          session_id: string
          prompt_id: string
          response_type: 'research_data' | 'dynamic_questions' | 'final_report'
          response_text: string
          response_json?: Json | null
          ai_provider?: string | null
          ai_model?: string | null
          response_tokens?: number | null
          processing_time_ms?: number | null
          created_at?: string
        }
        Update: {
          id?: string
          session_id?: string
          prompt_id?: string
          response_type?: 'research_data' | 'dynamic_questions' | 'final_report'
          response_text?: string
          response_json?: Json | null
          ai_provider?: string | null
          ai_model?: string | null
          response_tokens?: number | null
          processing_time_ms?: number | null
          created_at?: string
        }
      }
      discovery_dynamic_qa: {
        Row: {
          id: string
          session_id: string
          question_stage: string
          question_id: string
          question_text: string
          question_type: 'text' | 'select' | 'multiselect' | 'boolean' | 'slider' | 'textarea'
          question_options: Json | null
          answer_value: Json | null
          answered_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          session_id: string
          question_stage: string
          question_id: string
          question_text: string
          question_type: 'text' | 'select' | 'multiselect' | 'boolean' | 'slider' | 'textarea'
          question_options?: Json | null
          answer_value?: Json | null
          answered_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          session_id?: string
          question_stage?: string
          question_id?: string
          question_text?: string
          question_type?: 'text' | 'select' | 'multiselect' | 'boolean' | 'slider' | 'textarea'
          question_options?: Json | null
          answer_value?: Json | null
          answered_at?: string | null
          created_at?: string
        }
      }
      polaris_summaries: {
        Row: {
          id: string
          user_id: string
          company_name: string | null
          report_title: string | null
          summary_content: string
          stage1_answers: Json
          stage2_answers: Json
          stage3_answers: Json
          stage2_questions: Json
          stage3_questions: Json
          greeting_report: string | null
          org_report: string | null
          requirement_report: string | null
          prelim_report: string | null
          dynamic_questionnaire_report: string | null
          edited_content: string | null
          is_edited: boolean
          last_edited_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          company_name?: string | null
          report_title?: string | null
          summary_content: string
          stage1_answers: Json
          stage2_answers: Json
          stage3_answers: Json
          stage2_questions: Json
          stage3_questions: Json
          greeting_report?: string | null
          org_report?: string | null
          requirement_report?: string | null
          prelim_report?: string | null
          dynamic_questionnaire_report?: string | null
          edited_content?: string | null
          is_edited?: boolean
          last_edited_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          company_name?: string | null
          report_title?: string | null
          summary_content?: string
          stage1_answers?: Json
          stage2_answers?: Json
          stage3_answers?: Json
          stage2_questions?: Json
          stage3_questions?: Json
          greeting_report?: string | null
          org_report?: string | null
          requirement_report?: string | null
          prelim_report?: string | null
          dynamic_questionnaire_report?: string | null
          edited_content?: string | null
          is_edited?: boolean
          last_edited_at?: string | null
          created_at?: string
        }
      }
    }
    Views: {
      starmaps_master_summary: {
        Row: {
          id: string
          user_id: string
          starmap_job_id: string
          title: string | null
          description: string | null
          status:
            | 'draft'
            | 'in_progress'
            | 'generating_static_questions'
            | 'awaiting_static_answers'
            | 'generating_dynamic_questions'
            | 'awaiting_dynamic_answers'
            | 'generating_report'
            | 'review'
            | 'completed'
            | 'failed'
            | 'cancelled'
            | 'archived'
          progress_percentage: number | null
          total_questions_count: number | null
          answered_questions_count: number | null
          created_at: string
          updated_at: string
          completed_at: string | null
          is_published: boolean | null
          tags: string[] | null
          category: string | null
        }
      }
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
  }
}
