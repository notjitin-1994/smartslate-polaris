# Webhook System Testing Guide

This guide provides comprehensive testing instructions for the webhook-based database storage system implemented for Polaris reports.

## Overview

The webhook system replaces direct database updates with secure webhook calls, providing better scalability, reliability, and audit capabilities.

### Key Components

1. **Webhook Endpoints**: `api/webhooks/prelim-report.ts` and `api/webhooks/final-report.ts`
2. **Database Schema**: Enhanced with webhook tracking fields
3. **Job Processing**: Modified `api/reportJobsDb.ts` to use webhooks
4. **Service Layer**: Updated `src/services/polarisReportsService.ts`
5. **Frontend**: Enhanced monitoring components
6. **Retry System**: `api/webhooks/retry.ts` for handling failures

## Environment Setup

### Required Environment Variables

```bash
# Webhook Configuration
WEBHOOK_SECRET=your-secure-webhook-secret-key-here
WEBHOOK_BASE_URL=https://your-domain.com/api/webhooks
WEBHOOK_TIMEOUT_MS=10000
WEBHOOK_MAX_RETRIES=3

# Existing Supabase Configuration
VITE_SUPABASE_URL=your-supabase-url
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

### Database Migration

Run the webhook support migration:

```sql
-- Run the migration file
-- supabase/migrations/20240101000011_add_webhook_support.sql
```

## Testing Procedures

### 1. Database Schema Validation

**Test Database Tables:**

```sql
-- Verify webhook columns were added
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'greeting_reports' 
AND column_name LIKE 'webhook%';

-- Should return:
-- webhook_status | text
-- webhook_attempts | integer  
-- webhook_last_attempt | timestamp with time zone
-- webhook_response | jsonb
-- webhook_job_id | text
```

**Test Webhook Functions:**

```sql
-- Test update_webhook_status function
SELECT public.update_webhook_status(
  'greeting_reports',
  'test-uuid'::uuid,
  'success',
  '{"test": true}'::jsonb,
  true
);

-- Test get_failed_webhooks function
SELECT * FROM public.get_failed_webhooks(3, 5);
```

### 2. Webhook Endpoint Testing

**Test Prelim Report Webhook:**

```bash
# Generate test signature
SECRET="your-webhook-secret"
PAYLOAD='{"job_id":"test-job","report_id":"test-uuid","report_type":"greeting","research_report":"Test content","research_status":"completed"}'
SIGNATURE=$(echo -n "$PAYLOAD" | openssl dgst -sha256 -hmac "$SECRET" -binary | base64)

# Call webhook
curl -X POST https://your-domain.com/api/webhooks/prelim-report \
  -H "Content-Type: application/json" \
  -H "X-Webhook-Signature: sha256=$SIGNATURE" \
  -d "$PAYLOAD"
```

**Expected Response (Success):**
```json
{
  "message": "Report updated successfully",
  "report_id": "test-uuid",
  "job_id": "test-job",
  "report_type": "greeting",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

**Test Invalid Signature:**

```bash
curl -X POST https://your-domain.com/api/webhooks/prelim-report \
  -H "Content-Type: application/json" \
  -H "X-Webhook-Signature: sha256=invalid-signature" \
  -d "$PAYLOAD"
```

**Expected Response (401):**
```json
{
  "error": "Invalid webhook signature"
}
```

### 3. Job Processing Integration Testing

**Test End-to-End Flow:**

1. Create a test report:
```bash
curl -X POST https://your-domain.com/api/reportJobsDb \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "Test research prompt",
    "model": "sonar",
    "temperature": 0.2,
    "max_tokens": 1000,
    "report_type": "greeting",
    "report_id": "test-report-id"
  }'
```

2. Monitor job progress:
```bash
curl "https://your-domain.com/api/reportJobsDb?job_id=RETURNED_JOB_ID"
```

3. Check webhook audit log:
```sql
SELECT * FROM webhook_audit 
WHERE job_id = 'RETURNED_JOB_ID' 
ORDER BY created_at DESC;
```

### 4. Frontend Component Testing

**Test WebhookMonitor Component:**

1. Navigate to `/reports-debug`
2. Switch to "Webhook Monitor" tab
3. Verify statistics display correctly
4. Check failed webhooks list
5. Test retry functionality
6. Review audit log entries

**Test Report Creation with Webhook Tracking:**

1. Use "Debug Reports" tab
2. Create a new report
3. Start research job
4. Check webhook status with "Check webhook" button
5. Verify webhook status updates in real-time

### 5. Error Handling & Retry Testing

**Test Webhook Failures:**

1. Temporarily break webhook endpoint (wrong URL/secret)
2. Create and process a job
3. Verify fallback to direct database update
4. Check webhook status is marked as "failed"
5. Use retry functionality to recover

**Test Retry System:**

```bash
# Test individual retry
curl -X POST https://your-domain.com/api/webhooks/retry \
  -H "Content-Type: application/json" \
  -d '{
    "report_type": "greeting",
    "report_id": "failed-report-id"
  }'

# Test batch retry processing
curl -X GET https://your-domain.com/api/webhooks/retry
```

### 6. Security Testing

**Test Authentication:**

1. Remove WEBHOOK_SECRET from environment
2. Verify endpoints return proper error messages
3. Test with invalid secrets
4. Test with malformed signatures

**Test Input Validation:**

1. Send malformed JSON payloads
2. Test missing required fields
3. Test with invalid report types
4. Verify proper error responses

**Test CORS Headers:**

```bash
curl -X OPTIONS https://your-domain.com/api/webhooks/prelim-report \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: Content-Type"
```

### 7. Performance Testing

**Test Concurrent Webhook Calls:**

```bash
# Simulate multiple simultaneous webhook calls
for i in {1..10}; do
  curl -X POST https://your-domain.com/api/webhooks/prelim-report \
    -H "Content-Type: application/json" \
    -H "X-Webhook-Signature: sha256=$SIGNATURE" \
    -d "{\"job_id\":\"test-job-$i\",\"report_id\":\"test-uuid-$i\",\"report_type\":\"greeting\",\"research_report\":\"Test content $i\",\"research_status\":\"completed\"}" &
done
wait
```

**Test Timeout Handling:**

1. Set WEBHOOK_TIMEOUT_MS to a low value (1000ms)
2. Create a slow-responding webhook endpoint
3. Verify timeout behavior and retry logic

### 8. Audit & Monitoring Testing

**Test Webhook Audit Logging:**

```sql
-- Check audit entries are created for all webhook calls
SELECT 
  webhook_type,
  response_status,
  COUNT(*) as call_count,
  COUNT(CASE WHEN error_message IS NOT NULL THEN 1 END) as error_count
FROM webhook_audit 
GROUP BY webhook_type, response_status
ORDER BY webhook_type, response_status;
```

**Test Statistics Gathering:**

```bash
# Test statistics API (if implemented)
curl https://your-domain.com/api/webhook-stats
```

## Validation Checklist

### ✅ Database Schema
- [ ] Webhook columns added to all report tables
- [ ] Webhook audit table created
- [ ] Helper functions work correctly
- [ ] Indexes created for performance

### ✅ Webhook Endpoints  
- [ ] Prelim report webhook processes requests correctly
- [ ] Final report webhook handles completion logic
- [ ] Signature verification works
- [ ] Error handling returns proper HTTP codes
- [ ] CORS headers configured correctly

### ✅ Job Processing
- [ ] Jobs call webhooks instead of direct DB updates
- [ ] Fallback to direct updates when webhooks fail
- [ ] Proper error handling and logging
- [ ] Retry logic with exponential backoff

### ✅ Service Layer
- [ ] Webhook status monitoring functions
- [ ] Failed webhook retrieval
- [ ] Retry functionality
- [ ] Statistics gathering

### ✅ Frontend Components
- [ ] WebhookMonitor displays data correctly
- [ ] Real-time status updates
- [ ] Retry functionality works
- [ ] Audit log display

### ✅ Security
- [ ] Webhook signature verification
- [ ] Environment variable validation
- [ ] Input sanitization
- [ ] Proper error messages (no sensitive data)

### ✅ Performance
- [ ] Webhooks complete within timeout limits
- [ ] Database queries are efficient
- [ ] Concurrent requests handled properly
- [ ] Memory usage is reasonable

### ✅ Reliability
- [ ] Failed webhooks are retried appropriately
- [ ] System degrades gracefully when webhooks fail
- [ ] Data integrity maintained
- [ ] No duplicate updates occur

## Troubleshooting Common Issues

### Webhook Signature Verification Fails
- Verify WEBHOOK_SECRET matches between sender and receiver
- Check payload encoding (UTF-8)
- Ensure signature format is "sha256=<hash>"

### Webhooks Timing Out
- Check WEBHOOK_TIMEOUT_MS setting
- Verify network connectivity
- Monitor database performance

### Database Connection Issues
- Verify SUPABASE_SERVICE_ROLE_KEY is correct
- Check database permissions
- Monitor connection pool usage

### High Retry Rates
- Check webhook endpoint reliability
- Monitor database performance
- Review error logs for patterns

## Performance Benchmarks

Expected performance metrics:
- Webhook response time: < 2 seconds
- Database update time: < 500ms  
- Retry processing: < 30 seconds for batch
- Memory usage: < 100MB per API instance

Monitor these metrics and investigate if they exceed expectations.

## Security Best Practices

1. **Never log webhook secrets or signatures**
2. **Use HTTPS for all webhook endpoints**
3. **Validate all input data**
4. **Implement rate limiting**
5. **Monitor for unusual patterns**
6. **Regularly rotate webhook secrets**
7. **Use environment variables for all configuration**
8. **Implement proper CORS policies**

## Monitoring & Alerts

Set up monitoring for:
- Webhook failure rates > 5%
- Response times > 5 seconds  
- Retry queue length > 100
- Database connection errors
- Memory usage > 200MB
- CPU usage > 80%

Configure alerts to notify administrators when thresholds are exceeded.
