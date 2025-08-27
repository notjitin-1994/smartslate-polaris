# Starmap Async Job Implementation

## Overview
The new starmap creation process has been completely revamped to support asynchronous job processing, allowing users to:
- Start a starmap creation process
- Navigate away at any time
- Have the AI generation continue in the background
- Return later to view, edit, and manage their reports

## Key Features

### 1. **Async Job Processing**
- Reports are submitted to `/api/reportJobsDb` for background processing
- Jobs continue running even if the user navigates away
- Progress is tracked and displayed in real-time

### 2. **Persistent Session State**
- All form data is auto-saved to the database
- Users can resume exactly where they left off
- Session state includes current step, answers, and job status

### 3. **Job Management Dashboard**
- Central hub at `/portal/starmaps` to view all starmap jobs
- Filter by status: Draft, Processing, Completed, Failed
- Quick actions: Resume, View Report, Delete
- Visual progress indicators for each stage

### 4. **Real-time Status Updates**
- Automatic polling while jobs are processing
- Progress bar shows completion percentage
- Users see when their report is ready

## Technical Implementation

### Database Schema (`starmap_jobs` table)
```sql
- id: Unique job identifier
- status: draft, queued, processing, completed, failed
- stage tracking: stage1_complete, stage2_complete, etc.
- data storage: stage1_data, stage2_data, stage3_data
- reports: preliminary_report, final_report
- async tracking: report_job_id, report_job_status, report_job_progress
- session_state: Arbitrary JSON for resuming
```

### Service Layer (`starmapJobsService.ts`)
Key functions:
- `createStarmapJob()`: Initialize new job
- `updateStarmapJobStageData()`: Save form progress
- `submitStarmapJobForProcessing()`: Start async generation
- `checkAsyncJobStatus()`: Poll for completion
- `resumeStarmapJob()`: Resume interrupted session
- `saveSessionState()`: Persist current state

### UI Components

#### `PolarisRevampedV3.tsx` (Main Wizard)
- Auto-saves progress every 2 seconds of inactivity
- Resumes from URL parameter `?jobId=xxx`
- Shows processing status with progress bar
- Seamless navigation between steps

#### `StarmapJobsDashboard.tsx` (Job Manager)
- Lists all user's starmap jobs
- Shows statistics: Total, Completed, In Progress, Failed
- Visual progress indicators for each job
- Quick filtering by status

## User Experience Flow

### Creating a New Starmap
1. User navigates to `/discover`
2. System creates a new job with unique ID
3. User fills out forms (auto-saved)
4. After Stage 3, dynamic questions are generated
5. User submits for final report generation
6. Job processes in background (can navigate away)
7. User returns to see completed report

### Resuming a Job
1. User visits `/portal/starmaps` dashboard
2. Sees job with status and progress
3. Clicks "Resume" or "Check Status"
4. Returns to exact point where they left off
5. All data is restored from database

### Viewing Completed Reports
1. Jobs with status "completed" show "View Report"
2. Click to see the enhanced report display
3. Full markdown report with visualizations
4. Can export or share as needed

## Benefits

### For Users
- **No Lost Work**: Everything is auto-saved
- **Freedom to Navigate**: Can check other pages while processing
- **Resume Anytime**: Pick up exactly where you left off
- **Track Progress**: See all your starmaps in one place
- **No Timeouts**: Long-running AI models work perfectly

### For System
- **Better Resource Usage**: Jobs run asynchronously
- **Improved Reliability**: Resilient to browser crashes
- **Scalability**: Can handle many concurrent jobs
- **User Analytics**: Track completion rates and patterns

## Migration Notes

### From Previous Version
- Old starmaps remain accessible
- New jobs use the async system
- Can be linked via `legacy_summary_id` if needed

### Database Migration
Run: `supabase/migrations/20240101000013_add_starmap_jobs.sql`

## API Integration

### Async Processing Endpoint
```javascript
POST /api/reportJobsDb
{
  prompt: string,
  model: string,
  temperature: number,
  max_tokens: number,
  metadata: {
    starmap_job_id: string,
    report_type: 'preliminary' | 'final'
  }
}
```

### Status Checking
```javascript
GET /api/reportJobsDb?job_id=xxx
Returns: {
  status: 'queued' | 'running' | 'succeeded' | 'failed',
  percent: number,
  result?: string,
  error?: string
}
```

## Future Enhancements
1. Email notifications when jobs complete
2. Batch processing for multiple starmaps
3. Template system for quick starts
4. Collaborative editing
5. Version control for reports
6. Advanced analytics dashboard

## Troubleshooting

### Job Stuck in Processing
- Check `/api/reportJobsDb` endpoint status
- Verify job ID exists in database
- Review error logs for failures

### Data Not Saving
- Ensure user is authenticated
- Check browser console for errors
- Verify database connection

### Cannot Resume Job
- Confirm job ID is valid
- Check job status isn't 'completed'
- Ensure user owns the job

## Summary
The new async starmap implementation provides a robust, user-friendly experience for creating L&D starmaps. Users can start, stop, and resume at any time, with all progress automatically saved and reports generated in the background. This eliminates timeout issues and provides a professional, enterprise-ready solution.
