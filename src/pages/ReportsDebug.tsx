import { useState } from 'react'
import { getSupabase } from '@/services/supabase'
import {
	createGreetingReport,
	createOrgReport,
	createRequirementReport,
	startGreetingResearchAsync,
	startOrgResearchAsync,
	startRequirementResearchAsync,
	getCompleteReport,
	getReportWebhookStatus,
} from '@/services/polarisReportsService'
import type { ReportType } from '@/services/polarisReportsService'
import WebhookMonitor from '@/components/WebhookMonitor'

const supabase = getSupabase()

export default function ReportsDebug() {
	const [reportType, setReportType] = useState<ReportType>('greeting')
	const [summaryId, setSummaryId] = useState<string>('')
	const [reportId, setReportId] = useState<string>('')
	const [jobId, setJobId] = useState<string>('')
	const [status, setStatus] = useState<string>('idle')
	const [output, setOutput] = useState<string>('')
	const [webhookStatus, setWebhookStatus] = useState<any>(null)
	const [activeTab, setActiveTab] = useState<'debug' | 'monitor'>('debug')

	async function createReport() {
		setStatus('creating')
		const { data: { user } } = await supabase.auth.getUser()
		if (!user) {
			setStatus('error:not-authenticated')
			return
		}
		const userData = reportType === 'greeting'
			? { name: 'Ada Lovelace', role: 'Engineer', department: 'R&D', email: 'ada@example.com' }
			: reportType === 'org'
			? { orgName: 'Acme Corp', industry: 'Manufacturing', size: '200-500', headquarters: 'NYC' }
			: { objectives: 'Onboard new hires', constraints: 'Low budget', audience: 'Remote staff', timeline: 'Q4', budget: '$10k' }
		const createFn = reportType === 'greeting' ? createGreetingReport : reportType === 'org' ? createOrgReport : createRequirementReport
		const { data, error } = await createFn(userData as any, null, { summaryId: summaryId || undefined })
		if (error || !data) {
			setStatus('error:create')
			return
		}
		setReportId(data.id)
		setStatus('created')
	}

	async function startResearch() {
		if (!reportId) return
		setStatus('starting')
		let res
		if (reportType === 'greeting') {
			res = await startGreetingResearchAsync(reportId, { name: 'Ada Lovelace', role: 'Engineer', department: 'R&D', email: 'ada@example.com' }, summaryId || undefined)
		} else if (reportType === 'org') {
			res = await startOrgResearchAsync(reportId, { orgName: 'Acme Corp', industry: 'Manufacturing', size: '200-500', headquarters: 'NYC' }, summaryId || undefined)
		} else {
			res = await startRequirementResearchAsync(reportId, { objectives: 'Onboard new hires', constraints: 'Low budget', audience: 'Remote staff', timeline: 'Q4', budget: '$10k' }, summaryId || undefined)
		}
		if (res.error || !res.data) {
			setStatus('error:start')
			return
		}
		setJobId(res.data.job_id)
		setStatus('queued')
	}

	async function checkLatest() {
		if (!summaryId) return
		setStatus('checking')
		const { data } = await getCompleteReport(reportType, summaryId)
		if (data?.research_report) setOutput(data.research_report)
		setStatus(data?.research_status || 'unknown')
	}

	async function checkWebhookStatus() {
		if (!reportId) return
		setStatus('checking-webhook')
		const { data, error } = await getReportWebhookStatus(reportType, reportId)
		if (error) {
			setStatus('webhook-error')
			setWebhookStatus({ error: error.message })
		} else {
			setWebhookStatus(data)
			setStatus('webhook-checked')
		}
	}

	return (
		<div className="p-6 bg-gray-900 text-white min-h-screen">
			<h1 className="text-2xl mb-6">Reports & Webhook Management</h1>
			
			{/* Tab Navigation */}
			<div className="border-b border-gray-700 mb-6">
				<nav className="-mb-px flex space-x-8">
					{[
						{ id: 'debug' as const, label: 'Debug Reports' },
						{ id: 'monitor' as const, label: 'Webhook Monitor' }
					].map(tab => (
						<button
							key={tab.id}
							onClick={() => setActiveTab(tab.id)}
							className={`py-2 px-1 border-b-2 font-medium text-sm ${
								activeTab === tab.id
									? 'border-blue-500 text-blue-400'
									: 'border-transparent text-gray-400 hover:text-gray-300 hover:border-gray-600'
							}`}
						>
							{tab.label}
						</button>
					))}
				</nav>
			</div>

			{activeTab === 'debug' && (
				<div className="space-y-4">
					<div className="bg-gray-800 p-6 rounded-lg">
						<h2 className="text-xl mb-4">Reports Debug</h2>
						<div className="space-y-3">
							<div className="flex gap-2 items-center">
								<label className="w-20">Type</label>
								<select 
									className="text-black px-2 py-1 rounded" 
									value={reportType} 
									onChange={(e) => setReportType(e.target.value as ReportType)}
								>
									<option value="greeting">greeting</option>
									<option value="org">org</option>
									<option value="requirement">requirement</option>
								</select>
							</div>
							<div className="flex gap-2 items-center">
								<label className="w-20">summaryId</label>
								<input 
									className="text-black px-2 py-1 rounded flex-1" 
									value={summaryId} 
									onChange={(e) => setSummaryId(e.target.value)} 
									placeholder="optional" 
								/>
							</div>
							<div className="flex gap-2 items-center">
								<button className="bg-blue-600 px-3 py-2 rounded hover:bg-blue-700" onClick={createReport}>
									Create report
								</button>
								<span className="text-sm">reportId: <code className="bg-gray-700 px-1 rounded">{reportId || '-'}</code></span>
							</div>
							<div className="flex gap-2 items-center">
								<button 
									className="bg-amber-600 px-3 py-2 rounded hover:bg-amber-700 disabled:bg-gray-600 disabled:cursor-not-allowed" 
									onClick={startResearch} 
									disabled={!reportId}
								>
									Start research
								</button>
								<span className="text-sm">jobId: <code className="bg-gray-700 px-1 rounded">{jobId || '-'}</code></span>
							</div>
							<div className="flex gap-2 items-center">
								<button 
									className="bg-green-600 px-3 py-2 rounded hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed" 
									onClick={checkLatest} 
									disabled={!summaryId}
								>
									Check latest
								</button>
								<button 
									className="bg-purple-600 px-3 py-2 rounded hover:bg-purple-700 disabled:bg-gray-600 disabled:cursor-not-allowed" 
									onClick={checkWebhookStatus} 
									disabled={!reportId}
								>
									Check webhook
								</button>
								<span className="text-sm">status: <code className="bg-gray-700 px-1 rounded">{status}</code></span>
							</div>
						</div>
					</div>

					{/* Webhook Status Display */}
					{webhookStatus && (
						<div className="bg-gray-800 p-6 rounded-lg">
							<h3 className="text-lg font-semibold mb-3">Webhook Status</h3>
							{webhookStatus.error ? (
								<div className="text-red-400">Error: {webhookStatus.error}</div>
							) : (
								<div className="space-y-2 text-sm">
									<div className="grid grid-cols-2 gap-4">
										<div>
											<span className="text-gray-400">Status:</span>
											<span className={`ml-2 px-2 py-1 rounded text-xs ${
												webhookStatus.webhook_status === 'success' ? 'bg-green-600' :
												webhookStatus.webhook_status === 'failed' ? 'bg-red-600' :
												webhookStatus.webhook_status === 'retrying' ? 'bg-yellow-600' :
												'bg-blue-600'
											}`}>
												{webhookStatus.webhook_status}
											</span>
										</div>
										<div>
											<span className="text-gray-400">Attempts:</span>
											<span className="ml-2">{webhookStatus.webhook_attempts || 0}</span>
										</div>
									</div>
									{webhookStatus.webhook_last_attempt && (
										<div>
											<span className="text-gray-400">Last Attempt:</span>
											<span className="ml-2">{new Date(webhookStatus.webhook_last_attempt).toLocaleString()}</span>
										</div>
									)}
									{webhookStatus.webhook_response && Object.keys(webhookStatus.webhook_response).length > 0 && (
										<div>
											<span className="text-gray-400">Response:</span>
											<pre className="mt-1 bg-gray-700 p-2 rounded text-xs overflow-auto">
												{JSON.stringify(webhookStatus.webhook_response, null, 2)}
											</pre>
										</div>
									)}
								</div>
							)}
						</div>
					)}

					{/* Research Report Output */}
					<div className="bg-gray-800 p-6 rounded-lg">
						<h3 className="text-lg font-semibold mb-3">Latest research_report</h3>
						<pre className="whitespace-pre-wrap bg-gray-700 p-4 rounded max-h-96 overflow-auto text-sm">
							{output || '— No content —'}
						</pre>
					</div>
				</div>
			)}

			{activeTab === 'monitor' && (
				<div className="bg-gray-800 rounded-lg">
					<WebhookMonitor />
				</div>
			)}
		</div>
	)
}
