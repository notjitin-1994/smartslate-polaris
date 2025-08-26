-- Starmap Jobs System for async starmap generation
-- Simpler than polaris_jobs, focused on async report generation

-- Create enum for starmap job status
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'starmap_job_status') THEN
    CREATE TYPE starmap_job_status AS ENUM (
      'draft',       -- User is still inputting data
      'queued',      -- Job queued for processing
      'processing',  -- AI is generating content
      'completed',   -- Successfully completed
      'failed',      -- Generation failed
      'cancelled'    -- User cancelled
    );
  END IF;
END$$;

-- Main jobs table for tracking starmap generation
CREATE TABLE IF NOT EXISTS public.starmap_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Job metadata
  title TEXT,
  status starmap_job_status NOT NULL DEFAULT 'draft',
  
  -- Stage tracking
  experience_level TEXT,
  stage1_complete BOOLEAN DEFAULT FALSE,
  stage2_complete BOOLEAN DEFAULT FALSE,
  stage3_complete BOOLEAN DEFAULT FALSE,
  dynamic_complete BOOLEAN DEFAULT FALSE,
  
  -- Collected form data
  stage1_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  stage2_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  stage3_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  dynamic_questions JSONB NOT NULL DEFAULT '[]'::jsonb,
  dynamic_answers JSONB NOT NULL DEFAULT '{}'::jsonb,
  
  -- Generated reports
  preliminary_report TEXT,
  final_report TEXT,
  
  -- Async job tracking
  report_job_id TEXT, -- The job ID from /api/reportJobsDb
  report_job_status TEXT, -- Status from the async job
  report_job_progress INTEGER DEFAULT 0,
  report_job_error TEXT,
  
  -- Session state for resuming
  session_state JSONB NOT NULL DEFAULT '{}'::jsonb,
  last_saved_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  
  -- Optional reference to legacy summary if needed
  legacy_summary_id UUID REFERENCES public.polaris_summaries(id) ON DELETE SET NULL
);

-- Create activity log for tracking user actions
CREATE TABLE IF NOT EXISTS public.starmap_job_activity (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES public.starmap_jobs(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Activity details
  action TEXT NOT NULL, -- 'created', 'resumed', 'saved', 'submitted', 'completed', etc.
  details JSONB NOT NULL DEFAULT '{}'::jsonb,
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_starmap_jobs_user ON public.starmap_jobs(user_id);
CREATE INDEX IF NOT EXISTS idx_starmap_jobs_status ON public.starmap_jobs(status);
CREATE INDEX IF NOT EXISTS idx_starmap_jobs_created ON public.starmap_jobs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_starmap_jobs_updated ON public.starmap_jobs(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_starmap_jobs_job_id ON public.starmap_jobs(report_job_id) WHERE report_job_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_starmap_job_activity_job ON public.starmap_job_activity(job_id);
CREATE INDEX IF NOT EXISTS idx_starmap_job_activity_user ON public.starmap_job_activity(user_id);

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_starmap_jobs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  
  -- Set completed_at when job completes
  IF OLD.status != 'completed' AND NEW.status = 'completed' THEN
    NEW.completed_at = NOW();
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_starmap_jobs_timestamp
  BEFORE UPDATE ON public.starmap_jobs
  FOR EACH ROW
  EXECUTE FUNCTION update_starmap_jobs_updated_at();

-- RLS Policies
ALTER TABLE public.starmap_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.starmap_job_activity ENABLE ROW LEVEL SECURITY;

-- Users can only see their own jobs
CREATE POLICY "Users can view own starmap jobs"
  ON public.starmap_jobs FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own starmap jobs"
  ON public.starmap_jobs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own starmap jobs"
  ON public.starmap_jobs FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own starmap jobs"
  ON public.starmap_jobs FOR DELETE
  USING (auth.uid() = user_id);

-- Similar policies for activity table
CREATE POLICY "Users can view own starmap job activity"
  ON public.starmap_job_activity FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own starmap job activity"
  ON public.starmap_job_activity FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Service role has full access
CREATE POLICY "Service role has full access to starmap jobs"
  ON public.starmap_jobs FOR ALL
  USING (auth.role() = 'service_role');

CREATE POLICY "Service role has full access to starmap activity"
  ON public.starmap_job_activity FOR ALL
  USING (auth.role() = 'service_role');

-- Comments for documentation
COMMENT ON TABLE public.starmap_jobs IS 'Main table for tracking starmap generation jobs with async processing';
COMMENT ON TABLE public.starmap_job_activity IS 'Activity log for tracking user actions within a starmap job';

COMMENT ON COLUMN public.starmap_jobs.report_job_id IS 'The async job ID from /api/reportJobsDb';
COMMENT ON COLUMN public.starmap_jobs.report_job_status IS 'Current status of the async report generation';
COMMENT ON COLUMN public.starmap_jobs.session_state IS 'Arbitrary state data for resuming the session';
