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
          edited_content?: string | null
          is_edited?: boolean
          last_edited_at?: string | null
          created_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
  }
}
