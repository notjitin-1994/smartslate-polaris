# Polaris Jobs System Documentation

## Overview
The Polaris Jobs System is a comprehensive job-based experience for managing L&D starmap generation. It provides users with the ability to track, resume, and manage their Polaris starmap generation sessions with a persistent, resumable state.

## Key Features

### 1. Job-Based Architecture
- Each starmap generation is tracked as a "job" with a unique ID
- Jobs maintain state across sessions, allowing users to resume where they left off
- All data and reports are tied to a master job that can be managed as a unit

### 2. Resumable Sessions
- Users can pause at any stage and resume later
- Session state is automatically saved, including:
  - Current stage progress
  - Form data entered
  - Generated reports
  - Dynamic questions and answers

### 3. Report Management
The system tracks 6 types of reports:
- **Greeting Report**: Initial contact and context information
- **Organization Report**: Company and organizational analysis  
- **Requirements Report**: Project requirements and constraints
- **Preliminary Report**: Initial analysis and recommendations
- **Dynamic Questionnaire**: Adaptive questions based on preliminary analysis
- **Final Report**: Complete L&D starmap report

### 4. Edit Tracking System
- Users get **3 total edits** distributed across ALL reports
- Edits can be made to any report at any time
- AI-assisted editing available for intelligent content improvements
- Full edit history tracking with versioning

### 5. Job Dashboard
- Central hub for viewing all jobs
- Statistics showing total jobs, completion rates, and edit usage
- Filter by status: Draft, Paused, Completed
- Quick actions: Resume, View Reports, Delete

## Database Schema

### Main Tables

#### `polaris_jobs`
Main table tracking job sessions with:
- Job metadata (title, company, experience level)
- Current stage and status tracking
- Edit counters (remaining/used)
- Stage data collection (greeting, org, requirements, dynamic)
- Generated reports storage
- Session state for resumability

#### `polaris_job_edits`
Tracks all edits made to reports:
- Links to parent job
- Report type being edited
- Original and edited content
- Edit number (1-3)
- AI assistance details if used

#### `polaris_job_reports`
Versioned report storage:
- Multiple versions per report type
- Current/historical version tracking
- Generation metadata (AI model, prompts)

#### `polaris_job_activity`
Activity log for user actions:
- Action tracking (started, resumed, edited, etc.)
- Stage transitions
- Detailed activity metadata

## User Experience Flow

### Creating a New Job
1. User navigates to `/polaris/jobs`
2. Clicks "Create New Starmap"
3. Enters initial information (experience level, company)
4. Proceeds through wizard stages

### Job Stages
1. **Greeting Stage**: Collect primary contact information
2. **Organization Stage**: Gather company details
3. **Requirements Stage**: Define project requirements
4. **Preliminary Report**: AI generates initial analysis
5. **Dynamic Questions**: Adaptive questionnaire based on analysis
6. **Final Report**: Complete starmap generation

### Resuming a Job
1. From dashboard, user sees paused jobs
2. Clicks "Resume" on desired job
3. Returns to exact stage where they left off
4. All previous data is restored

### Viewing and Editing Reports
1. User navigates to job viewer (`/polaris/job/{jobId}`)
2. Tabs display available reports
3. Click "Edit This Report" to modify content
4. Optional AI assistance for improvements
5. Save uses one of 3 available edits

## API Routes

### Job Management
- `GET /polaris/jobs` - List user's jobs
- `POST /polaris/jobs` - Create new job
- `GET /polaris/job/:id` - Get job details
- `PUT /polaris/job/:id` - Update job
- `DELETE /polaris/job/:id` - Delete job

### Report Operations  
- `GET /polaris/job/:id/reports` - Get job reports
- `POST /polaris/job/:id/report` - Save report
- `PUT /polaris/job/:id/report/:type` - Edit report

### Session Management
- `PUT /polaris/job/:id/session` - Save session state
- `POST /polaris/job/:id/resume` - Resume paused job

## Component Architecture

### Core Components

#### `PolarisJobsDashboard`
- Main dashboard for job management
- Statistics display
- Job filtering and sorting
- Quick actions (resume, view, delete)

#### `PolarisJobWizard`
- Multi-stage wizard for job creation
- Resume capability with state restoration
- Stage validation and progression
- Report generation integration

#### `PolarisJobViewer`  
- Report viewing interface
- Tab-based navigation
- Edit mode with AI assistance
- Version history display
- Edit tracking

### Services

#### `polarisJobsService.ts`
Core service managing:
- Job CRUD operations
- Stage data updates
- Report saving/editing
- Session state management
- Activity logging
- Statistics calculation

## Security & Permissions

### Row Level Security (RLS)
- Users can only access their own jobs
- Cascade deletion ensures data consistency
- Service role has full access for API operations

### Edit Limits
- Enforced at database level via triggers
- Cannot exceed 3 edits per job
- Edit history preserved for audit

## Migration Path

### From Legacy System
1. Run migration: `20240101000012_add_polaris_jobs.sql`
2. Optional: Link legacy summaries via `legacy_summary_id`
3. Users can continue with new job-based flow

## Best Practices

### For Users
1. **Save Progress**: System auto-saves, but manual save available
2. **Plan Edits**: Only 3 edits total - use wisely
3. **Use AI Assistance**: Leverage AI for better edit suggestions
4. **Complete Stages**: Finish each stage before moving forward

### For Developers  
1. **State Management**: Always save session state on navigation
2. **Error Handling**: Graceful fallbacks for resume failures
3. **Activity Logging**: Log all significant user actions
4. **Version Control**: Maintain report versions for history

## Troubleshooting

### Common Issues

#### Job Won't Resume
- Check job status isn't 'completed' or 'failed'
- Verify session state exists
- Ensure user owns the job

#### Edits Not Saving
- Verify edits remaining > 0
- Check report exists before editing
- Ensure proper content changes

#### Reports Not Generating
- Verify API keys configured
- Check stage data is complete
- Review error logs for AI service issues

## Future Enhancements

### Planned Features
1. **Collaborative Editing**: Multiple users per job
2. **Template Library**: Save and reuse job templates
3. **Export Options**: PDF, Word, PowerPoint exports
4. **Analytics Dashboard**: Usage patterns and insights
5. **Bulk Operations**: Manage multiple jobs at once
6. **Scheduled Generation**: Queue jobs for off-peak processing

### Potential Improvements
- Real-time collaboration
- Advanced search and filtering
- Custom edit limits per tier
- Report comparison tools
- Integration with external systems

## Support

For issues or questions:
1. Check this documentation
2. Review error messages in console
3. Contact support with job ID for investigation

## Appendix

### Status Definitions
- **Draft**: Active work in progress
- **Processing**: AI generation running
- **Paused**: User left, can resume
- **Completed**: All stages finished
- **Failed**: Error occurred
- **Cancelled**: User cancelled

### Stage Definitions  
- **greeting**: Initial data collection
- **organization**: Company information
- **requirements**: Project details
- **preliminary**: Initial AI report
- **dynamic_questions**: Adaptive Q&A
- **final_report**: Complete starmap
- **completed**: Job finished
