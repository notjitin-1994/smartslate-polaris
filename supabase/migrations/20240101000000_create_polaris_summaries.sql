-- Create polaris_summaries table
CREATE TABLE IF NOT EXISTS public.polaris_summaries (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  company_name TEXT,
  summary_content TEXT NOT NULL,
  stage1_answers JSONB NOT NULL DEFAULT '{}',
  stage2_answers JSONB NOT NULL DEFAULT '{}',
  stage3_answers JSONB NOT NULL DEFAULT '{}',
  stage2_questions JSONB NOT NULL DEFAULT '[]',
  stage3_questions JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Create indexes for better performance
CREATE INDEX idx_polaris_summaries_user_id ON public.polaris_summaries(user_id);
CREATE INDEX idx_polaris_summaries_created_at ON public.polaris_summaries(created_at DESC);

-- Enable Row Level Security
ALTER TABLE public.polaris_summaries ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
-- Users can only see their own summaries
CREATE POLICY "Users can view own summaries" ON public.polaris_summaries
  FOR SELECT USING (auth.uid() = user_id);

-- Users can only insert their own summaries
CREATE POLICY "Users can insert own summaries" ON public.polaris_summaries
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can only update their own summaries
CREATE POLICY "Users can update own summaries" ON public.polaris_summaries
  FOR UPDATE USING (auth.uid() = user_id);

-- Users can only delete their own summaries
CREATE POLICY "Users can delete own summaries" ON public.polaris_summaries
  FOR DELETE USING (auth.uid() = user_id);
