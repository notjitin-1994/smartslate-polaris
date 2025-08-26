# API Optimization Integration Guide

## Overview
This guide explains how to integrate the new optimized services into your existing Smartslate Polaris codebase. The new services provide better API interactions, enhanced prompts, optimized database queries, and improved report generation.

## New Services Created

### 1. **Unified AI Service** (`src/services/unifiedAIService.ts`)
Intelligent provider selection based on input type and requirements, following your preferences:
- **OpenAI (GPT-4o)**: Low-latency multimodal streaming and vision tasks
- **Google Gemini**: Images, audio, video, and large-context documents
- **Anthropic Claude**: Document and compliance-friendly analysis
- **Perplexity**: Research and web-based queries

### 2. **Prompt Service** (`src/services/promptService.ts`)
Optimized prompt generation with context-aware enhancements for better AI responses.

### 3. **Enhanced Database Service** (`src/services/enhancedDbService.ts`)
Database operations with caching, batch processing, and retry logic.

### 4. **Report Generation Service** (`src/services/reportGenerationService.ts`)
Comprehensive report generation with parallel processing and validation.

### 5. **Questionnaire Service** (`src/services/questionnaireService.ts`)
Dynamic questionnaire generation with intelligent skip logic and validation.

## Integration Examples

### Replace Perplexity Service Calls

**Old Code:**
```typescript
import { perplexityService } from '@/services/perplexityService'

const result = await perplexityService.research(prompt, {
  model: 'sonar-pro',
  maxTokens: 2000
})
```

**New Code:**
```typescript
import { unifiedAIService } from '@/services/unifiedAIService'

const result = await unifiedAIService.research(prompt, {
  maxTokens: 2000
})
// Automatically uses Perplexity with optimal settings
```

### Replace Direct LLM Calls

**Old Code:**
```typescript
import { callLLM } from '@/services/llmClient'

const response = await callLLM([
  { role: 'user', content: prompt }
])
```

**New Code:**
```typescript
import { unifiedAIService } from '@/services/unifiedAIService'

const response = await unifiedAIService.call({
  prompt,
  inputType: 'text',
  capabilities: ['reasoning'],
  temperature: 0.7
})
// Automatically selects best provider
```

### Optimize Database Queries

**Old Code:**
```typescript
const { data, error } = await supabase
  .from('polaris_jobs')
  .select('*')
  .eq('user_id', userId)
  .order('created_at', { ascending: false })
```

**New Code:**
```typescript
import { enhancedDb } from '@/services/enhancedDbService'

const { data, error } = await enhancedDb.query('polaris_jobs', {
  filters: { user_id: userId },
  orderBy: { column: 'created_at', ascending: false },
  cache: true,
  cacheTimeout: 5 * 60 * 1000
})
// Includes automatic caching and retry logic
```

### Batch Database Operations

**New Feature:**
```typescript
import { enhancedDb } from '@/services/enhancedDbService'

// Batch insert with automatic chunking
await enhancedDb.batchInsert('polaris_summaries', records, {
  chunkSize: 500
})

// Queue operations for batch processing
enhancedDb.queueOperation({
  table: 'polaris_jobs',
  operation: 'update',
  data: { status: 'completed' },
  filters: { id: jobId }
})
```

### Generate Optimized Reports

**Old Code:**
```typescript
const reportPrompt = buildFastNAReportPrompt(experienceLevel, allAnswers)
const res = await callLLM([{ role: 'user', content: reportPrompt }])
```

**New Code:**
```typescript
import { reportGenService } from '@/services/reportGenerationService'

const report = await reportGenService.generateNeedsAnalysisReport({
  userId: user.id,
  experienceLevel,
  companyName,
  greetingData,
  orgData,
  requirementsData,
  dynamicAnswers,
  greetingReport,
  orgReport,
  requirementReport
})
// Returns structured report with metadata and validation
```

### Generate Dynamic Questionnaires

**Old Code:**
```typescript
const questionsPrompt = NA_QUESTIONNAIRE_PROMPT(experienceLevel, stageNumber, staticAnswers, dynamicAnswersSoFar)
const response = await callLLM([{ role: 'user', content: questionsPrompt }])
const json = tryExtractJson(response.content)
```

**New Code:**
```typescript
import { questionnaireService } from '@/services/questionnaireService'

const stages = await questionnaireService.generateDynamicStages({
  experienceLevel,
  currentStage: 1,
  totalStages: 3,
  previousAnswers: allAnswers,
  researchData: {
    greeting: greetingReport,
    organization: orgReport,
    requirements: requirementReport
  }
}, customPrompts)
// Returns validated, optimized questionnaire stages
```

## Update PolarisRevamped.tsx

Here's how to update the main Polaris component:

```typescript
// Add new imports
import { unifiedAIService } from '@/services/unifiedAIService'
import { reportGenService } from '@/services/reportGenerationService'
import { questionnaireService } from '@/services/questionnaireService'
import { enhancedDb } from '@/services/enhancedDbService'

// Replace research calls
async function triggerGreetingResearch() {
  const response = await unifiedAIService.research(
    `Research greeting context for ${stage1Answers.requester_name}...`,
    { maxTokens: 1200 }
  )
  setGreetingReport(response.content)
}

// Replace dynamic question generation
async function generateDynamicQuestions() {
  const stages = await questionnaireService.generateDynamicStages({
    experienceLevel: experienceLevel as any,
    currentStage: 1,
    totalStages: determineStageCount(),
    previousAnswers: { ...stage1Answers, ...stage2Answers, ...stage3Answers },
    researchData: {
      greeting: greetingReportRef.current,
      organization: orgReportRef.current,
      requirements: requirementReportRef.current,
      preliminary: preliminaryReport
    }
  }, CUSTOM_DYNAMIC_PROMPTS)
  
  setDynamicStages(stages)
}

// Replace report generation
async function generateReport() {
  const report = await reportGenService.generateComprehensiveReport({
    userId: user?.id || '',
    experienceLevel: experienceLevel as any,
    companyName: stage2Answers.org_name,
    industry: stage2Answers.org_industry,
    companySize: stage2Answers.org_size,
    greetingData: stage1Answers,
    orgData: stage2Answers,
    requirementsData: stage3Answers,
    dynamicAnswers: consolidateDynamicAnswers(),
    greetingReport: greetingReportRef.current,
    orgReport: orgReportRef.current,
    requirementReport: requirementReportRef.current,
    objectives: parseObjectives(stage3Answers.project_objectives),
    constraints: parseConstraints(stage3Answers.project_constraints),
    audience: stage3Answers.target_audience,
    budget: stage3Answers.project_budget_range,
    timeline: formatTimeline(stage3Answers.project_timeline)
  })
  
  setReportMarkdown(report.content)
  setReportMetadata(report.metadata)
}
```

## Update API Routes

### Update `/api/perplexity.ts`

```typescript
import { unifiedAIService } from '@/services/unifiedAIService'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const { messages, model, temperature, max_tokens } = req.body
    
    // Use unified service for better error handling
    const response = await unifiedAIService.call({
      prompt: messages[messages.length - 1].content,
      messages,
      temperature,
      maxTokens: max_tokens,
      preferredProvider: 'perplexity'
    })
    
    res.status(200).json({
      choices: [{
        message: { content: response.content }
      }],
      model: response.model,
      usage: response.usage
    })
  } catch (error) {
    // Better error handling
    res.status(500).json({ error: error.message })
  }
}
```

## Performance Improvements

### 1. Caching Strategy
- API responses cached for 5 minutes by default
- Database queries cached with automatic invalidation
- Prefetch commonly used data on app load

### 2. Parallel Processing
- Generate report sections in parallel
- Batch database operations
- Queue non-critical updates

### 3. Retry Logic
- Automatic retry with exponential backoff
- Fallback providers for critical operations
- Graceful degradation on failures

### 4. Optimized Prompts
- Context-aware prompt generation
- Experience level calibration
- Research data integration

## Best Practices

### 1. Use Provider Selection Wisely
```typescript
// For compliance-critical documents
const response = await unifiedAIService.analyzeDocument(
  documentContent,
  instructions,
  { compliance: true }
)

// For low-latency requirements
const response = await unifiedAIService.call({
  prompt,
  maxLatency: 'low'
})
```

### 2. Leverage Caching
```typescript
// Cache expensive queries
const { data } = await enhancedDb.query('polaris_summaries', {
  cache: true,
  cacheTimeout: 10 * 60 * 1000 // 10 minutes
})

// Prefetch on app load
await enhancedDb.prefetch(['polaris_jobs', 'profiles'])
```

### 3. Handle Errors Gracefully
```typescript
try {
  const report = await reportGenService.generateNeedsAnalysisReport(context)
  // Use report
} catch (error) {
  if (error.code === 'PROVIDER_UNAVAILABLE') {
    // Show user-friendly message
  }
  // Log for debugging
  console.error('[Report Generation]', error)
}
```

### 4. Monitor Performance
```typescript
// Get cache statistics
const stats = enhancedDb.getCacheStats()
console.log(`Cache hit rate: ${stats.hitRate}%`)

// Track API usage
const report = await reportGenService.generateReport(context)
console.log(`Used provider: ${report.metadata.provider}`)
console.log(`Confidence: ${report.metadata.confidence}`)
```

## Migration Checklist

- [ ] Replace `perplexityService` calls with `unifiedAIService`
- [ ] Update LLM calls to use `unifiedAIService.call()`
- [ ] Replace direct Supabase queries with `enhancedDb.query()`
- [ ] Update report generation to use `reportGenService`
- [ ] Implement dynamic questionnaires with `questionnaireService`
- [ ] Add error boundaries for graceful failures
- [ ] Test caching and performance improvements
- [ ] Monitor provider usage and costs
- [ ] Update environment variables for new models
- [ ] Review and update API route handlers

## Environment Variables

Add these to your `.env` file:

```bash
# Google Gemini (if implementing)
VITE_GOOGLE_API_KEY=your-key
VITE_GOOGLE_MODEL=gemini-2.0-flash-exp

# Cache Configuration
VITE_CACHE_TIMEOUT=300000  # 5 minutes
VITE_BATCH_SIZE=50

# Retry Configuration
VITE_MAX_RETRIES=3
VITE_RETRY_DELAY=1000
```

## Testing

Test the new services with:

```bash
# Run tests
npm test

# Test API endpoints
curl -X POST http://localhost:5173/api/perplexity \
  -H "Content-Type: application/json" \
  -d '{"messages":[{"role":"user","content":"Test query"}]}'

# Monitor performance
npm run dev -- --debug
```

## Support

For questions or issues with the new services:
1. Check console logs for detailed error messages
2. Review cache statistics for performance issues
3. Monitor provider usage in the metadata
4. Adjust timeout and retry settings as needed

The new services are designed to be drop-in replacements with enhanced functionality. Start with critical paths and gradually migrate the entire codebase for best results.
