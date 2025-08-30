-- =============================================
-- Starmaps Master Table Migration
-- =============================================
-- To apply this migration:
-- 1. Copy this SQL to your Supabase SQL Editor
-- 2. Run the migration
-- 3. Verify with: SELECT * FROM starmaps_master LIMIT 1;
-- =============================================
-- This table stores all comprehensive starmap data including:
-- - Static questions and answers
-- - Dynamic questions and answers
-- - Prompts and final reports
-- - Progress tracking and status

-- Drop existing table if needed (only for development)
-- DROP TABLE IF EXISTS starmaps_master CASCADE;

-- Create the starmaps_master table
CREATE TABLE IF NOT EXISTS starmaps_master (
  -- Primary key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- User association
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Starmap identification
  starmap_job_id TEXT NOT NULL,
  title TEXT,
  description TEXT,
  
  -- Static questions and their answers
  static_questions JSONB DEFAULT '[]'::JSONB,
  static_answers JSONB DEFAULT '{}'::JSONB,
  
  -- Dynamic questions generation
  dynamic_questions_prompt TEXT,
  dynamic_questions JSONB DEFAULT '[]'::JSONB,
  dynamic_answers JSONB DEFAULT '{}'::JSONB,
  
  -- Final report generation
  final_prompt TEXT,
  final_report TEXT,
  preliminary_report TEXT,
  
  -- Report metadata
  report_format TEXT DEFAULT 'standard' CHECK (report_format IN ('standard', 'detailed', 'executive', 'technical')),
  report_length INTEGER,
  report_sections JSONB DEFAULT '[]'::JSONB,
  
  -- Tags and categorization
  tags TEXT[],
  category TEXT,
  industry TEXT,
  
  -- Progress tracking
  progress_percentage INTEGER DEFAULT 0 CHECK (progress_percentage >= 0 AND progress_percentage <= 100),
  current_step TEXT,
  steps_completed JSONB DEFAULT '[]'::JSONB,
  error_message TEXT,
  error_details JSONB,
  
  -- Status tracking with comprehensive states
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN (
    'draft',
    'in_progress',
    'generating_static_questions',
    'awaiting_static_answers',
    'generating_dynamic_questions',
    'awaiting_dynamic_answers',
    'generating_report',
    'review',
    'completed',
    'failed',
    'cancelled',
    'archived'
  )),
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  last_accessed_at TIMESTAMPTZ,
  
  -- Versioning support
  version INTEGER DEFAULT 1,
  parent_starmap_id UUID REFERENCES starmaps_master(id),
  is_published BOOLEAN DEFAULT FALSE,
  published_at TIMESTAMPTZ,
  
  -- Analytics and metrics
  total_questions_count INTEGER GENERATED ALWAYS AS (
    COALESCE(jsonb_array_length(static_questions), 0) + 
    COALESCE(jsonb_array_length(dynamic_questions), 0)
  ) STORED,
  answered_questions_count INTEGER DEFAULT 0,
  completion_time_seconds INTEGER,
  
  -- AI model tracking
  ai_model TEXT DEFAULT 'gpt-4',
  ai_model_version TEXT,
  total_tokens_used INTEGER DEFAULT 0,
  
  -- Additional metadata
  metadata JSONB DEFAULT '{}'::JSONB,
  
  -- Unique constraint to prevent duplicate jobs per user
  UNIQUE (user_id, starmap_job_id),
  
  -- Check constraint for completion
  CONSTRAINT check_completion CHECK (
    (status = 'completed' AND completed_at IS NOT NULL) OR
    (status != 'completed')
  )
);

-- Create indexes for performance
CREATE INDEX idx_starmaps_master_user_id ON starmaps_master(user_id);
CREATE INDEX idx_starmaps_master_starmap_job_id ON starmaps_master(starmap_job_id);
CREATE INDEX idx_starmaps_master_status ON starmaps_master(status);
CREATE INDEX idx_starmaps_master_created_at ON starmaps_master(created_at DESC);
CREATE INDEX idx_starmaps_master_updated_at ON starmaps_master(updated_at DESC);
CREATE INDEX idx_starmaps_master_tags ON starmaps_master USING GIN(tags);
CREATE INDEX idx_starmaps_master_category ON starmaps_master(category);
CREATE INDEX idx_starmaps_master_is_published ON starmaps_master(is_published) WHERE is_published = TRUE;
CREATE INDEX idx_starmaps_master_parent_id ON starmaps_master(parent_starmap_id) WHERE parent_starmap_id IS NOT NULL;

-- Enable Row Level Security
ALTER TABLE starmaps_master ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own starmaps" ON starmaps_master
  FOR SELECT USING (auth.uid() = user_id);
  
CREATE POLICY "Users can insert their own starmaps" ON starmaps_master
  FOR INSERT WITH CHECK (auth.uid() = user_id);
  
CREATE POLICY "Users can update their own starmaps" ON starmaps_master
  FOR UPDATE USING (auth.uid() = user_id);
  
CREATE POLICY "Users can delete their own starmaps" ON starmaps_master
  FOR DELETE USING (auth.uid() = user_id);

-- Policy for viewing published starmaps (if needed)
CREATE POLICY "Anyone can view published starmaps" ON starmaps_master
  FOR SELECT USING (is_published = TRUE);

-- Function to update timestamps and track progress
CREATE OR REPLACE FUNCTION update_starmaps_master_timestamps()
RETURNS TRIGGER AS $$
BEGIN
  -- Always update updated_at
  NEW.updated_at = NOW();
  
  -- Set started_at when moving from draft
  IF OLD.status = 'draft' AND NEW.status != 'draft' AND NEW.started_at IS NULL THEN
    NEW.started_at = NOW();
  END IF;
  
  -- Set completed_at when status changes to completed
  IF OLD.status != 'completed' AND NEW.status = 'completed' THEN
    NEW.completed_at = NOW();
    -- Calculate completion time
    IF NEW.started_at IS NOT NULL THEN
      NEW.completion_time_seconds = EXTRACT(EPOCH FROM (NOW() - NEW.started_at))::INTEGER;
    END IF;
  END IF;
  
  -- Update answered questions count
  NEW.answered_questions_count = 
    COALESCE(array_length(array(SELECT jsonb_object_keys(NEW.static_answers)), 1), 0) + 
    COALESCE(array_length(array(SELECT jsonb_object_keys(NEW.dynamic_answers)), 1), 0);
  
  -- Update progress percentage based on status
  CASE NEW.status
    WHEN 'draft' THEN NEW.progress_percentage = 0;
    WHEN 'generating_static_questions' THEN NEW.progress_percentage = 10;
    WHEN 'awaiting_static_answers' THEN NEW.progress_percentage = 20;
    WHEN 'generating_dynamic_questions' THEN NEW.progress_percentage = 40;
    WHEN 'awaiting_dynamic_answers' THEN NEW.progress_percentage = 60;
    WHEN 'generating_report' THEN NEW.progress_percentage = 80;
    WHEN 'review' THEN NEW.progress_percentage = 90;
    WHEN 'completed' THEN NEW.progress_percentage = 100;
    ELSE -- Keep current progress
  END CASE;
  
  -- Set published_at when published
  IF OLD.is_published = FALSE AND NEW.is_published = TRUE THEN
    NEW.published_at = NOW();
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for timestamp updates
DROP TRIGGER IF EXISTS trg_update_starmaps_master_timestamps ON starmaps_master;
CREATE TRIGGER trg_update_starmaps_master_timestamps
  BEFORE UPDATE ON starmaps_master
  FOR EACH ROW EXECUTE FUNCTION update_starmaps_master_timestamps();

-- Function to track access
CREATE OR REPLACE FUNCTION update_starmaps_master_last_accessed()
RETURNS TRIGGER AS $$
BEGIN
  -- Update last_accessed_at on SELECT (requires separate tracking mechanism)
  -- This is a placeholder for access tracking logic
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to validate starmap data
CREATE OR REPLACE FUNCTION validate_starmap_data()
RETURNS TRIGGER AS $$
BEGIN
  -- Ensure static_questions is an array
  IF NEW.static_questions IS NOT NULL AND jsonb_typeof(NEW.static_questions) != 'array' THEN
    RAISE EXCEPTION 'static_questions must be a JSON array';
  END IF;
  
  -- Ensure dynamic_questions is an array
  IF NEW.dynamic_questions IS NOT NULL AND jsonb_typeof(NEW.dynamic_questions) != 'array' THEN
    RAISE EXCEPTION 'dynamic_questions must be a JSON array';
  END IF;
  
  -- Ensure answers are objects
  IF NEW.static_answers IS NOT NULL AND jsonb_typeof(NEW.static_answers) != 'object' THEN
    RAISE EXCEPTION 'static_answers must be a JSON object';
  END IF;
  
  IF NEW.dynamic_answers IS NOT NULL AND jsonb_typeof(NEW.dynamic_answers) != 'object' THEN
    RAISE EXCEPTION 'dynamic_answers must be a JSON object';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create validation trigger
DROP TRIGGER IF EXISTS trg_validate_starmap_data ON starmaps_master;
CREATE TRIGGER trg_validate_starmap_data
  BEFORE INSERT OR UPDATE ON starmaps_master
  FOR EACH ROW EXECUTE FUNCTION validate_starmap_data();

-- Grant permissions to authenticated users
GRANT SELECT, INSERT, UPDATE, DELETE ON starmaps_master TO authenticated;

-- Create a view for simplified starmap listing
CREATE OR REPLACE VIEW starmaps_master_summary AS
SELECT 
  id,
  user_id,
  starmap_job_id,
  title,
  description,
  status,
  progress_percentage,
  total_questions_count,
  answered_questions_count,
  created_at,
  updated_at,
  completed_at,
  is_published,
  tags,
  category
FROM starmaps_master;

-- Grant permissions on the view
GRANT SELECT ON starmaps_master_summary TO authenticated;

-- Create helper function to get starmap by job_id
CREATE OR REPLACE FUNCTION get_starmap_by_job_id(p_job_id TEXT)
RETURNS SETOF starmaps_master AS $$
BEGIN
  RETURN QUERY
  SELECT * FROM starmaps_master
  WHERE starmap_job_id = p_job_id
  AND user_id = auth.uid()
  LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to update starmap progress
CREATE OR REPLACE FUNCTION update_starmap_progress(
  p_starmap_id UUID,
  p_current_step TEXT,
  p_progress_percentage INTEGER DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
  UPDATE starmaps_master
  SET 
    current_step = p_current_step,
    progress_percentage = COALESCE(p_progress_percentage, progress_percentage),
    steps_completed = steps_completed || jsonb_build_object(
      'step', p_current_step,
      'timestamp', NOW()
    )
  WHERE id = p_starmap_id
  AND user_id = auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to save question answers
CREATE OR REPLACE FUNCTION save_starmap_answers(
  p_starmap_id UUID,
  p_question_type TEXT, -- 'static' or 'dynamic'
  p_answers JSONB
)
RETURNS VOID AS $$
BEGIN
  IF p_question_type = 'static' THEN
    UPDATE starmaps_master
    SET static_answers = static_answers || p_answers
    WHERE id = p_starmap_id
    AND user_id = auth.uid();
  ELSIF p_question_type = 'dynamic' THEN
    UPDATE starmaps_master
    SET dynamic_answers = dynamic_answers || p_answers
    WHERE id = p_starmap_id
    AND user_id = auth.uid();
  ELSE
    RAISE EXCEPTION 'Invalid question type. Must be "static" or "dynamic"';
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add comments for documentation
COMMENT ON TABLE starmaps_master IS 'Master table storing all starmap data including questions, answers, prompts, and reports';
COMMENT ON COLUMN starmaps_master.static_questions IS 'Array of predefined static questions';
COMMENT ON COLUMN starmaps_master.static_answers IS 'Object mapping question IDs to user answers for static questions';
COMMENT ON COLUMN starmaps_master.dynamic_questions_prompt IS 'AI prompt used to generate dynamic questions';
COMMENT ON COLUMN starmaps_master.dynamic_questions IS 'Array of AI-generated dynamic questions';
COMMENT ON COLUMN starmaps_master.dynamic_answers IS 'Object mapping question IDs to user answers for dynamic questions';

-- RPC: Merge dynamic answers for master_discovery as well (app currently uses master_discovery)
-- This function safely merges provided answers into existing JSONB without overwriting other stages/pages
CREATE OR REPLACE FUNCTION save_dynamic_answers(
  p_id UUID,
  p_answers JSONB
)
RETURNS VOID AS $$
BEGIN
  UPDATE master_discovery
  SET dynamic_answers = COALESCE(dynamic_answers, '{}'::JSONB) || COALESCE(p_answers, '{}'::JSONB),
      updated_at = NOW(),
      status = CASE WHEN status = 'draft' THEN 'in_progress' ELSE status END
  WHERE id = p_id
  AND user_id = auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Optional: Nested stage merge function for clarity and analytics-friendly structure
-- call with (id, 'discovery', '{"q1":"..."}'::jsonb)
CREATE OR REPLACE FUNCTION save_dynamic_stage_answers(
  p_id UUID,
  p_stage TEXT,
  p_answers JSONB
)
RETURNS VOID AS $$
BEGIN
  UPDATE master_discovery
  SET dynamic_answers = jsonb_set(
    COALESCE(dynamic_answers, '{}'::jsonb),
    ARRAY[p_stage],
    COALESCE(dynamic_answers->p_stage, '{}'::jsonb) || COALESCE(p_answers, '{}'::jsonb),
    true
  ),
  updated_at = NOW(),
  status = CASE WHEN status = 'draft' THEN 'in_progress' ELSE status END
  WHERE id = p_id
  AND user_id = auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Index to speed up queries on dynamic_answers
CREATE INDEX IF NOT EXISTS idx_master_discovery_dynamic_answers_gin
  ON master_discovery
  USING GIN (dynamic_answers);
COMMENT ON COLUMN starmaps_master.final_prompt IS 'Final AI prompt used to generate the report';
COMMENT ON COLUMN starmaps_master.final_report IS 'The complete generated report content';
COMMENT ON COLUMN starmaps_master.status IS 'Current status of the starmap in the workflow';
