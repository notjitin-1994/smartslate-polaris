# Quick Start Guide - Polaris

## Prerequisites

1. Node.js 20+
2. Supabase account with project created
3. Anthropic API key (for Claude)

## Setup Instructions

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment
Create a `.env` file in the project root (copy from `env.example`) and fill values:

```env
# Supabase Configuration (required)
VITE_SUPABASE_URL=your_supabase_url_here
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key_here

# LLM Configuration (required)
VITE_LLM_PROVIDER=anthropic
VITE_ANTHROPIC_API_KEY=your_anthropic_api_key_here
VITE_ANTHROPIC_MODEL=claude-3-5-sonnet-latest
VITE_ANTHROPIC_MAX_TOKENS=12000

# Perplexity Configuration (required for research)
VITE_PERPLEXITY_API_KEY=your_perplexity_api_key
```

### 3. Run Database Migrations
Execute the migrations in your Supabase SQL editor:

```sql
-- Run these in order:
-- 1. Create polaris_summaries table (20240101000000_create_polaris_summaries.sql)
-- 2. Create profiles table (20240101000001_create_profiles.sql)
-- 3. Fix profiles table (20240101000002_fix_profiles_table.sql)
-- 4. Add report_title field (20240101000003_add_report_title.sql)
-- 5. Add research reports (20240101000004_add_research_reports.sql)
-- 6. Add AI edit sessions (20240101000005_add_ai_edit_sessions.sql) - NEW!
```

The new migrations add:
- Research report storage fields
- Edited content field
- Edit tracking fields
- AI edit sessions table with history tracking

### 4. Start Development Server
```bash
npm run dev
```

Visit `http://localhost:5173`

## Testing the New Flow

### Step 1: Authentication
1. Sign up or log in at `/login`
2. You'll be redirected to the portal

### Step 2: Start Starmap Creation
1. The home page (`/`) now shows the revamped flow
2. Select your experience level (Novice/Intermediate/Expert)

### Step 3: Three-Stage Static Intake

**Stage 1 - Your Details**
- Enter your name, role, department
- Email is prefilled from auth
- Add optional phone and timezone
- Click Continue → Triggers Perplexity research

**Stage 2 - Organisation Information**
- Enter organization details
- Select industry and size
- Add compliance requirements
- Click Continue → Triggers Perplexity research

**Stage 3 - Project Scoping**
- Define objectives and constraints
- Describe target audience
- Set timeline and budget
- Click Continue → Triggers final research

### Step 4: Dynamic Questions
- 2-4 stages of AI-generated questions
- Questions are informed by research
- Each stage has 6-9 questions
- Mixed input types (text, select, slider, etc.)

### Step 5: Report Generation
- Comprehensive report auto-generates
- Includes all sections per requirements
- Research insights are incorporated

### Step 6: Edit Report with Solara Lodestar (New Feature!)
1. Click "Edit Report" button
2. Toggle "Solara Lodestar" for intelligent editing help
3. Make up to 3 AI-powered edits per report:
   - Type natural language requests like "Make the executive summary more concise"
   - AI maintains all sections and formatting
   - Use undo/redo to navigate changes
4. Or use the rich text editor for manual edits
5. Format with bold, italic, lists, links
6. Save changes when done
7. Report shows "(Edited)" indicator

## Viewing Saved Starmaps
1. Go to `/portal/starmaps` to see all starmaps
2. Click any starmap to view details
3. Edit mode available on detail page too

## Testing Error Scenarios

### Test Research Timeout
1. Disconnect network after entering Stage 1
2. System should continue with fallback text

### Test Save Limit
1. Create 10 starmaps (free tier limit)
2. 11th attempt shows upgrade modal

### Test Edit Persistence
1. Edit a report and save
2. Navigate away and return
3. Edited content should persist

## Common Issues & Solutions

### "Supabase not configured"
- Ensure `.env` file has correct Supabase credentials
- Check Supabase project is active

### "LLM call failed"
- Verify Anthropic API key is valid
- Check API usage limits

### "Perplexity research failed"
- The hardcoded key should work
- If not, system continues with placeholders

### Database errors
- Run all migrations in order
- Check Supabase RLS policies

## API Endpoints

The app uses these serverless functions:
- `/api/anthropic` - Claude LLM calls
- `/api/perplexity` - Research calls (new)
- `/api/openai` - OpenAI fallback

## Development Tips

1. **Hot Reload**: Changes auto-refresh in browser
2. **TypeScript**: Full type safety enabled
3. **Tailwind**: Use utility classes for styling
4. **Components**: Reusable UI in `/components`

## Production Deployment

### Vercel Deployment
```bash
vercel
```

### Environment Variables
Set in Vercel dashboard:
- All `VITE_*` variables
- Remove hardcoded Perplexity key
- Use production Supabase credentials

## Support

For issues or questions:
1. Check `IMPLEMENTATION_SUMMARY.md` for technical details
2. Review error messages in browser console
3. Check Supabase logs for database issues
4. Verify API keys are valid and have credits

## Next Steps

After testing the basic flow:
1. Customize the research prompts in `perplexityService.ts`
2. Adjust dynamic question generation in `PolarisRevamped.tsx`
3. Modify report template in `formatReportAsMarkdown()`
4. Style the UI with your brand colors
5. Add analytics tracking for user behavior

---

**Note**: The Perplexity API key (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) is configured and ready to use. For production, consider implementing server-side API proxy for security.
