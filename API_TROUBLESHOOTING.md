# API Troubleshooting Guide

## Your Current Issue
All API calls are timing out, even with short 10-20 second timeouts. This indicates one of these issues:

### 1. Check API Key & Credits

**Run this in browser console:**
```javascript
// Test Perplexity API
polarisAPIDiagnostics.testPerplexity().then(console.log)
```

**Check for these errors:**
- `401/403`: Invalid API key
- `402`: Out of credits
- `429`: Rate limited
- `Timeout`: Network or API issues

### 2. Verify Your API Key

Your current key in env.example:
```env
VITE_PERPLEXITY_API_KEY=
```

**Make sure you have:**
1. Valid API key from https://www.perplexity.ai/settings/api
2. Active credits/subscription
3. Key properly set in `.env.local` (not just `.env.example`)

### 3. Test with Minimal Request

**In browser console:**
```javascript
// Ultra-minimal test
fetch('/api/perplexity', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    model: 'sonar',
    messages: [{ role: 'user', content: 'Hi' }],
    max_tokens: 10,
    temperature: 0
  })
}).then(r => r.json()).then(console.log)
```

### 4. Common Issues & Solutions

#### Issue: "All methods timing out"
**Solutions:**
1. **Check API Status**: https://status.perplexity.ai/
2. **Verify Network**: Try `curl https://api.perplexity.ai` 
3. **Check Firewall**: Ensure Vercel/localhost can reach Perplexity

#### Issue: "Working locally but not on Vercel"
**Solutions:**
1. Set environment variables in Vercel dashboard
2. Check Vercel function logs for errors
3. Ensure API key doesn't have IP restrictions

#### Issue: "Intermittent timeouts"
**Solutions:**
1. **Use async mode**: 
   ```javascript
   localStorage.setItem('polaris_async_mode', 'true')
   ```
2. **Switch to faster model**:
   ```env
   VITE_PERPLEXITY_FINAL_MODEL=sonar
   VITE_PERPLEXITY_PRELIM_MODEL=sonar
   ```

### 5. Emergency Fallback

If APIs are completely down, the system now:
1. ✅ Tests API connectivity first
2. ✅ Tries multiple fallback prompts
3. ✅ **Generates report locally** without API

**The local fallback ensures you always get a report**, even if:
- API is down
- Out of credits
- Network issues
- Rate limited

### 6. Debug Commands

**Full diagnostics:**
```javascript
// Run complete diagnostic suite
polarisAPIDiagnostics.test()
```

**Check specific model:**
```javascript
// Test sonar-reasoning specifically
fetch('/api/perplexity', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    model: 'sonar-reasoning',
    messages: [{ role: 'user', content: 'Test' }],
    max_tokens: 10
  })
}).then(r => {
  console.log('Status:', r.status)
  return r.text()
}).then(console.log)
```

**Check job status:**
```javascript
// If you have a job ID
fetch('/api/reportJobs?job_id=YOUR_JOB_ID')
  .then(r => r.json())
  .then(console.log)
```

### 7. Configuration Options

#### Option A: Maximum Reliability (Recommended)
```env
# Use fastest, most reliable model
VITE_PERPLEXITY_MODEL=sonar
VITE_PERPLEXITY_FINAL_MODEL=sonar
VITE_PERPLEXITY_PRELIM_MODEL=sonar
PPLX_SERVER_TIMEOUT_MS=30000
```

#### Option B: Balanced Quality
```env
# Good quality, reasonable speed
VITE_PERPLEXITY_MODEL=sonar
VITE_PERPLEXITY_FINAL_MODEL=sonar-pro
VITE_PERPLEXITY_PRELIM_MODEL=sonar-pro
PPLX_SERVER_TIMEOUT_MS=45000
```

#### Option C: Maximum Quality (Your Original)
```env
# Best quality, requires working API
VITE_PERPLEXITY_MODEL=sonar
VITE_PERPLEXITY_FINAL_MODEL=sonar-reasoning
VITE_PERPLEXITY_PRELIM_MODEL=sonar-reasoning
PPLX_SERVER_TIMEOUT_MS=110000
# Enable async mode for this
```

### 8. What's Happening Now

With the latest fixes, your system:
1. Tries job-based generation (45s)
2. Falls back to faster model (30s)
3. Tries simplified prompt (20s)
4. Tries minimal prompt (10s)
5. Tests API connectivity (5s)
6. **Generates local report if all fail**

**You will always get a report**, even if the API is completely unavailable.

### 9. Quick Actions

**If you need it working RIGHT NOW:**

1. **Switch to fast model temporarily:**
   ```javascript
   // In .env.local
   VITE_PERPLEXITY_FINAL_MODEL=sonar
   ```

2. **Enable async mode:**
   ```javascript
   localStorage.setItem('polaris_async_mode', 'true')
   ```

3. **Clear any stuck jobs:**
   ```javascript
   localStorage.clear()
   ```

4. **Use the diagnostic tool:**
   ```javascript
   polarisAPIDiagnostics.test()
   ```

### 10. Contact Support

If diagnostics show APIs are working but you still have issues:

1. **Perplexity Support**: support@perplexity.ai
2. **Check Status**: https://status.perplexity.ai/
3. **API Dashboard**: https://www.perplexity.ai/settings/api

Include:
- Diagnostic results
- Your API key (first/last 4 chars only)
- Error messages from console
- Network tab HAR file

## Summary

Your system is now **extremely resilient**:
- Multiple fallback layers
- Local report generation
- API diagnostics built-in
- Works even when API is down

The timeouts you're seeing suggest an API configuration issue. Run the diagnostics above to identify the specific problem.
