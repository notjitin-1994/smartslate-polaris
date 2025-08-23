# Polaris Summaries Feature Setup

## Overview
This feature allows users to save and access their Polaris Guided Discovery summaries. Each summary is stored in the database and is accessible only to the user who created it.

## Features Implemented

### 1. **Save Summaries**
- Automatically saves each final summary when generated in Polaris
- Stores all user inputs from all three stages
- Preserves the company name and full analysis

### 2. **Recent Summaries in Sidebar**
- Shows the last 3 recent summaries in the sidebar
- Quick access to view summaries
- Link to view all summaries

### 3. **All Summaries Page**
- View all saved summaries in one place
- Search and filter capabilities
- Download summaries as markdown files
- Delete unwanted summaries
- View detailed discovery inputs for each summary

## Database Setup

### 1. Create the Database Table

Run the migration file to create the `polaris_summaries` table:

```bash
# Using Supabase CLI
supabase db push

# Or run the SQL directly in Supabase Dashboard
```

The migration creates:
- `polaris_summaries` table with all necessary columns
- Indexes for performance
- Row Level Security (RLS) policies to ensure users can only access their own summaries

### 2. Migration SQL Location
The migration file is located at:
```
supabase/migrations/20240101000000_create_polaris_summaries.sql
```

## File Structure

### New Files Created:
1. **`src/types/database.types.ts`** - Database type definitions
2. **`src/services/polarisSummaryService.ts`** - Service for managing summaries
3. **`src/pages/AllSummaries.tsx`** - Page to view all summaries
4. **`supabase/migrations/20240101000000_create_polaris_summaries.sql`** - Database migration

### Modified Files:
1. **`src/pages/Polaris.tsx`** - Added summary saving functionality
2. **`src/portal/PortalPage.tsx`** - Added recent summaries to sidebar
3. **`src/router/AppRouter.tsx`** - Added route for all summaries page

## Usage

### For Users:
1. Complete a Polaris discovery session
2. The summary is automatically saved when generated
3. Access recent summaries from the sidebar
4. Click "View all summaries" to see all saved summaries
5. From the summaries page, you can:
   - View full summary details
   - Download summaries as markdown
   - Delete unwanted summaries
   - View all inputs from the discovery process

### Navigation:
- **Recent Summaries**: Visible in the sidebar (shows last 3)
- **All Summaries**: `/portal/summaries`
- **New Discovery**: Click "New Discovery" button from summaries page

## Security
- Row Level Security (RLS) ensures users can only see their own summaries
- Each summary is tied to the authenticated user's ID
- Summaries are private and not accessible to other users

## Technical Details

### Database Schema:
```sql
polaris_summaries:
  - id (UUID, primary key)
  - user_id (UUID, foreign key to auth.users)
  - company_name (TEXT, nullable)
  - summary_content (TEXT)
  - stage1_answers (JSONB)
  - stage2_answers (JSONB)
  - stage3_answers (JSONB)
  - stage2_questions (JSONB)
  - stage3_questions (JSONB)
  - created_at (TIMESTAMPTZ)
```

### API Functions:
- `saveSummary()` - Save a new summary
- `getRecentSummaries()` - Get last N summaries
- `getAllSummaries()` - Get all user's summaries
- `getSummaryById()` - Get specific summary
- `deleteSummary()` - Delete a summary

## Troubleshooting

### If summaries are not saving:
1. Check that the database migration has been run
2. Verify user is authenticated
3. Check browser console for errors
4. Ensure Supabase environment variables are configured

### If summaries are not visible:
1. Verify RLS policies are enabled
2. Check that user is logged in
3. Refresh the page to reload summaries

## Future Enhancements
- Search and filter summaries
- Export summaries to PDF
- Share summaries with team members
- Add tags and categories
- Summary templates
