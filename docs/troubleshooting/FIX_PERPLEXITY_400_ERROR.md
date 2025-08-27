# Fix for Perplexity API 400 Error

## Problem
The application was encountering a `NetworkError: Request failed with status 400` when trying to use the Perplexity API for research functionality. The error occurred during the research phases in PolarisRevamped when attempting to gather information about users, organizations, and requirements.

## Root Cause
The Perplexity API does not support the `system` role in messages. The application was sending messages with a `system` role, which caused the API to reject the request with a 400 Bad Request error.

### Original problematic code:
```javascript
const messages: PerplexityMessage[] = [
  {
    role: 'system',  // ❌ Not supported by Perplexity
    content: 'You are a helpful research assistant...'
  },
  {
    role: 'user',
    content: prompt
  }
]
```

## Solution
Modified the message format to only use `user` and `assistant` roles, which are the only roles supported by Perplexity's API. The system prompt is now included as part of the user message.

### Changes Made:

1. **Updated `src/services/perplexityService.ts`**:
   - Removed `system` role from PerplexityMessage type
   - Combined system prompt with user message in the `research` function
   - Messages now only use `user` role

2. **Enhanced `api/perplexity.ts`**:
   - Added validation to reject messages with invalid roles
   - Added detailed logging for debugging
   - Improved error messages to help diagnose issues

### Fixed code:
```javascript
// Perplexity API doesn't support 'system' role, so we include context in the user message
const contextualPrompt = `You are a helpful research assistant. Provide comprehensive, accurate information based on current web sources. Focus on facts and cite sources when possible.

${prompt}`

const messages: PerplexityMessage[] = [
  {
    role: 'user',  // ✅ Only user and assistant roles are supported
    content: contextualPrompt
  }
]
```

## Testing
A test script has been created at `test-perplexity-fix.js` to verify the fix:

```bash
node test-perplexity-fix.js
```

This script tests:
1. Valid message format (should succeed)
2. Invalid message format with system role (should be rejected with clear error)

## Deployment Notes
After deploying these changes:
1. The Perplexity research functionality should work correctly
2. Better error messages will be logged on the server for debugging
3. Invalid message formats will be rejected with clear error messages

## Additional Improvements
- Added request payload logging for easier debugging
- Added validation to ensure all messages have required `role` and `content` fields
- Improved error handling with more descriptive messages

## References
- Perplexity API only supports `user` and `assistant` roles
- System prompts must be included within user messages
- API requires alternating roles between user and assistant for conversation flow
