# Discovery Data Storage Implementation

## Overview

This implementation adds comprehensive data storage for the Polaris Starmap discovery process. All prompts, responses, dynamic questions, and answers are now saved to the database in a structured, well-formatted way for easy analysis and retrieval.

## Database Schema

### Tables Created

1. **`discovery_sessions`** - Main session tracking
   - Links to starmap jobs
   - Tracks session status and metadata
   - Stores company name and session title

2. **`discovery_prompts`** - All prompts sent to AI models
   - Links to sessions
   - Stores prompt type (initial_research, dynamic_questions, final_report)
   - Records AI provider and model used
   - Tracks token usage

3. **`discovery_responses`** - All responses from AI models
   - Links to prompts and sessions
   - Stores response text and structured JSON
   - Records processing time and token usage
   - Tracks AI provider and model

4. **`discovery_dynamic_qa`** - Dynamic questions and answers
   - Links to sessions
   - Stores question details (text, type, options)
   - Tracks user answers and response times
   - Groups questions by stage

## Data Flow

### 1. New Discovery Session Creation
When users visit `http://localhost:5174/discover/new`:
- **New job created**: A new starmap job is generated with unique ID
- **Discovery session initialized**: Automatically creates a discovery session linked to the job
- **Company name tracking**: Updates session when user enters organization name

### 2. Dynamic Questions Generation
When dynamic questions are generated:
- **Prompt saved**: The full system + user prompt sent to the AI
- **Response saved**: The AI's response with generated questions
- **Questions saved**: Individual questions stored in Q&A table
- **Provider tracked**: Records which AI provider/model was used

### 2. User Answers Dynamic Questions
When users answer dynamic questions:
- **Answers saved**: Real-time saving of user responses
- **Timestamps recorded**: When each question was answered
- **Progress tracked**: Which questions have been completed

### 3. Final Report Generation
When the final report is generated:
- **Prompt saved**: The comprehensive prompt sent for report generation
- **Response saved**: The complete generated report
- **Session completed**: Status updated to 'completed'

## Implementation Details

### Service Layer
- **`discoveryDataService`**: Main service for all database operations
- **Methods available**:
  - `createDiscoverySession()` - Create new session
  - `savePrompt()` - Save AI prompts
  - `saveResponse()` - Save AI responses
  - `saveDynamicQA()` - Save questions and answers
  - `updateDynamicAnswer()` - Update individual answers
  - `getCompleteSessionData()` - Retrieve full session data

### Integration Points
- **PolarisRevampedV4**: Main discovery page integration
- **Dynamic questions generation**: Automatic saving when questions are created
- **Answer collection**: Real-time saving as users respond
- **Final report**: Automatic saving when report is generated

### Data Format
All data is saved in a structured format:

```typescript
// Example session data
{
  session: {
    id: "uuid",
    user_id: "uuid", 
    starmap_job_id: "job_123",
    session_title: "Company Discovery",
    status: "completed"
  },
  prompts: [
    {
      prompt_type: "dynamic_questions",
      prompt_text: "SYSTEM: ...\nUSER: ...",
      ai_provider: "anthropic",
      ai_model: "claude-3-5-sonnet-latest"
    }
  ],
  responses: [
    {
      response_type: "dynamic_questions",
      response_text: "Generated questions...",
      response_json: { stages: [...] },
      processing_time_ms: 2500
    }
  ],
  dynamicQA: [
    {
      question_id: "q1",
      question_text: "What is your primary objective?",
      question_type: "textarea",
      answer_value: "Improve employee training"
    }
  ]
}
```

## Database Setup

1. Run the SQL migration script:
   ```sql
   -- Copy and paste the contents of database-migrations.sql
   -- into your Supabase SQL editor
   ```

2. The script creates:
   - All necessary tables with proper relationships
   - Indexes for performance
   - Row Level Security (RLS) policies
   - A summary view for easy data access

## Security

- **Row Level Security**: Users can only access their own discovery data
- **Proper relationships**: Foreign key constraints ensure data integrity
- **Input validation**: TypeScript types ensure data structure consistency

## Usage Examples

### Retrieving Discovery Data
```typescript
// Get complete session data
const sessionData = await discoveryDataService.getCompleteSessionData(sessionId)

// Get all sessions for a user
const sessions = await discoveryDataService.getUserSessions(userId)

// Get specific data types
const prompts = await discoveryDataService.getSessionPrompts(sessionId)
const responses = await discoveryDataService.getSessionResponses(sessionId)
const qa = await discoveryDataService.getSessionDynamicQA(sessionId)
```

### Creating New Sessions
```typescript
// Automatically created when discovery process starts
const session = await discoveryDataService.createDiscoverySession(
  userId,
  starmapJobId,
  "Company Name Discovery",
  "Acme Corp"
)
```

## Benefits

1. **Complete Audit Trail**: Every prompt and response is recorded
2. **Easy Analysis**: Well-structured data for reporting and analytics
3. **Debugging Support**: Full visibility into AI interactions
4. **User Experience**: Can resume sessions and review past discoveries
5. **Performance Insights**: Track processing times and token usage
6. **Data Export**: Easy to export discovery data for external analysis

## Future Enhancements

- **Analytics Dashboard**: Visualize discovery patterns and success rates
- **Template System**: Save successful discovery patterns as templates
- **Collaboration**: Share discovery sessions between team members
- **Export Features**: PDF/Word export of complete discovery sessions
- **Search**: Full-text search across all discovery data

## Files Modified/Created

### New Files
- `src/services/discoveryDataService.ts` - Main service implementation
- `src/types/database.types.ts` - Updated with new table types
- `database-migrations.sql` - Database setup script

### Modified Files
- `src/pages/PolarisRevampedV4.tsx` - Integrated discovery data saving
- Added data saving at key points in the discovery flow

## Testing

The implementation includes comprehensive error handling and will not break the existing discovery flow if database operations fail. All discovery data saving is done in try-catch blocks with appropriate logging.

To test:
1. **New Discovery**: Go to `http://localhost:5174/discover/new` to start a completely new discovery session
2. **Resume Discovery**: Go to `/discover/new?jobId=job_1756422834142_jhkwxoha` to resume an existing session
3. Complete the discovery flow (fill out forms, generate questions, answer them, generate final report)
4. Check the database tables to see all saved data
5. Use the service methods to retrieve and analyze the data

### URL Handling
- `http://localhost:5174/discover/new` - Creates new starmap job and discovery session
- `http://localhost:5174/discover/new?jobId=existing_id` - Resumes existing job and links to existing discovery session
- Both flows are fully supported with automatic data saving
