-- Add columns for research reports and edited content
ALTER TABLE public.polaris_summaries
ADD COLUMN IF NOT EXISTS greeting_report TEXT,
ADD COLUMN IF NOT EXISTS org_report TEXT,
ADD COLUMN IF NOT EXISTS requirement_report TEXT,
ADD COLUMN IF NOT EXISTS edited_content TEXT,
ADD COLUMN IF NOT EXISTS is_edited BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS last_edited_at TIMESTAMP WITH TIME ZONE;

-- Add index for faster queries on edited summaries
CREATE INDEX IF NOT EXISTS idx_polaris_summaries_is_edited 
ON public.polaris_summaries(is_edited) 
WHERE is_edited = TRUE;

-- Add trigger to update last_edited_at when edited_content changes
CREATE OR REPLACE FUNCTION update_last_edited_at()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.edited_content IS DISTINCT FROM OLD.edited_content THEN
        NEW.last_edited_at = NOW();
        NEW.is_edited = TRUE;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_polaris_summaries_last_edited
BEFORE UPDATE ON public.polaris_summaries
FOR EACH ROW
EXECUTE FUNCTION update_last_edited_at();
