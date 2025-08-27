## Fix for 400 Error

The error occurs because the 'profiles' table doesn't exist in your database.

### To fix this:

1. Run the new migration I just created:
   ```bash
   supabase db push
   ```

   Or apply both SQL files in your Supabase Dashboard:
   - First: `20240101000000_create_polaris_summaries.sql`
   - Second: `20240101000001_create_profiles.sql`

2. The profiles table will be created with:
   - User profile fields (username, full_name, job_title, etc.)
   - Automatic profile creation when users sign up
   - Proper security policies

### What the profiles table does:
- Stores user profile information (name, company, bio, etc.)
- Used in the Portal page to display user information
- Enables the public profile feature
- Automatically creates a profile entry when a new user signs up

After running the migration, the 400 error should be resolved.
