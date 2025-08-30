# API Call Tracker - Debug Dashboard Feature

## Overview

The API Call Tracker is a new tab in the debug dashboard that provides comprehensive monitoring and analysis of all API calls made by your application. It automatically categorizes requests, tracks long-running operations, and provides a markdown-friendly view of responses.

## Features

### 1. **Automatic API Categorization**
- **Authentication**: Login, logout, token management
- **User Management**: Profile, account operations
- **AI/ML**: Model predictions, AI endpoints
- **Analytics**: Tracking, metrics collection
- **Webhooks**: External webhook calls
- **File Operations**: Upload, download requests
- **GraphQL**: GraphQL API calls
- **Other**: Uncategorized requests

### 2. **Long-Running Request Detection**
- Automatically flags requests taking longer than 3 seconds
- Visual "Long Running" badge with warning color
- Statistics showing average duration of long-running calls
- Filter to show only long-running requests

### 3. **Smart Tagging System**
- Method tags (GET, POST, PUT, DELETE, etc.)
- Protocol tags (http, https)
- External/internal request tags
- Hostname tags for external requests
- Custom category tags

### 4. **Markdown Response Viewer**
- Automatically formats JSON responses with syntax highlighting
- HTML responses wrapped in code blocks
- One-click "Copy as Markdown" button
- Collapsible response sections for better organization

### 5. **Advanced Filtering**
- Filter by category dropdown
- Toggle to show only long-running requests
- Real-time updates with auto-refresh
- Search functionality inherited from main dashboard

### 6. **Detailed Request Information**
- Request URL and method
- Request/response headers
- Request body (if applicable)
- Response status and body
- Timing information
- Error messages for failed requests

## Usage

1. **Access the API Call Tracker**
   - Open the debug dashboard
   - Click on the "API Tracker" tab

2. **Filter and Analyze**
   - Use the category dropdown to focus on specific types of requests
   - Toggle "Long Running Only" to identify performance bottlenecks
   - Click on response details to expand and view full information

3. **Export Response Data**
   - Click "Copy as Markdown" to copy formatted response
   - Click "View Full Details" to see complete request/response data
   - Use the main dashboard export feature to save all tracked data

## Implementation Details

### Enhanced API Interceptors
```typescript
// Automatic categorization based on URL patterns
function categorizeApiCall(url: string, method: string): { category: string; tags: string[] }

// Long-running detection threshold
const LONG_RUNNING_THRESHOLD = 3000; // 3 seconds
```

### Type Definitions
```typescript
interface ApiCall {
  // ... existing fields
  tags?: string[];
  category?: string;
  isLongRunning?: boolean;
}
```

### Styling
The API Call Tracker uses a modern glass-morphism design consistent with the rest of the debug dashboard:
- Transparent backgrounds with blur effects
- Color-coded status badges
- Responsive layout for mobile devices
- Dark theme optimized for developer use

## Benefits

1. **Performance Monitoring**: Quickly identify slow API endpoints
2. **Debugging**: View full request/response data with proper formatting
3. **Documentation**: Copy responses as markdown for documentation
4. **Categorization**: Understand API usage patterns at a glance
5. **Real-time Tracking**: Monitor API calls as they happen

## Future Enhancements

- Request/response size tracking
- API call history graphs
- Performance trends over time
- Export to HAR format
- Request replay functionality
