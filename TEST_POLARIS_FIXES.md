# Testing Guide for Polaris Fixes

## Quick Test Scenarios

### 1. Test Timeout Handling

#### Scenario A: Slow API Response
1. Open Network tab in browser DevTools
2. Set network throttling to "Slow 3G"
3. Start Polaris flow
4. Watch console logs for timeout messages
5. **Expected**: System should fall back gracefully after 60 seconds

#### Scenario B: API Failure
1. Temporarily set wrong API key in `.env`:
   ```
   VITE_PERPLEXITY_API_KEY=invalid_key_test
   ```
2. Run through Polaris flow
3. **Expected**: Fallback reports should generate with user's input data

### 2. Test Report Structure

#### Scenario A: Minimal Input
1. Fill only required fields in stages 1-3
2. Generate preliminary report
3. **Expected**: All required sections should appear with placeholder content

#### Scenario B: Complete Input
1. Fill all fields with demo data (use `?demo=1` query param)
2. Generate full report
3. **Expected**: Rich, detailed report with all sections populated

### 3. Test Display Issues

#### Check Preliminary Report
1. After Stage 3, preliminary report should show:
   - ✅ Executive Summary
   - ✅ Recommended Solution (with all 4 subsections)
   - ✅ Delivery Plan
   - ✅ Measurement
   - ✅ Budget
   - ✅ Risk Mitigation
   - ✅ Next Steps

#### Check Final Report
1. After dynamic questions, final report should show:
   - ✅ All sections from preliminary
   - ✅ Enhanced detail from dynamic answers
   - ✅ Appendix with Q&A

### 4. Console Commands for Testing

Open browser console and run:

```javascript
// Check if reports are being validated
localStorage.setItem('polaris_debug', 'true')

// Monitor timeout events
window.addEventListener('polaris:timeout', (e) => {
  console.log('Timeout occurred:', e.detail)
})

// Check job status
fetch('/api/reportJobs?job_id=test').then(r => r.json()).then(console.log)
```

### 5. Test Data Sets

#### Quick Test (Minimal)
```javascript
// Paste in console after loading Polaris page
document.querySelector('[name="requester_name"]').value = 'Test User'
document.querySelector('[name="requester_email"]').value = 'test@example.com'
document.querySelector('[name="requester_role"]').value = 'L&D Manager'
document.querySelector('[name="org_name"]').value = 'Test Corp'
document.querySelector('[name="org_industry"]').value = 'Technology'
document.querySelector('[name="project_objectives"]').value = 'Improve sales performance'
```

#### Full Test (Complete)
Navigate to: `/polaris?demo=1`

This auto-fills all fields with realistic test data.

## Monitoring Improvements

### What to Look For

#### In Console Logs:
- ✅ "Preliminary report generated successfully via job"
- ✅ "Report successfully parsed, repaired and validated"
- ✅ "Research promises timeout, continuing with available data" (if timeout)
- ❌ "Job failed" repeatedly without fallback

#### In Network Tab:
- ✅ `/api/reportJobs` returns 202 Accepted
- ✅ Polling requests complete within 60 seconds
- ✅ `/api/perplexity` calls have 45-60s timeout

#### In UI:
- ✅ Progress bar moves smoothly
- ✅ ETA countdown is reasonable (not 90+ seconds)
- ✅ Reports display without empty sections
- ✅ Navigation between stages is smooth

## Performance Metrics

### Before Fixes:
- Preliminary report: 90-180 seconds (timeouts common)
- Final report: 90-120 seconds (parsing failures)
- Success rate: ~60%

### After Fixes (Expected):
- Preliminary report: 30-60 seconds (with fallback)
- Final report: 45-60 seconds (with retry)
- Success rate: >95%

## Debugging Tips

### Enable Verbose Logging
Add to `.env.local`:
```
VITE_LOG_LEVEL=debug
```

### Check Job Store
```javascript
// In api/reportJobs.ts, add logging
console.log('Current jobs:', Array.from(getStore().entries()))
```

### Monitor Memory
```javascript
// Check for memory leaks
performance.memory
```

### Test Cold Starts
1. Deploy to Vercel preview
2. Wait 10 minutes (function cold)
3. Test report generation
4. Should work despite cold start

## Common Issues & Solutions

### Issue: "Report still times out"
**Solution**: Check if `PPLX_SERVER_TIMEOUT_MS` is set to 60000 in Vercel env vars

### Issue: "Preliminary report missing sections"
**Solution**: Clear browser cache, the validation function may be cached

### Issue: "JSON parsing still fails"
**Solution**: Check console for "First 500 chars of extracted" - may need to adjust extraction regex

### Issue: "Research data not appearing"
**Solution**: Verify Perplexity API key is valid and has credits

## Rollback Plan

If issues persist, revert changes:

```bash
git checkout HEAD~1 src/pages/PolarisRevamped.tsx
git checkout HEAD~1 api/reportJobs.ts
rm src/utils/reportValidator.ts
```

Then redeploy.

## Support

For issues, check:
1. Console logs
2. Network tab
3. `/api/reportJobs` response
4. Vercel function logs

Share these with the development team for debugging.
