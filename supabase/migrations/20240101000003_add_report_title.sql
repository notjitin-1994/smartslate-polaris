-- Add a human-editable report_title used across listings and detail views
ALTER TABLE public.polaris_summaries
  ADD COLUMN IF NOT EXISTS report_title TEXT;

-- Backfill existing rows with a reasonable default using company_name or a generic label
UPDATE public.polaris_summaries
SET report_title = COALESCE(company_name, 'Discovery Starmap')
WHERE report_title IS NULL;


