-- Polaris Reports: greeting_reports, org_reports, requirement_reports
-- Stores both user input (JSONB) and AI research (TEXT), with status and metadata

-- Create enum type for research_status if not exists
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'research_status') THEN
    CREATE TYPE research_status AS ENUM ('pending', 'running', 'completed', 'failed');
  END IF;
END$$;

-- Common trigger function to auto-update updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Helper to create a report table if it doesn't exist
-- Note: Using IF NOT EXISTS guards for idempotency

-- 1) greeting_reports
CREATE TABLE IF NOT EXISTS public.greeting_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  summary_id UUID REFERENCES public.polaris_summaries(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  user_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  research_report TEXT,
  research_status research_status NOT NULL DEFAULT 'pending',
  research_metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2) org_reports
CREATE TABLE IF NOT EXISTS public.org_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  summary_id UUID REFERENCES public.polaris_summaries(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  user_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  research_report TEXT,
  research_status research_status NOT NULL DEFAULT 'pending',
  research_metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3) requirement_reports
CREATE TABLE IF NOT EXISTS public.requirement_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  summary_id UUID REFERENCES public.polaris_summaries(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  user_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  research_report TEXT,
  research_status research_status NOT NULL DEFAULT 'pending',
  research_metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Triggers to maintain updated_at
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_greeting_reports_updated_at'
  ) THEN
    CREATE TRIGGER trg_greeting_reports_updated_at
    BEFORE UPDATE ON public.greeting_reports
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_org_reports_updated_at'
  ) THEN
    CREATE TRIGGER trg_org_reports_updated_at
    BEFORE UPDATE ON public.org_reports
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_requirement_reports_updated_at'
  ) THEN
    CREATE TRIGGER trg_requirement_reports_updated_at
    BEFORE UPDATE ON public.requirement_reports
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END$$;

-- Ensure required columns exist on pre-existing tables (idempotent add)
ALTER TABLE public.greeting_reports
  ADD COLUMN IF NOT EXISTS research_status research_status NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS research_metadata JSONB NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE public.org_reports
  ADD COLUMN IF NOT EXISTS research_status research_status NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS research_metadata JSONB NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE public.requirement_reports
  ADD COLUMN IF NOT EXISTS research_status research_status NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS research_metadata JSONB NOT NULL DEFAULT '{}'::jsonb;

-- Indexes (created after ensuring columns exist)
CREATE INDEX IF NOT EXISTS idx_greeting_reports_user ON public.greeting_reports(user_id);
CREATE INDEX IF NOT EXISTS idx_greeting_reports_summary ON public.greeting_reports(summary_id);
CREATE INDEX IF NOT EXISTS idx_greeting_reports_status ON public.greeting_reports(research_status);
CREATE INDEX IF NOT EXISTS idx_org_reports_user ON public.org_reports(user_id);
CREATE INDEX IF NOT EXISTS idx_org_reports_summary ON public.org_reports(summary_id);
CREATE INDEX IF NOT EXISTS idx_org_reports_status ON public.org_reports(research_status);
CREATE INDEX IF NOT EXISTS idx_requirement_reports_user ON public.requirement_reports(user_id);
CREATE INDEX IF NOT EXISTS idx_requirement_reports_summary ON public.requirement_reports(summary_id);
CREATE INDEX IF NOT EXISTS idx_requirement_reports_status ON public.requirement_reports(research_status);

-- Enable RLS
ALTER TABLE public.greeting_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.org_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.requirement_reports ENABLE ROW LEVEL SECURITY;

-- RLS policies: users can only access their own rows
DO $$
BEGIN
  -- greeting_reports policies
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'greeting_reports' AND policyname = 'greeting_reports_select_own') THEN
    CREATE POLICY greeting_reports_select_own ON public.greeting_reports
      FOR SELECT USING (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'greeting_reports' AND policyname = 'greeting_reports_insert_own') THEN
    CREATE POLICY greeting_reports_insert_own ON public.greeting_reports
      FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'greeting_reports' AND policyname = 'greeting_reports_update_own') THEN
    CREATE POLICY greeting_reports_update_own ON public.greeting_reports
      FOR UPDATE USING (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'greeting_reports' AND policyname = 'greeting_reports_delete_own') THEN
    CREATE POLICY greeting_reports_delete_own ON public.greeting_reports
      FOR DELETE USING (auth.uid() = user_id);
  END IF;

  -- org_reports policies
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'org_reports' AND policyname = 'org_reports_select_own') THEN
    CREATE POLICY org_reports_select_own ON public.org_reports
      FOR SELECT USING (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'org_reports' AND policyname = 'org_reports_insert_own') THEN
    CREATE POLICY org_reports_insert_own ON public.org_reports
      FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'org_reports' AND policyname = 'org_reports_update_own') THEN
    CREATE POLICY org_reports_update_own ON public.org_reports
      FOR UPDATE USING (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'org_reports' AND policyname = 'org_reports_delete_own') THEN
    CREATE POLICY org_reports_delete_own ON public.org_reports
      FOR DELETE USING (auth.uid() = user_id);
  END IF;

  -- requirement_reports policies
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'requirement_reports' AND policyname = 'requirement_reports_select_own') THEN
    CREATE POLICY requirement_reports_select_own ON public.requirement_reports
      FOR SELECT USING (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'requirement_reports' AND policyname = 'requirement_reports_insert_own') THEN
    CREATE POLICY requirement_reports_insert_own ON public.requirement_reports
      FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'requirement_reports' AND policyname = 'requirement_reports_update_own') THEN
    CREATE POLICY requirement_reports_update_own ON public.requirement_reports
      FOR UPDATE USING (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'requirement_reports' AND policyname = 'requirement_reports_delete_own') THEN
    CREATE POLICY requirement_reports_delete_own ON public.requirement_reports
      FOR DELETE USING (auth.uid() = user_id);
  END IF;
END$$;


