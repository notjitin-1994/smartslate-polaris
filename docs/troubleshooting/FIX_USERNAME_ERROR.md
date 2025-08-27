# Fix for "column username does not exist" Error

## The Problem
The error `ERROR: 42703: column "username" does not exist` occurs because:
- A `profiles` table already exists in your database
- But it's missing the `username` column (and possibly other columns)
- This can happen if a partial migration ran previously

## Solution Options

### Option 1: Clean Slate (Recommended if no important data)
Run the updated migration that drops and recreates the table:

```sql
-- In Supabase SQL Editor, run:
-- File: 20240101000001_create_profiles.sql
```

This will:
- Drop the existing profiles table
- Create a fresh table with all columns
- Set up proper indexes and policies
- Create profiles for existing users

### Option 2: Preserve Existing Data
Run the fix migration that adds missing columns:

```sql
-- In Supabase SQL Editor, run:
-- File: 20240101000002_fix_profiles_table.sql
```

This will:
- Check if profiles table exists
- Add only the missing columns (username, etc.)
- Preserve any existing data
- Set up proper indexes and policies

## Steps to Apply

1. **Go to Supabase Dashboard** → SQL Editor

2. **Choose your approach:**
   - **If you don't have important profile data:** Run `20240101000001_create_profiles.sql`
   - **If you want to preserve existing data:** Run `20240101000002_fix_profiles_table.sql`

3. **After running the migration:**
   - The 400 error should be resolved
   - The profiles table will have all necessary columns
   - User profiles will work correctly

## What These Migrations Do

### Profiles Table Structure:
```sql
profiles:
  - id (UUID, links to auth.users)
  - username (TEXT, unique)
  - full_name (TEXT)
  - job_title (TEXT)
  - company (TEXT)
  - website (TEXT)
  - location (TEXT)
  - country (TEXT)
  - bio (TEXT)
  - created_at (TIMESTAMPTZ)
  - updated_at (TIMESTAMPTZ)
```

### Security:
- Row Level Security (RLS) enabled
- Users can view all profiles (for public profiles)
- Users can only edit their own profile

## Testing
After applying the fix:
1. Refresh your application
2. The 400 error should be gone
3. User profiles should load correctly
4. Profile editing should work
