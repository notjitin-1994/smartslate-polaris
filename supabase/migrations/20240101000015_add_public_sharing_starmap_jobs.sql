-- Add public sharing support to starmap_jobs
ALTER TABLE starmap_jobs 
ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT FALSE;

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_starmap_jobs_public 
ON starmap_jobs(id, is_public) 
WHERE is_public = true;

-- RLS policy to allow public read of public starmap jobs
CREATE POLICY IF NOT EXISTS "Public starmap jobs viewable when is_public" 
ON starmap_jobs 
FOR SELECT 
USING (is_public = true);

-- Toggle function for public status on starmap jobs
CREATE OR REPLACE FUNCTION toggle_starmap_public_status(job_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    new_status BOOLEAN;
BEGIN
    UPDATE starmap_jobs
    SET is_public = NOT COALESCE(is_public, FALSE)
    WHERE id = job_id AND user_id = auth.uid()
    RETURNING is_public INTO new_status;

    RETURN new_status;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION toggle_starmap_public_status(UUID) TO authenticated;

