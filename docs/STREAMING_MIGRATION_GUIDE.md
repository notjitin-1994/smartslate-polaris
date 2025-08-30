# Streaming AI Report Generation - Migration Guide

## Overview

The new streaming architecture provides:
- Progressive report generation with real-time updates
- Database persistence at each stage
- Automatic recovery from failures
- Better user experience with visible progress

## Architecture Changes

### Before (All-or-Nothing Approach)
```typescript
// Old approach - single API call that could fail entirely
const report = await aiClient.generateReport(data);
```

### After (Streaming Approach)
```typescript
// New approach - progressive generation with saves
const streamId = await streamingAIService.createStreamingJob(jobId, userId, 'report', data);
streamingAIService.subscribe(streamId, (progress) => {
  // Real-time updates saved to database
});
```

## Key Components

### 1. StreamingAIService
Located at `src/services/streamingAIService.ts`

- Manages progressive report generation
- Saves each stage to IndexedDB
- Provides real-time progress updates
- Supports resume functionality

### 2. Enhanced Services
- `clientReportServiceV2.ts` - Reports with streaming
- `clientStarmapServiceV2.ts` - Starmap reports with streaming

### 3. React Integration
- `useStreamingReport` hook - Manages streaming state
- `StreamingReportProgress` component - Visualizes progress
- `StarmapJobCardV2` - Example implementation

## Migration Steps

### 1. Update Database Schema
The IndexedDB schema has been updated to include a `streaming_jobs` store. This happens automatically on first load.

### 2. Replace Service Calls

#### Old Way:
```typescript
// In your component
const { report } = await clientStarmapService.generateComprehensiveReport(jobId);
```

#### New Way:
```typescript
// In your component
import { useStreamingReport } from '@/hooks/useStreamingReport';
import { clientStarmapServiceV2 } from '@/services/clientStarmapServiceV2';

const MyComponent = () => {
  const streamingReport = useStreamingReport({
    onStageComplete: (stage, data) => {
      console.log(`Completed: ${stage}`);
    }
  });

  const handleGenerate = async () => {
    await clientStarmapServiceV2.generateStreamingReport(jobId, {
      onProgress: streamingReport.handleProgress,
      onComplete: streamingReport.handleComplete,
      onError: streamingReport.handleError
    });
  };

  return (
    <StreamingReportProgress reportState={streamingReport} />
  );
};
```

### 3. Update UI Components

Replace static progress indicators with the streaming progress component:

```tsx
import { StreamingReportProgress } from '@/components/StreamingReportProgress';

// In your render
<StreamingReportProgress
  reportState={streamingReport}
  showDetails={true}
  onRetry={handleRetry}
/>
```

## Benefits

### 1. Reliability
- Each stage is saved to the database
- If a stage fails, only that stage needs to be retried
- Users don't lose progress on network errors

### 2. User Experience
- Real-time progress updates
- Visible stage completion
- Estimated time remaining
- Clear error messages per stage

### 3. Cost Efficiency
- Failed stages can be resumed without regenerating everything
- Better tracking of AI costs per stage
- Ability to cancel mid-generation

## API Reference

### StreamingAIService

```typescript
// Create a new streaming job
createStreamingJob(
  jobId: string,
  userId: string,
  type: 'report' | 'starmap',
  inputData: any
): Promise<string>

// Subscribe to updates
subscribe(
  streamId: string,
  callback: (progress: StreamingProgress) => void
): () => void

// Resume a failed job
resumeJob(streamId: string): Promise<void>

// Cancel active job
cancelJob(streamId: string): Promise<void>
```

### useStreamingReport Hook

```typescript
const {
  // State
  reportId,
  streamId,
  status,
  progress,
  stages,
  report,
  error,
  
  // Actions
  generateReport,
  resumeReport,
  cancelReport,
  refreshStatus,
  
  // Helpers
  isGenerating,
  isCompleted,
  isFailed,
  getStageStatus,
  getStageData
} = useStreamingReport(options);
```

## Troubleshooting

### Issue: Old reports not showing progress
Old reports generated before the streaming update won't have streaming data. They will continue to work as before.

### Issue: IndexedDB upgrade needed
Clear your browser's IndexedDB for the site and reload to force the schema update.

### Issue: Streaming stops unexpectedly
Check the browser console for errors. The system automatically saves progress, so you can resume using the `resumeReport` function.

## Example Implementation

See `src/components/StarmapJobCardV2.tsx` for a complete example of integrating streaming into an existing component.

## Next Steps

1. Gradually migrate components to use V2 services
2. Update error handling to leverage stage-specific errors
3. Add analytics to track stage completion rates
4. Implement cost optimization based on stage data
