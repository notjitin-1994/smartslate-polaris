# Starmaps Master Table Implementation

## Overview

The `starmaps_master` table is a comprehensive database table that stores all starmap-related data in a single, well-structured location. This includes static questions, dynamic questions, user answers, prompts, reports, and progress tracking.

## Key Features

### 1. Complete Data Storage
- **Static Questions & Answers**: Predefined questions and user responses
- **Dynamic Questions & Answers**: AI-generated questions based on initial responses
- **Prompts**: Both dynamic question generation prompts and final report prompts
- **Reports**: Final generated reports and preliminary reports
- **Progress Tracking**: Detailed progress with percentage and current step tracking
- **Status Management**: Comprehensive workflow states from draft to completion

### 2. Database Schema

The table includes the following key fields:

```sql
- id (UUID): Primary key
- user_id (UUID): User association
- starmap_job_id (TEXT): Unique job identifier
- title, description: Basic metadata
- static_questions (JSONB): Array of static questions
- static_answers (JSONB): Object mapping question IDs to answers
- dynamic_questions_prompt (TEXT): Prompt used to generate dynamic questions
- dynamic_questions (JSONB): Array of dynamic questions
- dynamic_answers (JSONB): Object mapping question IDs to answers
- final_prompt (TEXT): Prompt for final report generation
- final_report (TEXT): Generated report content
- status (TEXT): Current workflow status
- progress_percentage (INTEGER): 0-100 progress indicator
- Various timestamps and metadata fields
```

### 3. Status Workflow

The starmap follows this workflow:

1. `draft` - Initial creation
2. `generating_static_questions` - Creating initial questions
3. `awaiting_static_answers` - Waiting for user input
4. `generating_dynamic_questions` - AI generating follow-up questions
5. `awaiting_dynamic_answers` - Waiting for additional input
6. `generating_report` - Creating final report
7. `review` - Report ready for review
8. `completed` - Process complete
9. `failed` / `cancelled` / `archived` - Alternative end states

## Usage Examples

### 1. Creating a New Starmap

```typescript
import { starmapsMasterService } from '@/services/starmapsMasterService';

const newStarmap = await starmapsMasterService.createStarmap({
  starmap_job_id: `job-${Date.now()}`,
  title: 'Strategic Planning Assessment',
  description: 'Q4 2024 strategic planning',
  static_questions: [
    {
      id: 'org_name',
      question: 'What is your organization name?',
      type: 'text',
      required: true
    },
    {
      id: 'industry',
      question: 'What is your primary industry?',
      type: 'select',
      options: ['Technology', 'Healthcare', 'Finance', 'Other'],
      required: true
    }
  ],
  category: 'strategic-planning',
  tags: ['planning', 'strategy', 'q4-2024']
});
```

### 2. Using React Hooks

```tsx
import { useStarmapsMaster } from '@/hooks/useStarmapsMaster';

function MyComponent() {
  const {
    starmap,
    loading,
    error,
    saveAnswers,
    updateProgress,
    saveFinalReport
  } = useStarmapsMaster({ starmapId: 'some-id' });

  // Save static answers
  const handleSaveAnswers = async () => {
    await saveAnswers('static', {
      org_name: 'Acme Corp',
      industry: 'Technology'
    });
  };

  // Update progress
  await updateProgress('Processing responses', 45);

  // Save final report
  await saveFinalReport('# Strategic Report\n\n...');
}
```

### 3. Listing User's Starmaps

```tsx
import { useStarmapsList } from '@/hooks/useStarmapsMaster';

function StarmapsList() {
  const { starmaps, totalCount, loading } = useStarmapsList(
    1, // page
    10, // pageSize
    { status: 'in_progress' } // filters
  );

  return (
    <div>
      {starmaps.map(starmap => (
        <div key={starmap.id}>
          <h3>{starmap.title}</h3>
          <p>Status: {starmap.status}</p>
          <p>Progress: {starmap.progress_percentage}%</p>
        </div>
      ))}
    </div>
  );
}
```

### 4. Direct Service Usage

```typescript
// Get starmap by job ID
const { data: starmap } = await starmapsMasterService.getStarmapByJobId('job-123');

// Update status
await starmapsMasterService.updateStarmapStatus(starmapId, 'generating_report');

// Set dynamic questions
await starmapsMasterService.setDynamicQuestions(starmapId, dynamicQuestions, prompt);

// Get user statistics
const { data: stats } = await starmapsMasterService.getUserStarmapStats();
console.log(`Total: ${stats.total}, Completed: ${stats.completed}`);
```

## Migration Instructions

To apply the migration to your database:

1. **Run the migration SQL**:
   ```bash
   psql -d your_database -f starmaps_master_migration.sql
   ```

2. **Or via Supabase Dashboard**:
   - Go to SQL Editor in Supabase Dashboard
   - Copy the contents of `starmaps_master_migration.sql`
   - Run the query

3. **Verify the migration**:
   ```sql
   -- Check table exists
   SELECT * FROM starmaps_master LIMIT 1;
   
   -- Check policies
   SELECT * FROM pg_policies WHERE tablename = 'starmaps_master';
   
   -- Check functions
   SELECT proname FROM pg_proc WHERE proname LIKE '%starmap%';
   ```

## TypeScript Types

The implementation includes comprehensive TypeScript types:

```typescript
import type { 
  StarmapsMaster,
  StarmapStatus,
  StarmapQuestion,
  StarmapAnswers,
  CreateStarmapDto,
  UpdateStarmapDto
} from '@/types/starmaps-master';
```

## Security Features

1. **Row Level Security (RLS)**: Users can only access their own starmaps
2. **Trigger-based validation**: Ensures data integrity
3. **Automatic timestamp management**: Tracks creation, updates, and completion
4. **Published starmaps**: Optional public visibility with `is_published` flag

## Best Practices

1. **Always use transactions** for multi-step operations
2. **Update progress regularly** to provide user feedback
3. **Handle errors gracefully** and update status to 'failed' with error details
4. **Use appropriate indexes** - the table includes indexes for common queries
5. **Leverage the summary view** for listing operations to improve performance

## Troubleshooting

### Common Issues

1. **Permission Denied**
   - Ensure RLS policies are properly set
   - Check user authentication

2. **Invalid Status Transition**
   - Follow the proper workflow sequence
   - Use the service methods which handle transitions

3. **Performance Issues**
   - Use the `starmaps_master_summary` view for listings
   - Ensure indexes are created properly

## Future Enhancements

Consider these potential improvements:

1. **Collaboration features**: Multiple users working on same starmap
2. **Template system**: Reusable question sets
3. **Version history**: Track all changes over time
4. **Export functionality**: PDF/Word report generation
5. **Analytics dashboard**: Aggregate insights across starmaps

## Support

For questions or issues:
1. Check the example component at `src/components/StarmapMasterExample.tsx`
2. Review the service implementation at `src/services/starmapsMasterService.ts`
3. Examine the TypeScript types at `src/types/starmaps-master.ts`
