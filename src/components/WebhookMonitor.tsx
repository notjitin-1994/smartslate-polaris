import { useState, useEffect } from 'react'
import {
  getWebhookStatistics,
  getReportsWithFailedWebhooks,
  getWebhookAuditLog,
  retryFailedWebhook
} from '@/services/polarisReportsService'
import type { ReportType } from '@/services/polarisReportsService'

interface WebhookStats {
  total_reports: number
  webhook_success: number
  webhook_failed: number
  webhook_pending: number
  webhook_retrying: number
  by_type: Record<string, {
    total: number
    success: number
    failed: number
    pending: number
    retrying: number
  }>
}

interface FailedReport {
  id: string
  webhook_status: string
  webhook_attempts: number
  webhook_last_attempt?: string
  research_status: string
  created_at: string
  report_type: string
  table_name: string
}

interface AuditLogEntry {
  id: string
  webhook_type: string
  job_id: string
  report_id: string
  report_table: string
  response_status: number
  error_message: string | null
  attempt_number: number
  created_at: string
}

export default function WebhookMonitor() {
  const [stats, setStats] = useState<WebhookStats | null>(null)
  const [failedReports, setFailedReports] = useState<FailedReport[]>([])
  const [auditLog, setAuditLog] = useState<AuditLogEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [retrying, setRetrying] = useState<Set<string>>(new Set())
  const [selectedTab, setSelectedTab] = useState<'stats' | 'failed' | 'audit'>('stats')

  const loadData = async () => {
    try {
      setLoading(true)
      
      const [statsResult, failedResult, auditResult] = await Promise.all([
        getWebhookStatistics(),
        getReportsWithFailedWebhooks(),
        getWebhookAuditLog(undefined, undefined, 20)
      ])

      if (statsResult.data) setStats(statsResult.data)
      if (failedResult.data) setFailedReports(failedResult.data)
      if (auditResult.data) setAuditLog(auditResult.data)

    } catch (error) {
      console.error('Failed to load webhook data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleRetry = async (reportType: string, reportId: string) => {
    try {
      setRetrying(prev => new Set([...prev, reportId]))
      
      const result = await retryFailedWebhook(reportType as ReportType, reportId)
      
      if (result.error) {
        console.error('Retry failed:', result.error)
      } else {
        console.log('Retry initiated for report', reportId)
        // Refresh data after a short delay
        setTimeout(loadData, 2000)
      }
    } catch (error) {
      console.error('Retry error:', error)
    } finally {
      setRetrying(prev => {
        const newSet = new Set(prev)
        newSet.delete(reportId)
        return newSet
      })
    }
  }

  useEffect(() => {
    loadData()
    const interval = setInterval(loadData, 30000) // Refresh every 30 seconds
    return () => clearInterval(interval)
  }, [])

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString()
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success': return 'text-green-600 bg-green-100'
      case 'failed': return 'text-red-600 bg-red-100'
      case 'retrying': return 'text-yellow-600 bg-yellow-100'
      case 'pending': return 'text-blue-600 bg-blue-100'
      default: return 'text-gray-600 bg-gray-100'
    }
  }

  if (loading) {
    return (
      <div className="p-6 bg-white rounded-lg shadow">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
        <p className="text-center text-gray-600 mt-2">Loading webhook data...</p>
      </div>
    )
  }

  return (
    <div className="p-6 bg-white rounded-lg shadow">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold text-gray-900">Webhook Monitor</h2>
        <button
          onClick={loadData}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
        >
          Refresh
        </button>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex space-x-8">
          {[
            { id: 'stats' as const, label: 'Statistics' },
            { id: 'failed' as const, label: `Failed (${failedReports.length})` },
            { id: 'audit' as const, label: 'Audit Log' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setSelectedTab(tab.id)}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                selectedTab === tab.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Statistics Tab */}
      {selectedTab === 'stats' && stats && (
        <div className="space-y-6">
          {/* Overall Stats */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="text-2xl font-bold text-gray-900">{stats.total_reports}</div>
              <div className="text-sm text-gray-600">Total Reports</div>
            </div>
            <div className="bg-green-50 p-4 rounded-lg">
              <div className="text-2xl font-bold text-green-600">{stats.webhook_success}</div>
              <div className="text-sm text-gray-600">Success</div>
            </div>
            <div className="bg-red-50 p-4 rounded-lg">
              <div className="text-2xl font-bold text-red-600">{stats.webhook_failed}</div>
              <div className="text-sm text-gray-600">Failed</div>
            </div>
            <div className="bg-yellow-50 p-4 rounded-lg">
              <div className="text-2xl font-bold text-yellow-600">{stats.webhook_retrying}</div>
              <div className="text-sm text-gray-600">Retrying</div>
            </div>
            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">{stats.webhook_pending}</div>
              <div className="text-sm text-gray-600">Pending</div>
            </div>
          </div>

          {/* By Type Stats */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">By Report Type</h3>
            <div className="space-y-4">
              {Object.entries(stats.by_type).map(([type, typeStats]) => (
                <div key={type} className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="font-medium text-gray-900 capitalize mb-2">{type} Reports</h4>
                  <div className="grid grid-cols-5 gap-4 text-sm">
                    <div>Total: <span className="font-semibold">{typeStats.total}</span></div>
                    <div>Success: <span className="font-semibold text-green-600">{typeStats.success}</span></div>
                    <div>Failed: <span className="font-semibold text-red-600">{typeStats.failed}</span></div>
                    <div>Retrying: <span className="font-semibold text-yellow-600">{typeStats.retrying}</span></div>
                    <div>Pending: <span className="font-semibold text-blue-600">{typeStats.pending}</span></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Failed Reports Tab */}
      {selectedTab === 'failed' && (
        <div className="space-y-4">
          {failedReports.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No failed webhooks found
            </div>
          ) : (
            <div className="space-y-3">
              {failedReports.map(report => (
                <div key={report.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="font-medium text-gray-900">
                          {report.report_type.charAt(0).toUpperCase() + report.report_type.slice(1)} Report
                        </span>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(report.webhook_status)}`}>
                          {report.webhook_status}
                        </span>
                        <span className="text-sm text-gray-500">
                          {report.webhook_attempts}/3 attempts
                        </span>
                      </div>
                      <div className="text-sm text-gray-600 space-y-1">
                        <div>Report ID: {report.id}</div>
                        <div>Research Status: {report.research_status}</div>
                        <div>Created: {formatTimestamp(report.created_at)}</div>
                        {report.webhook_last_attempt && (
                          <div>Last Attempt: {formatTimestamp(report.webhook_last_attempt)}</div>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => handleRetry(report.report_type, report.id)}
                      disabled={retrying.has(report.id) || report.webhook_attempts >= 3}
                      className="px-3 py-1 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-sm transition-colors"
                    >
                      {retrying.has(report.id) ? 'Retrying...' : 'Retry'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Audit Log Tab */}
      {selectedTab === 'audit' && (
        <div className="space-y-4">
          {auditLog.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No audit log entries found
            </div>
          ) : (
            <div className="space-y-3">
              {auditLog.map(entry => (
                <div key={entry.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex items-center gap-3">
                      <span className="font-medium text-gray-900">{entry.webhook_type}</span>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        entry.response_status >= 200 && entry.response_status < 300 
                          ? 'text-green-600 bg-green-100'
                          : 'text-red-600 bg-red-100'
                      }`}>
                        HTTP {entry.response_status}
                      </span>
                      <span className="text-sm text-gray-500">
                        Attempt {entry.attempt_number}
                      </span>
                    </div>
                    <div className="text-sm text-gray-500">
                      {formatTimestamp(entry.created_at)}
                    </div>
                  </div>
                  <div className="text-sm text-gray-600 space-y-1">
                    <div>Job ID: {entry.job_id}</div>
                    <div>Report ID: {entry.report_id}</div>
                    <div>Table: {entry.report_table}</div>
                    {entry.error_message && (
                      <div className="text-red-600">Error: {entry.error_message}</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
