-- Add dynamic questionnaire report column to persist Q&A transcript
ALTER TABLE public.polaris_summaries
ADD COLUMN IF NOT EXISTS dynamic_questionnaire_report TEXT;


