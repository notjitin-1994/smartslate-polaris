-- Create AI edit sessions table to track edit history
CREATE TABLE IF NOT EXISTS ai_edit_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  summary_id UUID NOT NULL REFERENCES polaris_summaries(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  edit_history JSONB DEFAULT '[]'::jsonb,
  total_edits INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Ensure one session per user per summary
  UNIQUE(summary_id, user_id)
);

-- Create indexes for performance
CREATE INDEX idx_ai_edit_sessions_summary_id ON ai_edit_sessions(summary_id);
CREATE INDEX idx_ai_edit_sessions_user_id ON ai_edit_sessions(user_id);
CREATE INDEX idx_ai_edit_sessions_created_at ON ai_edit_sessions(created_at DESC);

-- Add RLS policies
ALTER TABLE ai_edit_sessions ENABLE ROW LEVEL SECURITY;

-- Users can view their own edit sessions
CREATE POLICY "Users can view own edit sessions" ON ai_edit_sessions
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users can create their own edit sessions
CREATE POLICY "Users can create own edit sessions" ON ai_edit_sessions
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own edit sessions
CREATE POLICY "Users can update own edit sessions" ON ai_edit_sessions
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Users can delete their own edit sessions
CREATE POLICY "Users can delete own edit sessions" ON ai_edit_sessions
  FOR DELETE
  USING (auth.uid() = user_id);

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-update updated_at
CREATE TRIGGER update_ai_edit_sessions_updated_at
  BEFORE UPDATE ON ai_edit_sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Add columns to polaris_summaries table to track AI edits
ALTER TABLE polaris_summaries ADD COLUMN IF NOT EXISTS ai_edits_enabled BOOLEAN DEFAULT true;
ALTER TABLE polaris_summaries ADD COLUMN IF NOT EXISTS max_ai_edits INTEGER DEFAULT 3;
