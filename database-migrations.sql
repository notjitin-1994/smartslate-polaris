-- =============================================
-- Migration: Add dynamic_questions to master_discovery
-- =============================================
-- Apply this in your Supabase SQL Editor or via psql.

-- Add JSONB column to store AI chat completion outputs
ALTER TABLE master_discovery
  ADD COLUMN IF NOT EXISTS dynamic_questions JSONB DEFAULT '[]'::JSONB;

-- Document the column purpose
COMMENT ON COLUMN master_discovery.dynamic_questions IS 'Stores AI dynamic questions/responses as JSONB (e.g., OpenAI chat completions).';

-- Optional: index for efficient JSONB querying
CREATE INDEX IF NOT EXISTS idx_master_discovery_dynamic_questions_gin
  ON master_discovery
  USING GIN (dynamic_questions);


-- =============================================
-- RPCs: Save dynamic answers with server-side JSONB merge
-- =============================================
CREATE OR REPLACE FUNCTION save_dynamic_answers(
  p_id UUID,
  p_answers JSONB
)
RETURNS VOID AS $$
BEGIN
  UPDATE master_discovery
  SET dynamic_answers = COALESCE(dynamic_answers, '{}'::JSONB) || COALESCE(p_answers, '{}'::JSONB),
      updated_at = NOW(),
      status = CASE WHEN status = 'draft' THEN 'in_progress' ELSE status END
  WHERE id = p_id
  AND user_id = auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION save_dynamic_stage_answers(
  p_id UUID,
  p_stage TEXT,
  p_answers JSONB
)
RETURNS VOID AS $$
BEGIN
  UPDATE master_discovery
  SET dynamic_answers = jsonb_set(
    COALESCE(dynamic_answers, '{}'::jsonb),
    ARRAY[p_stage],
    COALESCE(dynamic_answers->p_stage, '{}'::jsonb) || COALESCE(p_answers, '{}'::jsonb),
    true
  ),
  updated_at = NOW(),
  status = CASE WHEN status = 'draft' THEN 'in_progress' ELSE status END
  WHERE id = p_id
  AND user_id = auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Index to speed up queries on dynamic_answers
CREATE INDEX IF NOT EXISTS idx_master_discovery_dynamic_answers_gin
  ON master_discovery
  USING GIN (dynamic_answers);



-- =============================================
-- Migration: Add static_answers to master_discovery
-- =============================================
-- Add JSONB column to store static user answers in structured format
ALTER TABLE master_discovery
  ADD COLUMN IF NOT EXISTS static_answers JSONB DEFAULT '{}'::JSONB;

-- Document the column purpose
COMMENT ON COLUMN master_discovery.static_answers IS 'Structured static answers JSONB: { [stage_key]: { [question_id]: { question_id, question_text, user_answer } } }';

-- Optional: index for efficient JSONB querying
CREATE INDEX IF NOT EXISTS idx_master_discovery_static_answers_gin
  ON master_discovery
  USING GIN (static_answers);

-- =============================================
-- RPCs: Save static answers with server-side JSONB merge
-- =============================================
CREATE OR REPLACE FUNCTION save_static_answers(
  p_id UUID,
  p_answers JSONB
)
RETURNS VOID AS $$
BEGIN
  UPDATE master_discovery
  SET static_answers = COALESCE(static_answers, '{}'::JSONB) || COALESCE(p_answers, '{}'::JSONB),
      updated_at = NOW(),
      status = CASE WHEN status = 'draft' THEN 'in_progress' ELSE status END
  WHERE id = p_id
  AND user_id = auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Nested stage merge function for static answers
CREATE OR REPLACE FUNCTION save_static_stage_answers(
  p_id UUID,
  p_stage TEXT,
  p_answers JSONB
)
RETURNS VOID AS $$
BEGIN
  UPDATE master_discovery
  SET static_answers = jsonb_set(
    COALESCE(static_answers, '{}'::jsonb),
    ARRAY[p_stage],
    COALESCE(static_answers->p_stage, '{}'::jsonb) || COALESCE(p_answers, '{}'::jsonb),
    true
  ),
  updated_at = NOW(),
  status = CASE WHEN status = 'draft' THEN 'in_progress' ELSE status END
  WHERE id = p_id
  AND user_id = auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- =============================================
-- Migration: Drop deprecated individual static columns from master_discovery
-- =============================================
ALTER TABLE master_discovery
  DROP COLUMN IF EXISTS full_name,
  DROP COLUMN IF EXISTS work_email,
  DROP COLUMN IF EXISTS role_title,
  DROP COLUMN IF EXISTS phone_number,
  DROP COLUMN IF EXISTS preferred_contact_method,
  DROP COLUMN IF EXISTS context_goals,
  DROP COLUMN IF EXISTS group_name,
  DROP COLUMN IF EXISTS group_type,
  DROP COLUMN IF EXISTS industry,
  DROP COLUMN IF EXISTS group_size,
  DROP COLUMN IF EXISTS primary_stakeholders,
  DROP COLUMN IF EXISTS desired_outcomes,
  DROP COLUMN IF EXISTS timeline_target,
  DROP COLUMN IF EXISTS constraints_notes;
