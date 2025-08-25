-- Create report_jobs table for async report generation
CREATE TABLE IF NOT EXISTS report_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id TEXT UNIQUE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  summary_id UUID REFERENCES polaris_summaries(id) ON DELETE CASCADE,
  
  -- Job details
  status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'running', 'succeeded', 'failed', 'cancelled')),
  model TEXT,
  prompt TEXT,
  temperature DECIMAL(3,2) DEFAULT 0.2,
  max_tokens INTEGER DEFAULT 4000,
  
  -- Results
  result TEXT,
  error TEXT,
  percent INTEGER DEFAULT 0 CHECK (percent >= 0 AND percent <= 100),
  eta_seconds INTEGER,
  
  -- Metadata
  idempotency_key TEXT,
  metadata JSONB DEFAULT '{}',
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  
  -- Auto-delete old jobs after 7 days
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '7 days')
);

-- Indexes for performance
CREATE INDEX idx_report_jobs_user_status ON report_jobs(user_id, status);
CREATE INDEX idx_report_jobs_summary ON report_jobs(summary_id);
CREATE INDEX idx_report_jobs_job_id ON report_jobs(job_id);
CREATE INDEX idx_report_jobs_status ON report_jobs(status) WHERE status IN ('queued', 'running');
CREATE INDEX idx_report_jobs_expires ON report_jobs(expires_at);
CREATE INDEX idx_report_jobs_idempotency ON report_jobs(idempotency_key) WHERE idempotency_key IS NOT NULL;

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_report_jobs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  
  -- Set started_at when job starts running
  IF OLD.status != 'running' AND NEW.status = 'running' THEN
    NEW.started_at = NOW();
  END IF;
  
  -- Set completed_at when job completes
  IF OLD.status IN ('queued', 'running') AND NEW.status IN ('succeeded', 'failed', 'cancelled') THEN
    NEW.completed_at = NOW();
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update timestamps
CREATE TRIGGER update_report_jobs_timestamp
  BEFORE UPDATE ON report_jobs
  FOR EACH ROW
  EXECUTE FUNCTION update_report_jobs_updated_at();

-- Function to clean up expired jobs
CREATE OR REPLACE FUNCTION cleanup_expired_report_jobs()
RETURNS void AS $$
BEGIN
  DELETE FROM report_jobs 
  WHERE expires_at < NOW() 
    OR (status IN ('succeeded', 'failed', 'cancelled') AND completed_at < NOW() - INTERVAL '24 hours');
END;
$$ LANGUAGE plpgsql;

-- RLS Policies
ALTER TABLE report_jobs ENABLE ROW LEVEL SECURITY;

-- Users can only see their own jobs
CREATE POLICY "Users can view own report jobs"
  ON report_jobs FOR SELECT
  USING (auth.uid() = user_id);

-- Users can create their own jobs
CREATE POLICY "Users can create own report jobs"
  ON report_jobs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own jobs
CREATE POLICY "Users can update own report jobs"
  ON report_jobs FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Users can delete their own jobs
CREATE POLICY "Users can delete own report jobs"
  ON report_jobs FOR DELETE
  USING (auth.uid() = user_id);

-- Service role can do everything (for API routes)
CREATE POLICY "Service role has full access"
  ON report_jobs FOR ALL
  USING (auth.role() = 'service_role');

-- Comments for documentation
COMMENT ON TABLE report_jobs IS 'Stores asynchronous report generation jobs for Polaris';
COMMENT ON COLUMN report_jobs.job_id IS 'Unique job identifier for API lookups';
COMMENT ON COLUMN report_jobs.idempotency_key IS 'Prevents duplicate job creation';
COMMENT ON COLUMN report_jobs.metadata IS 'Additional job context (stage, type, etc)';
COMMENT ON COLUMN report_jobs.expires_at IS 'Auto-cleanup timestamp';
