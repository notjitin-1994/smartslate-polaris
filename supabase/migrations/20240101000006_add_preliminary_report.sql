-- Add preliminary report column to store user-reviewed draft before final report
ALTER TABLE public.polaris_summaries
ADD COLUMN IF NOT EXISTS prelim_report TEXT;

-- Optional helpful index for querying edited vs prelim later (no-op if already exists)
-- CREATE INDEX IF NOT EXISTS idx_polaris_summaries_prelim_report ON public.polaris_summaries (id);

