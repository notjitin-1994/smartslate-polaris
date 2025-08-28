-- Needs Analysis Feature Tables
-- Run this migration in Supabase SQL editor

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Projects table
CREATE TABLE IF NOT EXISTS needs_projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  title TEXT NOT NULL,
  business_goal TEXT,
  success_metrics JSONB DEFAULT '{}',
  deadline DATE,
  budget_cap NUMERIC,
  languages TEXT[] DEFAULT '{}',
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'in_progress', 'completed', 'approved')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Stakeholders
CREATE TABLE IF NOT EXISTS needs_stakeholders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES needs_projects(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL,
  email TEXT,
  is_approver BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Audiences
CREATE TABLE IF NOT EXISTS needs_audiences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES needs_projects(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  size INTEGER,
  devices TEXT[] DEFAULT '{}',
  accessibility_needs TEXT[] DEFAULT '{}',
  locales TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Task Analysis Items
CREATE TABLE IF NOT EXISTS needs_task_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES needs_projects(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  frequency TEXT CHECK (frequency IN ('daily', 'weekly', 'monthly', 'quarterly', 'yearly')),
  impact TEXT CHECK (impact IN ('low', 'medium', 'high', 'critical')),
  current_error_rate NUMERIC,
  target_error_rate NUMERIC,
  root_causes TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Recommendations
CREATE TABLE IF NOT EXISTS needs_recommendations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES needs_projects(id) ON DELETE CASCADE NOT NULL,
  rationale TEXT NOT NULL,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'final', 'approved')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Blend Items
CREATE TABLE IF NOT EXISTS needs_blend_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recommendation_id UUID REFERENCES needs_recommendations(id) ON DELETE CASCADE NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('microlearning', 'guided_practice', 'job_aid', 'ilt', 'vilt', 'simulation')),
  parameters JSONB DEFAULT '{}',
  order_index INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Estimates
CREATE TABLE IF NOT EXISTS needs_estimates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES needs_projects(id) ON DELETE CASCADE NOT NULL,
  assumptions JSONB DEFAULT '{}',
  effort_hours JSONB DEFAULT '{}',
  timeline_days INTEGER,
  total_cost NUMERIC,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Risks
CREATE TABLE IF NOT EXISTS needs_risks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES needs_projects(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  mitigation TEXT,
  severity TEXT CHECK (severity IN ('low', 'medium', 'high')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Artifacts
CREATE TABLE IF NOT EXISTS needs_artifacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES needs_projects(id) ON DELETE CASCADE NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('report', 'sow', 'charter')),
  url TEXT,
  version INTEGER DEFAULT 1,
  approved_at TIMESTAMPTZ,
  approved_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_needs_projects_user_id ON needs_projects(user_id);
CREATE INDEX idx_needs_projects_status ON needs_projects(status);
CREATE INDEX idx_needs_stakeholders_project_id ON needs_stakeholders(project_id);
CREATE INDEX idx_needs_audiences_project_id ON needs_audiences(project_id);
CREATE INDEX idx_needs_task_items_project_id ON needs_task_items(project_id);
CREATE INDEX idx_needs_recommendations_project_id ON needs_recommendations(project_id);
CREATE INDEX idx_needs_blend_items_recommendation_id ON needs_blend_items(recommendation_id);
CREATE INDEX idx_needs_estimates_project_id ON needs_estimates(project_id);
CREATE INDEX idx_needs_risks_project_id ON needs_risks(project_id);
CREATE INDEX idx_needs_artifacts_project_id ON needs_artifacts(project_id);

-- Row Level Security (RLS)
ALTER TABLE needs_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE needs_stakeholders ENABLE ROW LEVEL SECURITY;
ALTER TABLE needs_audiences ENABLE ROW LEVEL SECURITY;
ALTER TABLE needs_task_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE needs_recommendations ENABLE ROW LEVEL SECURITY;
ALTER TABLE needs_blend_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE needs_estimates ENABLE ROW LEVEL SECURITY;
ALTER TABLE needs_risks ENABLE ROW LEVEL SECURITY;
ALTER TABLE needs_artifacts ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Projects: Users can only see their own projects
CREATE POLICY "Users can view own projects" ON needs_projects
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own projects" ON needs_projects
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own projects" ON needs_projects
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own projects" ON needs_projects
  FOR DELETE USING (auth.uid() = user_id);

-- For related tables: Users can access if they own the project
CREATE POLICY "Access via project ownership" ON needs_stakeholders
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM needs_projects
      WHERE needs_projects.id = needs_stakeholders.project_id
      AND needs_projects.user_id = auth.uid()
    )
  );

CREATE POLICY "Access via project ownership" ON needs_audiences
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM needs_projects
      WHERE needs_projects.id = needs_audiences.project_id
      AND needs_projects.user_id = auth.uid()
    )
  );

CREATE POLICY "Access via project ownership" ON needs_task_items
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM needs_projects
      WHERE needs_projects.id = needs_task_items.project_id
      AND needs_projects.user_id = auth.uid()
    )
  );

CREATE POLICY "Access via project ownership" ON needs_recommendations
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM needs_projects
      WHERE needs_projects.id = needs_recommendations.project_id
      AND needs_projects.user_id = auth.uid()
    )
  );

CREATE POLICY "Access via project ownership" ON needs_estimates
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM needs_projects
      WHERE needs_projects.id = needs_estimates.project_id
      AND needs_projects.user_id = auth.uid()
    )
  );

CREATE POLICY "Access via project ownership" ON needs_risks
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM needs_projects
      WHERE needs_projects.id = needs_risks.project_id
      AND needs_projects.user_id = auth.uid()
    )
  );

CREATE POLICY "Access via project ownership" ON needs_artifacts
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM needs_projects
      WHERE needs_projects.id = needs_artifacts.project_id
      AND needs_projects.user_id = auth.uid()
    )
  );

-- For blend items: Access via recommendation's project
CREATE POLICY "Access via recommendation ownership" ON needs_blend_items
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM needs_recommendations
      JOIN needs_projects ON needs_projects.id = needs_recommendations.project_id
      WHERE needs_recommendations.id = needs_blend_items.recommendation_id
      AND needs_projects.user_id = auth.uid()
    )
  );

-- Update timestamp trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_needs_projects_updated_at BEFORE UPDATE ON needs_projects
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_needs_recommendations_updated_at BEFORE UPDATE ON needs_recommendations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
