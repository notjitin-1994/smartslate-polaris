-- Add public sharing support to polaris_summaries
ALTER TABLE polaris_summaries 
ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT FALSE;

-- Add index for faster public report lookups
CREATE INDEX IF NOT EXISTS idx_polaris_summaries_public 
ON polaris_summaries(id, is_public) 
WHERE is_public = true;

-- Add RLS policy for public access to public reports
CREATE POLICY "Public reports are viewable by anyone" 
ON polaris_summaries 
FOR SELECT 
USING (is_public = true);

-- Add function to toggle report public status
CREATE OR REPLACE FUNCTION toggle_report_public_status(report_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    new_status BOOLEAN;
BEGIN
    -- Toggle the is_public status
    UPDATE polaris_summaries
    SET is_public = NOT COALESCE(is_public, FALSE)
    WHERE id = report_id 
    AND user_id = auth.uid()
    RETURNING is_public INTO new_status;
    
    -- Return the new status
    RETURN new_status;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission on the function
GRANT EXECUTE ON FUNCTION toggle_report_public_status(UUID) TO authenticated;
