-- Track lifetime number of starmaps a user has created
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS starmaps_created INTEGER NOT NULL DEFAULT 0;

-- Backfill existing rows with 0 if null (defensive)
UPDATE public.profiles SET starmaps_created = 0 WHERE starmaps_created IS NULL;

-- Helpful index (not strictly necessary but cheap)
CREATE INDEX IF NOT EXISTS idx_profiles_starmaps_created ON public.profiles(starmaps_created);


