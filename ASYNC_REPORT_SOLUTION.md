# Async Report Generation for Long-Running Models

## Overview
When using high-quality models like `sonar-reasoning` that take 60-90+ seconds, you have three options to avoid timeouts:

## Option 1: Extended Polling (Implemented)

### How It Works
The system now automatically detects when you're using a reasoning model and extends timeouts accordingly:

```javascript
// In your .env
VITE_PERPLEXITY_FINAL_MODEL=sonar-reasoning
VITE_PERPLEXITY_PRELIM_MODEL=sonar-reasoning
```

**Features:**
- ✅ Automatic 90-second timeout for reasoning models
- ✅ 45-second timeout for standard models
- ✅ Smart detection based on model name
- ✅ Falls back to faster models if timeout occurs

## Option 2: True Async Mode (Recommended)

### Enable Async Mode
```javascript
// In browser console or your app initialization
localStorage.setItem('polaris_async_mode', 'true')
```

### How It Works
1. **Submit Report**: Job starts in background
2. **Return Immediately**: User sees "processing" message
3. **Check Later**: Auto-refresh or manual check
4. **Get Result**: Report appears when ready

### Benefits
- ✅ No waiting - immediate response
- ✅ Can navigate away and return
- ✅ Works with any timeout length
- ✅ Better user experience

## Option 3: Webhook Notifications (Future)

### Implementation Plan
```javascript
// When submitting job
const jobData = {
  prompt: enhancedPrompt,
  model: 'sonar-reasoning',
  webhook_url: 'https://yourapp.com/api/report-complete',
  email: user.email
}
```

### Notification Options
1. **Email**: Send report link when ready
2. **Push**: Browser/mobile notification
3. **Webhook**: Call your API endpoint
4. **SMS**: Text message with link

## Using the Async Component

### Basic Usage
```tsx
import { AsyncReportGenerator } from '@/pages/PolarisAsync'

function YourComponent() {
  return (
    <AsyncReportGenerator
      prompt={yourPrompt}
      model="sonar-reasoning"
      summaryId={summaryId}
      onComplete={(report) => {
        console.log('Report ready!', report)
      }}
    />
  )
}
```

### Check Status Later
```tsx
import { useAsyncReport } from '@/pages/PolarisAsync'

function StatusChecker({ summaryId }) {
  const { status, report, checkStatus } = useAsyncReport(summaryId)
  
  return (
    <div>
      <p>Status: {status}</p>
      {status === 'processing' && (
        <button onClick={checkStatus}>Check Now</button>
      )}
      {status === 'completed' && (
        <div>{report}</div>
      )}
    </div>
  )
}
```

## Configuration for Your Models

### For Maximum Quality (90+ seconds)
```env
# Use reasoning models with extended timeouts
VITE_PERPLEXITY_FINAL_MODEL=sonar-reasoning
VITE_PERPLEXITY_PRELIM_MODEL=sonar-reasoning
PPLX_SERVER_TIMEOUT_MS=110000  # 110 seconds

# Enable async mode in your app
# localStorage.setItem('polaris_async_mode', 'true')
```

### For Balanced Performance (30-45 seconds)
```env
# Use pro models with standard timeouts
VITE_PERPLEXITY_FINAL_MODEL=sonar-pro
VITE_PERPLEXITY_PRELIM_MODEL=sonar-pro
PPLX_SERVER_TIMEOUT_MS=60000  # 60 seconds
```

## Database Storage (Recommended)

For production, store async jobs in database:

```sql
-- Create jobs table
CREATE TABLE report_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  summary_id UUID REFERENCES polaris_summaries(id),
  status TEXT CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  model TEXT,
  prompt TEXT,
  result TEXT,
  error TEXT,
  percent INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Index for quick lookups
CREATE INDEX idx_report_jobs_user_status ON report_jobs(user_id, status);
CREATE INDEX idx_report_jobs_summary ON report_jobs(summary_id);
```

## Background Processing Options

### 1. Vercel Background Functions
```typescript
export const config = {
  maxDuration: 300, // 5 minutes
}

export async function POST(request: Request) {
  // Start background job
  const jobId = await startBackgroundJob(request.body)
  
  // Return immediately
  return Response.json({ jobId })
}
```

### 2. Queue Services
- **Upstash Queue**: Serverless queue with Vercel integration
- **AWS SQS**: For complex workflows
- **BullMQ**: Redis-based queue

### 3. Edge Functions
```typescript
// Runs up to 30 seconds on Edge
export const runtime = 'edge'

export async function POST(request: Request) {
  // Process in edge runtime
}
```

## User Experience Patterns

### Pattern 1: Progressive Loading
```tsx
// Show partial results immediately
const [prelimReport, setPrelimReport] = useState(null)
const [finalReport, setFinalReport] = useState(null)

// Load preliminary quickly
useEffect(() => {
  loadPreliminaryReport() // 20-30s
}, [])

// Load final in background
useEffect(() => {
  loadFinalReportAsync() // 60-90s
}, [prelimReport])
```

### Pattern 2: Email Delivery
```javascript
// Submit job with email
await submitJob({
  prompt,
  model: 'sonar-reasoning',
  notify_email: user.email
})

// User gets email when ready
```

### Pattern 3: Save & Continue
```javascript
// Save progress
localStorage.setItem('polaris_draft', JSON.stringify({
  stage: 'report_generating',
  jobId: jobId,
  timestamp: Date.now()
}))

// On return, check status
const draft = JSON.parse(localStorage.getItem('polaris_draft'))
if (draft?.jobId) {
  checkJobStatus(draft.jobId)
}
```

## Monitoring & Debugging

### Check Job Status
```javascript
// In console
fetch('/api/reportJobs?job_id=YOUR_JOB_ID')
  .then(r => r.json())
  .then(console.log)
```

### Monitor All Jobs
```javascript
// Add to your admin panel
async function getActiveJobs() {
  const jobs = localStorage.getItem('polaris_jobs')
  return Object.entries(JSON.parse(jobs || '{}'))
}
```

### Clear Stuck Jobs
```javascript
// Reset if needed
localStorage.removeItem('polaris_jobs')
localStorage.removeItem('polaris_async_mode')
```

## Summary

For your use case with `sonar-reasoning` models:

1. **Quick Fix**: Already implemented - extends timeout to 90 seconds
2. **Better UX**: Enable async mode - returns immediately
3. **Best Solution**: Database + background jobs - fully scalable

Choose based on your needs:
- **Development**: Extended timeouts work fine
- **Production**: Use async mode or background jobs
- **Scale**: Implement queue-based processing

The system now handles your chosen models gracefully!
