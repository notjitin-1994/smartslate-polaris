-- QUICK FIX FOR PROFILES TABLE ISSUES
-- Run this entire script in Supabase SQL Editor

-- Step 1: Create polaris_summaries table if it doesn't exist
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

-- Create indexes for polaris_summaries
CREATE INDEX IF NOT EXISTS idx_polaris_summaries_user_id ON public.polaris_summaries(user_id);
CREATE INDEX IF NOT EXISTS idx_polaris_summaries_created_at ON public.polaris_summaries(created_at DESC);

-- Enable RLS for polaris_summaries
ALTER TABLE public.polaris_summaries ENABLE ROW LEVEL SECURITY;

-- Create policies for polaris_summaries
DROP POLICY IF EXISTS "Users can view own summaries" ON public.polaris_summaries;
DROP POLICY IF EXISTS "Users can insert own summaries" ON public.polaris_summaries;
DROP POLICY IF EXISTS "Users can update own summaries" ON public.polaris_summaries;
DROP POLICY IF EXISTS "Users can delete own summaries" ON public.polaris_summaries;

CREATE POLICY "Users can view own summaries" ON public.polaris_summaries
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own summaries" ON public.polaris_summaries
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own summaries" ON public.polaris_summaries
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own summaries" ON public.polaris_summaries
  FOR DELETE USING (auth.uid() = user_id);

-- Step 2: Fix profiles table
-- First, check if table exists and add missing columns
DO $$ 
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'profiles') THEN
        -- Add missing columns one by one
        BEGIN
            ALTER TABLE public.profiles ADD COLUMN username TEXT UNIQUE;
        EXCEPTION WHEN duplicate_column THEN NULL;
        END;
        
        BEGIN
            ALTER TABLE public.profiles ADD COLUMN full_name TEXT;
        EXCEPTION WHEN duplicate_column THEN NULL;
        END;
        
        BEGIN
            ALTER TABLE public.profiles ADD COLUMN job_title TEXT;
        EXCEPTION WHEN duplicate_column THEN NULL;
        END;
        
        BEGIN
            ALTER TABLE public.profiles ADD COLUMN company TEXT;
        EXCEPTION WHEN duplicate_column THEN NULL;
        END;
        
        BEGIN
            ALTER TABLE public.profiles ADD COLUMN website TEXT;
        EXCEPTION WHEN duplicate_column THEN NULL;
        END;
        
        BEGIN
            ALTER TABLE public.profiles ADD COLUMN location TEXT;
        EXCEPTION WHEN duplicate_column THEN NULL;
        END;
        
        BEGIN
            ALTER TABLE public.profiles ADD COLUMN country TEXT;
        EXCEPTION WHEN duplicate_column THEN NULL;
        END;
        
        BEGIN
            ALTER TABLE public.profiles ADD COLUMN bio TEXT;
        EXCEPTION WHEN duplicate_column THEN NULL;
        END;
        
        BEGIN
            ALTER TABLE public.profiles ADD COLUMN created_at TIMESTAMPTZ DEFAULT now() NOT NULL;
        EXCEPTION WHEN duplicate_column THEN NULL;
        END;
        
        BEGIN
            ALTER TABLE public.profiles ADD COLUMN updated_at TIMESTAMPTZ DEFAULT now() NOT NULL;
        EXCEPTION WHEN duplicate_column THEN NULL;
        END;
    ELSE
        -- Create the table if it doesn't exist
        CREATE TABLE public.profiles (
            id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
            username TEXT UNIQUE,
            full_name TEXT,
            job_title TEXT,
            company TEXT,
            website TEXT,
            location TEXT,
            country TEXT,
            bio TEXT,
            created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
            updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
        );
    END IF;
END $$;

-- Create index on username
CREATE INDEX IF NOT EXISTS idx_profiles_username ON public.profiles(username);

-- Enable RLS for profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Create policies for profiles
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can delete own profile" ON public.profiles;

CREATE POLICY "Profiles are viewable by everyone" ON public.profiles
  FOR SELECT USING (true);
CREATE POLICY "Users can insert own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can delete own profile" ON public.profiles
  FOR DELETE USING (auth.uid() = id);

-- Step 3: Create profiles for existing users
INSERT INTO public.profiles (id, full_name)
SELECT 
  id,
  COALESCE(raw_user_meta_data->>'full_name', raw_user_meta_data->>'name', email)
FROM auth.users
WHERE id NOT IN (SELECT id FROM public.profiles)
ON CONFLICT (id) DO NOTHING;

-- Success message
DO $$ 
BEGIN
    RAISE NOTICE 'Tables successfully created/fixed!';
    RAISE NOTICE 'profiles table ready: %', EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'profiles');
    RAISE NOTICE 'polaris_summaries table ready: %', EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'polaris_summaries');
END $$;
