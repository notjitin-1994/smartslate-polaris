-- Enhanced Polaris Jobs System for better UX
-- Tracks job-based starmap generation with resumable state

-- Create enum for job stages
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'polaris_job_stage') THEN
    CREATE TYPE polaris_job_stage AS ENUM (
      'greeting',           -- Stage 1: Greeting/Initial data collection
      'organization',       -- Stage 2: Organization details
      'requirements',       -- Stage 3: Project requirements
      'preliminary',        -- Stage 4: Preliminary report generation
      'dynamic_questions',  -- Stage 5: Dynamic questionnaire
      'final_report',       -- Stage 6: Final report generation
      'completed'           -- All done
    );
  END IF;
END$$;

-- Create enum for job status
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'polaris_job_status') THEN
    CREATE TYPE polaris_job_status AS ENUM (
      'draft',       -- User is still inputting data
      'processing',  -- AI is generating content
      'paused',      -- User paused/left the session
      'completed',   -- Successfully completed
      'failed',      -- Generation failed
      'cancelled'    -- User cancelled
    );
  END IF;
END$$;

-- Main jobs table for tracking Polaris starmap generation sessions
CREATE TABLE IF NOT EXISTS public.polaris_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Job metadata
  title TEXT,
  company_name TEXT,
  experience_level TEXT,
  current_stage polaris_job_stage NOT NULL DEFAULT 'greeting',
  status polaris_job_status NOT NULL DEFAULT 'draft',
  
  -- Edit tracking (3 total edits across all reports)
  edits_remaining INTEGER NOT NULL DEFAULT 3,
  edits_used INTEGER NOT NULL DEFAULT 0,
  
  -- Stage completion tracking
  stages_completed JSONB NOT NULL DEFAULT '[]'::jsonb,
  
  -- Collected data from each stage
  greeting_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  org_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  requirements_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  dynamic_questions JSONB NOT NULL DEFAULT '[]'::jsonb,
  dynamic_answers JSONB NOT NULL DEFAULT '{}'::jsonb,
  
  -- Generated reports (stored as markdown)
  greeting_report TEXT,
  org_report TEXT,
  requirement_report TEXT,
  preliminary_report TEXT,
  dynamic_questionnaire_report TEXT,
  final_report TEXT,
  
  -- Edit history for each report
  greeting_report_edited TEXT,
  org_report_edited TEXT,
  requirement_report_edited TEXT,
  preliminary_report_edited TEXT,
  dynamic_questionnaire_report_edited TEXT,
  final_report_edited TEXT,
  
  -- Research status for async generation
  greeting_research_status research_status DEFAULT 'pending',
  org_research_status research_status DEFAULT 'pending',
  requirement_research_status research_status DEFAULT 'pending',
  
  -- Session state for resuming
  session_state JSONB NOT NULL DEFAULT '{}'::jsonb,
  last_activity_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  
  -- Optional link to legacy summary if migrated
  legacy_summary_id UUID REFERENCES public.polaris_summaries(id) ON DELETE SET NULL
);

-- Create edit history table to track all edits
CREATE TABLE IF NOT EXISTS public.polaris_job_edits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES public.polaris_jobs(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- What was edited
  report_type TEXT NOT NULL CHECK (report_type IN (
    'greeting', 'org', 'requirement', 
    'preliminary', 'dynamic_questionnaire', 'final'
  )),
  
  -- Edit details
  original_content TEXT NOT NULL,
  edited_content TEXT NOT NULL,
  edit_number INTEGER NOT NULL, -- Which edit this was (1, 2, or 3)
  
  -- AI assistance details if used
  ai_assisted BOOLEAN DEFAULT FALSE,
  ai_prompt TEXT,
  ai_model TEXT,
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create job reports table for individual report tracking
CREATE TABLE IF NOT EXISTS public.polaris_job_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES public.polaris_jobs(id) ON DELETE CASCADE,
  
  -- Report details
  report_type TEXT NOT NULL CHECK (report_type IN (
    'greeting', 'org', 'requirement', 
    'preliminary', 'dynamic_questionnaire', 'final'
  )),
  
  -- Version tracking
  version INTEGER NOT NULL DEFAULT 1,
  is_current BOOLEAN NOT NULL DEFAULT TRUE,
  
  -- Content
  content TEXT NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  
  -- Generation details
  generated_by TEXT, -- 'ai' or 'user' 
  model_used TEXT,
  prompt_used TEXT,
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create job activity log for tracking user actions
CREATE TABLE IF NOT EXISTS public.polaris_job_activity (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES public.polaris_jobs(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Activity details
  action TEXT NOT NULL, -- 'started', 'resumed', 'paused', 'edited', 'generated', etc.
  stage polaris_job_stage,
  details JSONB NOT NULL DEFAULT '{}'::jsonb,
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_polaris_jobs_user ON public.polaris_jobs(user_id);
CREATE INDEX IF NOT EXISTS idx_polaris_jobs_status ON public.polaris_jobs(status);
CREATE INDEX IF NOT EXISTS idx_polaris_jobs_stage ON public.polaris_jobs(current_stage);
CREATE INDEX IF NOT EXISTS idx_polaris_jobs_created ON public.polaris_jobs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_polaris_jobs_activity ON public.polaris_jobs(last_activity_at DESC);

CREATE INDEX IF NOT EXISTS idx_polaris_job_edits_job ON public.polaris_job_edits(job_id);
CREATE INDEX IF NOT EXISTS idx_polaris_job_edits_user ON public.polaris_job_edits(user_id);

CREATE INDEX IF NOT EXISTS idx_polaris_job_reports_job ON public.polaris_job_reports(job_id);
CREATE INDEX IF NOT EXISTS idx_polaris_job_reports_type ON public.polaris_job_reports(report_type);
CREATE INDEX IF NOT EXISTS idx_polaris_job_reports_current ON public.polaris_job_reports(is_current) WHERE is_current = TRUE;

CREATE INDEX IF NOT EXISTS idx_polaris_job_activity_job ON public.polaris_job_activity(job_id);
CREATE INDEX IF NOT EXISTS idx_polaris_job_activity_user ON public.polaris_job_activity(user_id);

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_polaris_jobs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  NEW.last_activity_at = NOW();
  
  -- Set completed_at when job completes
  IF OLD.status != 'completed' AND NEW.status = 'completed' THEN
    NEW.completed_at = NOW();
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_polaris_jobs_timestamp
  BEFORE UPDATE ON public.polaris_jobs
  FOR EACH ROW
  EXECUTE FUNCTION update_polaris_jobs_updated_at();

-- Function to enforce edit limit
CREATE OR REPLACE FUNCTION enforce_edit_limit()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if user has edits remaining
  IF (SELECT edits_remaining FROM public.polaris_jobs WHERE id = NEW.job_id) <= 0 THEN
    RAISE EXCEPTION 'No edits remaining for this job';
  END IF;
  
  -- Update edit count
  UPDATE public.polaris_jobs 
  SET 
    edits_used = edits_used + 1,
    edits_remaining = edits_remaining - 1
  WHERE id = NEW.job_id;
  
  -- Set edit number
  NEW.edit_number := (SELECT edits_used FROM public.polaris_jobs WHERE id = NEW.job_id);
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER enforce_edit_limit_trigger
  BEFORE INSERT ON public.polaris_job_edits
  FOR EACH ROW
  EXECUTE FUNCTION enforce_edit_limit();

-- Function to update report versions
CREATE OR REPLACE FUNCTION update_report_versions()
RETURNS TRIGGER AS $$
BEGIN
  -- Mark previous versions as not current
  UPDATE public.polaris_job_reports
  SET is_current = FALSE
  WHERE job_id = NEW.job_id 
    AND report_type = NEW.report_type
    AND id != NEW.id;
  
  -- Set version number
  NEW.version := COALESCE(
    (SELECT MAX(version) + 1 
     FROM public.polaris_job_reports 
     WHERE job_id = NEW.job_id AND report_type = NEW.report_type),
    1
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_report_versions_trigger
  BEFORE INSERT ON public.polaris_job_reports
  FOR EACH ROW
  EXECUTE FUNCTION update_report_versions();

-- RLS Policies
ALTER TABLE public.polaris_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.polaris_job_edits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.polaris_job_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.polaris_job_activity ENABLE ROW LEVEL SECURITY;

-- Users can only see their own jobs
CREATE POLICY "Users can view own jobs"
  ON public.polaris_jobs FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own jobs"
  ON public.polaris_jobs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own jobs"
  ON public.polaris_jobs FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own jobs"
  ON public.polaris_jobs FOR DELETE
  USING (auth.uid() = user_id);

-- Similar policies for related tables
CREATE POLICY "Users can view own job edits"
  ON public.polaris_job_edits FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own job edits"
  ON public.polaris_job_edits FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view job reports"
  ON public.polaris_job_reports FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.polaris_jobs 
    WHERE id = polaris_job_reports.job_id 
    AND user_id = auth.uid()
  ));

CREATE POLICY "Users can create job reports"
  ON public.polaris_job_reports FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.polaris_jobs 
    WHERE id = polaris_job_reports.job_id 
    AND user_id = auth.uid()
  ));

CREATE POLICY "Users can view own job activity"
  ON public.polaris_job_activity FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own job activity"
  ON public.polaris_job_activity FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Service role has full access
CREATE POLICY "Service role has full access to jobs"
  ON public.polaris_jobs FOR ALL
  USING (auth.role() = 'service_role');

CREATE POLICY "Service role has full access to edits"
  ON public.polaris_job_edits FOR ALL
  USING (auth.role() = 'service_role');

CREATE POLICY "Service role has full access to reports"
  ON public.polaris_job_reports FOR ALL
  USING (auth.role() = 'service_role');

CREATE POLICY "Service role has full access to activity"
  ON public.polaris_job_activity FOR ALL
  USING (auth.role() = 'service_role');

-- Comments for documentation
COMMENT ON TABLE public.polaris_jobs IS 'Main table for tracking Polaris starmap generation jobs with resumable state';
COMMENT ON TABLE public.polaris_job_edits IS 'Tracks all edits made to reports within a job (max 3 per job)';
COMMENT ON TABLE public.polaris_job_reports IS 'Stores versioned reports for each job';
COMMENT ON TABLE public.polaris_job_activity IS 'Activity log for tracking user actions within a job';

COMMENT ON COLUMN public.polaris_jobs.edits_remaining IS 'Number of edits remaining (starts at 3)';
COMMENT ON COLUMN public.polaris_jobs.stages_completed IS 'Array of completed stage names';
COMMENT ON COLUMN public.polaris_jobs.session_state IS 'Arbitrary state data for resuming the session';
