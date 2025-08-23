# Polaris Starmaps Feature Setup

## Overview
This feature allows users to save and access their Polaris Guided Discovery starmaps. Each starmap is stored in the database and is accessible only to the user who created it.

## Features Implemented

### 1. **Save Starmaps**
- Automatically saves each final starmap when generated in Polaris
- Stores all user inputs from all three stages
- Preserves the company name and full analysis

### 2. **Recent Starmaps in Sidebar**
- Shows the last 3 recent starmaps in the sidebar
- Quick access to view starmaps
- Link to view all starmaps

### 3. **Starmaps Page**
- View all saved starmaps in one place
- Search and filter capabilities
- Download starmaps as markdown files
- Delete unwanted starmaps
- View detailed discovery inputs for each starmap

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
2. **`src/services/polarisSummaryService.ts`** - Service for managing starmaps
3. **`src/pages/AllBriefings.tsx`** - Page to view all starmaps
4. **`supabase/migrations/20240101000000_create_polaris_summaries.sql`** - Database migration

### Modified Files:
1. **`src/pages/Polaris.tsx`** - Added starmap saving functionality
2. **`src/portal/PortalPage.tsx`** - Added recent starmaps to sidebar
3. **`src/router/AppRouter.tsx`** - Added route for starmaps page

## Usage

### For Users:
1. Complete a Polaris discovery session
2. The starmap is automatically saved when generated
3. Access recent starmaps from the sidebar
4. Click "View all starmaps" to see all saved starmaps
5. From the starmaps page, you can:
   - View full starmap details
   - Download starmaps as markdown
   - Delete unwanted starmaps
   - View all inputs from the discovery process

### Navigation:
- **Recent Starmaps**: Visible in the sidebar (shows last 3)
- **Starmaps**: `/portal/starmaps`
- **New Discovery**: Click "New Discovery" button from starmaps page

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

### If starmaps are not saving:
1. Check that the database migration has been run
2. Verify user is authenticated
3. Check browser console for errors
4. Ensure Supabase environment variables are configured

### If starmaps are not visible:
1. Verify RLS policies are enabled
2. Check that user is logged in
3. Refresh the page to reload summaries

## Future Enhancements
- Search and filter starmaps
- Export starmaps to PDF
- Share starmaps with team members
- Add tags and categories
- Starmap templates
