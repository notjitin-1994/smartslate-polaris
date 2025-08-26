-- Add webhook support to existing report tables and report_jobs
-- This migration adds webhook tracking fields for the webhook-based update system

-- First add webhook tracking fields to the report_jobs table
ALTER TABLE public.report_jobs
  ADD COLUMN IF NOT EXISTS webhook_url TEXT,
  ADD COLUMN IF NOT EXISTS webhook_status TEXT CHECK (webhook_status IN ('pending', 'sent', 'success', 'failed', 'retrying')) DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS webhook_attempts INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS webhook_last_attempt TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS webhook_response JSONB DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS webhook_metadata JSONB DEFAULT '{}';

-- Add webhook tracking to greeting_reports
ALTER TABLE public.greeting_reports
  ADD COLUMN IF NOT EXISTS webhook_status TEXT CHECK (webhook_status IN ('pending', 'sent', 'success', 'failed', 'retrying')) DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS webhook_attempts INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS webhook_last_attempt TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS webhook_response JSONB DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS webhook_job_id TEXT;

-- Add webhook tracking to org_reports  
ALTER TABLE public.org_reports
  ADD COLUMN IF NOT EXISTS webhook_status TEXT CHECK (webhook_status IN ('pending', 'sent', 'success', 'failed', 'retrying')) DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS webhook_attempts INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS webhook_last_attempt TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS webhook_response JSONB DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS webhook_job_id TEXT;

-- Add webhook tracking to requirement_reports
ALTER TABLE public.requirement_reports
  ADD COLUMN IF NOT EXISTS webhook_status TEXT CHECK (webhook_status IN ('pending', 'sent', 'success', 'failed', 'retrying')) DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS webhook_attempts INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS webhook_last_attempt TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS webhook_response JSONB DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS webhook_job_id TEXT;

-- Create indexes for webhook-related queries
CREATE INDEX IF NOT EXISTS idx_report_jobs_webhook_status ON public.report_jobs(webhook_status) WHERE webhook_status IN ('pending', 'retrying', 'failed');
CREATE INDEX IF NOT EXISTS idx_greeting_reports_webhook_status ON public.greeting_reports(webhook_status) WHERE webhook_status IN ('pending', 'retrying', 'failed');
CREATE INDEX IF NOT EXISTS idx_org_reports_webhook_status ON public.org_reports(webhook_status) WHERE webhook_status IN ('pending', 'retrying', 'failed');
CREATE INDEX IF NOT EXISTS idx_requirement_reports_webhook_status ON public.requirement_reports(webhook_status) WHERE webhook_status IN ('pending', 'retrying', 'failed');

-- Add indexes for job_id lookups on report tables
CREATE INDEX IF NOT EXISTS idx_greeting_reports_webhook_job_id ON public.greeting_reports(webhook_job_id);
CREATE INDEX IF NOT EXISTS idx_org_reports_webhook_job_id ON public.org_reports(webhook_job_id);
CREATE INDEX IF NOT EXISTS idx_requirement_reports_webhook_job_id ON public.requirement_reports(webhook_job_id);

-- Create webhook audit table for tracking all webhook calls
CREATE TABLE IF NOT EXISTS public.webhook_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  webhook_type TEXT NOT NULL CHECK (webhook_type IN ('prelim-report', 'final-report')),
  job_id TEXT NOT NULL,
  report_id UUID,
  report_table TEXT,
  request_payload JSONB,
  response_status INTEGER,
  response_body JSONB,
  error_message TEXT,
  attempt_number INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for webhook audit queries
CREATE INDEX IF NOT EXISTS idx_webhook_audit_job_id ON public.webhook_audit(job_id);
CREATE INDEX IF NOT EXISTS idx_webhook_audit_type ON public.webhook_audit(webhook_type);
CREATE INDEX IF NOT EXISTS idx_webhook_audit_created ON public.webhook_audit(created_at);

-- RLS policy for webhook audit (service role only)
ALTER TABLE public.webhook_audit ENABLE ROW LEVEL SECURITY;

-- Service role can do everything on webhook audit
CREATE POLICY "Service role has full access to webhook audit"
  ON public.webhook_audit FOR ALL
  USING (auth.role() = 'service_role');

-- Function to update webhook status with retry logic
CREATE OR REPLACE FUNCTION public.update_webhook_status(
  table_name TEXT,
  record_id UUID,
  new_status TEXT,
  response_data JSONB DEFAULT '{}',
  increment_attempts BOOLEAN DEFAULT TRUE
)
RETURNS void AS $$
DECLARE
  sql_query TEXT;
BEGIN
  -- Validate inputs
  IF table_name NOT IN ('greeting_reports', 'org_reports', 'requirement_reports', 'report_jobs') THEN
    RAISE EXCEPTION 'Invalid table name: %', table_name;
  END IF;
  
  IF new_status NOT IN ('pending', 'sent', 'success', 'failed', 'retrying') THEN
    RAISE EXCEPTION 'Invalid webhook status: %', new_status;
  END IF;
  
  -- Build dynamic SQL
  sql_query := format(
    'UPDATE public.%I SET 
       webhook_status = $1, 
       webhook_response = $2, 
       webhook_last_attempt = NOW()%s
     WHERE id = $3',
    table_name,
    CASE WHEN increment_attempts THEN ', webhook_attempts = COALESCE(webhook_attempts, 0) + 1' ELSE '' END
  );
  
  -- Execute the update
  EXECUTE sql_query USING new_status, response_data, record_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get failed webhook records for retry
CREATE OR REPLACE FUNCTION public.get_failed_webhooks(
  max_attempts INTEGER DEFAULT 3,
  retry_after_minutes INTEGER DEFAULT 5
)
RETURNS TABLE (
  table_name TEXT,
  record_id UUID,
  job_id TEXT,
  webhook_attempts INTEGER,
  last_attempt TIMESTAMPTZ
) AS $$
BEGIN
  -- Get failed webhooks from greeting_reports
  RETURN QUERY
  SELECT 'greeting_reports'::TEXT, gr.id, gr.webhook_job_id, gr.webhook_attempts, gr.webhook_last_attempt
  FROM public.greeting_reports gr
  WHERE gr.webhook_status IN ('failed', 'retrying')
    AND gr.webhook_attempts < max_attempts
    AND (gr.webhook_last_attempt IS NULL OR gr.webhook_last_attempt < NOW() - (retry_after_minutes || ' minutes')::INTERVAL);
  
  -- Get failed webhooks from org_reports  
  RETURN QUERY
  SELECT 'org_reports'::TEXT, orr.id, orr.webhook_job_id, orr.webhook_attempts, orr.webhook_last_attempt
  FROM public.org_reports orr
  WHERE orr.webhook_status IN ('failed', 'retrying')
    AND orr.webhook_attempts < max_attempts
    AND (orr.webhook_last_attempt IS NULL OR orr.webhook_last_attempt < NOW() - (retry_after_minutes || ' minutes')::INTERVAL);
  
  -- Get failed webhooks from requirement_reports
  RETURN QUERY
  SELECT 'requirement_reports'::TEXT, rr.id, rr.webhook_job_id, rr.webhook_attempts, rr.webhook_last_attempt
  FROM public.requirement_reports rr
  WHERE rr.webhook_status IN ('failed', 'retrying')
    AND rr.webhook_attempts < max_attempts
    AND (rr.webhook_last_attempt IS NULL OR rr.webhook_last_attempt < NOW() - (retry_after_minutes || ' minutes')::INTERVAL);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Comments for documentation
COMMENT ON COLUMN public.report_jobs.webhook_url IS 'URL endpoint for webhook callbacks';
COMMENT ON COLUMN public.report_jobs.webhook_status IS 'Status of webhook delivery';
COMMENT ON COLUMN public.report_jobs.webhook_attempts IS 'Number of webhook delivery attempts';
COMMENT ON COLUMN public.report_jobs.webhook_metadata IS 'Additional webhook metadata';

COMMENT ON TABLE public.webhook_audit IS 'Audit log of all webhook calls for debugging and monitoring';
COMMENT ON FUNCTION public.update_webhook_status IS 'Helper function to update webhook status with proper validation';
COMMENT ON FUNCTION public.get_failed_webhooks IS 'Get records that need webhook retry attempts';
