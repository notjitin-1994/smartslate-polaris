import { useState, useEffect } from 'react'
import { updateSummaryFinalContent } from '@/services/polarisSummaryService'
import { formatErrorMessage } from '@/lib/errors'

/**
 * Async Report Generation Component
 * 
 * This component handles long-running report generation by:
 * 1. Starting the job and returning immediately
 * 2. Showing a "processing" state to the user
 * 3. Allowing the user to check back later or get notified
 */

interface AsyncReportGeneratorProps {
  prompt: string
  model: string
  summaryId?: string
  onComplete?: (report: string) => void
}

export function AsyncReportGenerator({ 
  prompt, 
  model, 
  summaryId,
  onComplete 
}: AsyncReportGeneratorProps) {
  const [jobId, setJobId] = useState<string | null>(null)
  const [status, setStatus] = useState<'idle' | 'submitted' | 'processing' | 'completed' | 'failed'>('idle')
  const [progress, setProgress] = useState(0)
  const [report, setReport] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [pollInterval, setPollInterval] = useState<number | null>(null)

  // Submit the job
  async function submitJob() {
    try {
      setStatus('submitted')
      setError(null)
      
      const response = await fetch('/api/reportJobsDb', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          prompt, 
          model, 
          temperature: 0.2, 
          max_tokens: 4000 
        })
      })
      
      if (!response.ok) {
        throw new Error('Failed to submit job')
      }
      
      const data = await response.json()
      // Prefer DB-backed status URL if provided
      const statusUrl: string | undefined = data?.status_url
      const createdJobId: string | undefined = data?.job_id
      setJobId(createdJobId || null)
      setStatus('processing')
      
      // Store job ID in localStorage for persistence
      if (summaryId && createdJobId) {
        const jobs = JSON.parse(localStorage.getItem('polaris_jobs') || '{}')
        jobs[summaryId] = createdJobId
        if (statusUrl) {
          jobs[`${summaryId}_status_url`] = statusUrl
        }
        localStorage.setItem('polaris_jobs', JSON.stringify(jobs))
      }
      
      // Start polling
      setPollInterval(3000) // Poll every 3 seconds
      
      return data.job_id
    } catch (err) {
      setError(formatErrorMessage(err))
      setStatus('failed')
      return null
    }
  }

  // Poll for job status
  useEffect(() => {
    if (!jobId || !pollInterval || status === 'completed' || status === 'failed') {
      return
    }

    const interval = setInterval(async () => {
      try {
        // Prefer stored status URL (DB route) if available
        const jobs = JSON.parse(localStorage.getItem('polaris_jobs') || '{}')
        const statusUrl = summaryId ? jobs[`${summaryId}_status_url`] : undefined
        const response = await fetch(statusUrl || `/api/reportJobsDb?job_id=${jobId}`)
        if (!response.ok) {
          throw new Error('Failed to check job status')
        }
        
        const data = await response.json()
        setProgress(data.percent || 0)
        
        if (data.status === 'succeeded') {
          setReport(data.result)
          setStatus('completed')
          setPollInterval(null)
          
          // Save to database if we have a summary ID
          if (summaryId && data.result) {
            await updateSummaryFinalContent(summaryId, data.result, {})
          }
          
          // Callback
          if (onComplete && data.result) {
            onComplete(data.result)
          }
        } else if (data.status === 'failed') {
          setError(data.error || 'Report generation failed')
          setStatus('failed')
          setPollInterval(null)
        }
      } catch (err) {
        console.error('Polling error:', err)
        // Continue polling even on error
      }
    }, pollInterval)

    return () => clearInterval(interval)
  }, [jobId, pollInterval, status, summaryId, onComplete])

  // Check for existing job on mount
  useEffect(() => {
    if (summaryId) {
      const jobs = JSON.parse(localStorage.getItem('polaris_jobs') || '{}')
      const existingJobId = jobs[summaryId]
      if (existingJobId) {
        setJobId(existingJobId)
        setStatus('processing')
        setPollInterval(3000)
      }
    }
  }, [summaryId])

  return (
    <div className="glass-card p-6 space-y-4">
      <h3 className="text-xl font-semibold text-white">Report Generation</h3>
      
      {status === 'idle' && (
        <div className="space-y-4">
          <p className="text-white/70">
            Your report will be generated using the {model} model. This may take 1-2 minutes.
          </p>
          <button
            onClick={submitJob}
            className="btn-primary"
          >
            Start Report Generation
          </button>
        </div>
      )}
      
      {status === 'submitted' && (
        <div className="space-y-2">
          <p className="text-white/70">Submitting your request...</p>
          <div className="animate-pulse h-2 bg-white/20 rounded-full" />
        </div>
      )}
      
      {status === 'processing' && (
        <div className="space-y-4">
          <p className="text-white/70">
            Your report is being generated. You can safely leave this page and come back later.
          </p>
          {jobId && (
            <div className="bg-white/5 rounded-lg p-3">
              <p className="text-xs text-white/60">Job ID: {jobId}</p>
            </div>
          )}
          <div className="space-y-2">
            <div className="flex justify-between text-sm text-white/60">
              <span>Progress</span>
              <span>{progress}%</span>
            </div>
            <div className="h-2 bg-white/10 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-primary-400 to-secondary-400 transition-all duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => setPollInterval(null)}
              className="btn-ghost"
            >
              Stop Checking
            </button>
            <button
              onClick={() => setPollInterval(1000)}
              className="btn-secondary"
            >
              Check Faster
            </button>
          </div>
        </div>
      )}
      
      {status === 'completed' && report && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
            </svg>
            <p className="text-green-400">Report generated successfully!</p>
          </div>
          <div className="max-h-96 overflow-y-auto bg-white/5 rounded-lg p-4">
            <pre className="text-xs text-white/80 whitespace-pre-wrap">{report.substring(0, 500)}...</pre>
          </div>
        </div>
      )}
      
      {status === 'failed' && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
            <p className="text-red-400">Report generation failed</p>
          </div>
          {error && (
            <p className="text-sm text-red-300/80">{error}</p>
          )}
          <button
            onClick={submitJob}
            className="btn-primary"
          >
            Try Again
          </button>
        </div>
      )}
    </div>
  )
}

/**
 * Hook to check report status without UI
 */
export function useAsyncReport(summaryId?: string) {
  const [jobId, setJobId] = useState<string | null>(null)
  const [status, setStatus] = useState<'idle' | 'processing' | 'completed' | 'failed'>('idle')
  const [report, setReport] = useState<string | null>(null)
  
  useEffect(() => {
    if (!summaryId) return
    
    const jobs = JSON.parse(localStorage.getItem('polaris_jobs') || '{}')
    const existingJobId = jobs[summaryId]
    
    if (existingJobId) {
      setJobId(existingJobId)
      checkStatus(existingJobId)
    }
  }, [summaryId])
  
  async function checkStatus(id: string) {
    try {
      const jobs = JSON.parse(localStorage.getItem('polaris_jobs') || '{}')
      const statusUrl = summaryId ? jobs[`${summaryId}_status_url`] : undefined
      const response = await fetch(statusUrl || `/api/reportJobsDb?job_id=${id}`)
      const data = await response.json()
      
      if (data.status === 'succeeded') {
        setStatus('completed')
        setReport(data.result)
      } else if (data.status === 'failed') {
        setStatus('failed')
      } else {
        setStatus('processing')
      }
    } catch (err) {
      console.error('Failed to check status:', err)
    }
  }
  
  return { jobId, status, report, checkStatus: () => jobId && checkStatus(jobId) }
}
