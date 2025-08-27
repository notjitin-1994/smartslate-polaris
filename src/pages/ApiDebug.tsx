import { useEffect, useMemo, useState } from 'react'
import { apiDebugStore, type ApiLogEntry } from '@/dev/apiDebug'
import { errorTrackerStore, type ErrorLogEntry } from '@/dev/errorTracker'

export default function ApiDebug() {
  const [tab, setTab] = useState<'calls' | 'errors'>('calls')
  const [logs, setLogs] = useState<ApiLogEntry[]>(apiDebugStore.get())
  const [errors, setErrors] = useState<ErrorLogEntry[]>(errorTrackerStore.get())
  const [query, setQuery] = useState('')
  const [onlyErrors, setOnlyErrors] = useState(false)
  const [groupBy, setGroupBy] = useState<'none' | 'fingerprint' | 'origin' | 'type'>('none')
  const [selectedErrorId, setSelectedErrorId] = useState<string | null>(null)
  const selectedError = useMemo(() => errors.find(e => e.id === selectedErrorId) || null, [errors, selectedErrorId])

  useEffect(() => {
    const unsubA = apiDebugStore.subscribe(() => setLogs([...apiDebugStore.get()]))
    const unsubB = errorTrackerStore.subscribe(() => setErrors([...errorTrackerStore.get()]))
    return () => { unsubA(); unsubB() }
  }, [])

  const filteredCalls = useMemo(() => {
    return logs.filter(l => {
      const matchesQ = !query || (l.url + ' ' + (l.error || '')).toLowerCase().includes(query.toLowerCase())
      const matchesErr = !onlyErrors || !l.ok
      return matchesQ && matchesErr
    })
  }, [logs, query, onlyErrors])

  const filteredErrors = useMemo(() => {
    const arr = errors.filter(e => {
      const hay = (e.message + ' ' + (e.origin || '') + ' ' + (e.code || '') + ' ' + (e.statusCode || '')).toLowerCase()
      return !query || hay.includes(query.toLowerCase())
    })
    if (groupBy === 'none') return arr
    const keyFn = (e: ErrorLogEntry) => groupBy === 'fingerprint' ? (e.fingerprint || 'unknown') : groupBy === 'origin' ? (e.origin || 'unknown') : e.type
    const groups: Record<string, { key: string; items: ErrorLogEntry[] }> = {}
    for (const e of arr) {
      const k = keyFn(e)
      if (!groups[k]) groups[k] = { key: k, items: [] }
      groups[k].items.push(e)
    }
    // Flatten groups sorted by size desc
    const flattened: ErrorLogEntry[] = []
    Object.values(groups)
      .sort((a, b) => b.items.length - a.items.length)
      .forEach(g => flattened.push(...g.items))
    return flattened
  }, [errors, query, groupBy])

  return (
    <div className="min-h-screen bg-[#0A1628] text-white p-4">
      <div className="max-w-[1400px] mx-auto">
        <h1 className="text-2xl font-semibold mb-2">API Debug {import.meta.env.DEV ? '(dev)' : '(prod)'}</h1>
        <div className="mb-4 text-white/60 text-sm">Track API calls and runtime errors in one place.</div>
        {!import.meta.env.DEV && (
          <div className="mb-4 p-3 rounded bg-yellow-500/10 text-yellow-300">This page is intended for development use.</div>
        )}

        <div className="flex items-center gap-2 mb-3">
          <button onClick={() => setTab('calls')} className={`px-3 py-1.5 rounded border text-sm ${tab==='calls' ? 'bg-white/15 border-white/30' : 'bg-white/5 border-white/10 hover:bg-white/10'}`}>Calls</button>
          <button onClick={() => setTab('errors')} className={`px-3 py-1.5 rounded border text-sm ${tab==='errors' ? 'bg-white/15 border-white/30' : 'bg-white/5 border-white/10 hover:bg-white/10'}`}>Errors</button>
          <div className="ml-auto flex gap-2 text-xs text-white/60">
            <SummaryBadge label="Calls" value={logs.length} />
            <SummaryBadge label="Errors" value={errors.length} />
            <SummaryBadge label="HTTP 4xx/5xx" value={logs.filter(l => (l.status ?? 0) >= 400).length} />
          </div>
        </div>

        <div className="flex flex-wrap gap-2 mb-4">
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder={tab==='calls' ? 'Filter by URL or error' : 'Filter by message, origin, code'}
            className="px-3 py-2 rounded bg-white/10 border border-white/20 outline-none w-80"
          />
          {tab === 'calls' && (
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={onlyErrors} onChange={e => setOnlyErrors(e.target.checked)} />
              Only errors
            </label>
          )}
          {tab === 'errors' && (
            <select value={groupBy} onChange={e => setGroupBy(e.target.value as any)} className="px-3 py-2 rounded bg-white/10 border border-white/20 text-sm">
              <option value="none">No grouping</option>
              <option value="fingerprint">Group by fingerprint</option>
              <option value="origin">Group by origin</option>
              <option value="type">Group by type</option>
            </select>
          )}
          {tab === 'errors' && (
            <button
              onClick={() => exportErrorsToJson(filteredErrors)}
              className="px-3 py-2 rounded bg-white/10 hover:bg-white/20 border border-white/20 text-sm"
            >
              Export JSON
            </button>
          )}
          {import.meta.env.DEV && (
            <>
              <button
                onClick={generateApiTests}
                className="px-3 py-2 rounded bg-white/10 hover:bg-white/20 border border-white/20 text-sm"
              >
                Generate API tests
              </button>
              <button
                onClick={generateErrorTests}
                className="px-3 py-2 rounded bg-white/10 hover:bg-white/20 border border-white/20 text-sm"
              >
                Generate Error tests
              </button>
            </>
          )}
          <button
            onClick={() => apiDebugStore.clear()}
            className="px-3 py-2 rounded bg-white/10 hover:bg-white/20 border border-white/20 text-sm"
          >
            Clear
          </button>
          {tab === 'errors' && (
            <button
              onClick={() => errorTrackerStore.clear()}
              className="px-3 py-2 rounded bg-white/10 hover:bg-white/20 border border-white/20 text-sm"
            >
              Clear Errors
            </button>
          )}
        </div>

        {tab === 'calls' ? (
          <div className="overflow-auto rounded border border-white/10">
            <table className="min-w-full text-sm">
              <thead className="bg-white/5">
                <tr>
                  <th className="text-left p-2">Time</th>
                  <th className="text-left p-2">Method</th>
                  <th className="text-left p-2">URL</th>
                  <th className="text-left p-2">Status</th>
                  <th className="text-left p-2">Duration</th>
                  <th className="text-left p-2">Error</th>
                  <th className="text-left p-2">Details</th>
                </tr>
              </thead>
              <tbody>
                {filteredCalls.map(entry => (
                  <Row key={entry.id} entry={entry} />
                ))}
                {filteredCalls.length === 0 && (
                  <tr>
                    <td colSpan={7} className="p-6 text-center text-white/50">No logs yet. Trigger some API calls.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            <div className="overflow-auto rounded border border-white/10">
              <table className="min-w-full text-sm">
                <thead className="bg-white/5">
                  <tr>
                    <th className="text-left p-2">Time</th>
                    <th className="text-left p-2">Type</th>
                    <th className="text-left p-2">Message</th>
                    <th className="text-left p-2">Origin</th>
                    <th className="text-left p-2">Code</th>
                    <th className="text-left p-2">Status</th>
                    <th className="text-left p-2">Details</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredErrors.map(entry => (
                    <ErrorRow key={entry.id} entry={entry} onSelect={setSelectedErrorId} selectedId={selectedErrorId} />
                  ))}
                  {filteredErrors.length === 0 && (
                    <tr>
                      <td colSpan={7} className="p-6 text-center text-white/50">No errors captured yet.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            <div className="rounded border border-white/10 bg-white/5 p-3 min-h-[360px]">
              {!selectedError && (
                <div className="text-white/50 text-sm">Select an error to see details.</div>
              )}
              {selectedError && (
                <div className="space-y-3 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded bg-red-500/10 border border-red-400/30 text-red-300">{selectedError.type}</span>
                    <span className="text-white/70">{selectedError.origin || '—'}</span>
                    <span className="text-white/70">{selectedError.code || '—'}</span>
                    <span className="text-white/70">{selectedError.statusCode ?? '—'}</span>
                  </div>
                  <div className="text-white">{selectedError.message}</div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <Section title="Stack" content={selectedError.stack || ''} />
                    <Section title="Component Stack" content={selectedError.componentStack || ''} />
                    <Section title="Context" content={selectedError.context || {}} />
                    <Section title="Breadcrumbs" content={(selectedError.breadcrumbs || []).map(b => ({ t: b.timestamp, c: b.category, m: b.message, d: b.data, l: b.level }))} />
                    <Section title="Fingerprint" content={selectedError.fingerprint || ''} />
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function Row({ entry }: { entry: ApiLogEntry }) {
  const [open, setOpen] = useState(false)
  const ts = new Date(entry.timestamp).toLocaleTimeString()

  return (
    <>
      <tr className="border-t border-white/10">
        <td className="p-2 whitespace-nowrap text-white/70">{ts}</td>
        <td className="p-2 whitespace-nowrap">
          <span className="px-2 py-0.5 rounded bg-white/10 border border-white/10 text-white/80">{entry.method}</span>
        </td>
        <td className="p-2 max-w-[32rem] truncate text-white/80" title={entry.url}>{entry.url}</td>
        <td className="p-2 whitespace-nowrap">
          {typeof entry.status === 'number' ? (
            <span className={`px-2 py-0.5 rounded border ${entry.ok ? 'bg-green-500/10 border-green-400/30 text-green-300' : 'bg-red-500/10 border-red-400/30 text-red-300'}`}>
              {entry.status}
            </span>
          ) : (
            <span className="text-white/50">—</span>
          )}
        </td>
        <td className="p-2 whitespace-nowrap text-white/70">{entry.durationMs ?? '—'} ms</td>
        <td className="p-2 text-red-300 truncate max-w-[16rem]" title={entry.error}>{entry.error || ''}</td>
        <td className="p-2">
          <button onClick={() => setOpen(v => !v)} className="text-primary-300 hover:text-primary-200 text-sm">{open ? 'Hide' : 'Show'}</button>
        </td>
      </tr>
      {open && (
        <tr className="border-t border-white/10 bg-white/5">
          <td colSpan={7} className="p-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
              <Section title="Request Headers" content={entry.requestHeaders} />
              <Section title="Response Headers" content={entry.responseHeaders} />
              <Section title="Request Body" content={entry.requestBody} />
              <Section title="Response Body" content={entry.responseBody} />
            </div>
          </td>
        </tr>
      )}
    </>
  )
}

function Section({ title, content }: { title: string; content: any }) {
  return (
    <div>
      <div className="text-white/60 mb-1">{title}</div>
      <pre className="bg-black/30 rounded p-2 overflow-auto max-h-60 whitespace-pre-wrap text-white/80">
        {formatContent(content)}
      </pre>
    </div>
  )
}

function formatContent(content: any): string {
  if (content == null || content === '') return ''
  try {
    return typeof content === 'string' ? content : JSON.stringify(content, null, 2)
  } catch {
    return String(content)
  }
}

function SummaryBadge({ label, value }: { label: string; value: number }) {
  return (
    <div className="px-2 py-1 rounded bg-white/5 border border-white/10">
      <span className="text-white/40 mr-2">{label}</span>
      <span className="text-white/90">{value}</span>
    </div>
  )
}

function ErrorRow({ entry, onSelect, selectedId }: { entry: ErrorLogEntry; onSelect?: (id: string) => void; selectedId?: string | null }) {
  const [open, setOpen] = useState(false)
  const ts = new Date(entry.timestamp).toLocaleTimeString()
  return (
    <>
      <tr className={`border-t border-white/10 ${selectedId === entry.id ? 'bg-white/10' : ''}`} onClick={() => onSelect?.(entry.id)}>
        <td className="p-2 whitespace-nowrap text-white/70">{ts}</td>
        <td className="p-2 whitespace-nowrap">
          <span className="px-2 py-0.5 rounded bg-red-500/10 border border-red-400/30 text-red-300">
            {entry.type}
          </span>
        </td>
        <td className="p-2 max-w-[32rem] truncate text-white/80" title={entry.message}>{entry.message}</td>
        <td className="p-2 whitespace-nowrap text-white/70">{entry.origin || '—'}</td>
        <td className="p-2 whitespace-nowrap text-white/70">{entry.code || '—'}</td>
        <td className="p-2 whitespace-nowrap text-white/70">{entry.statusCode ?? '—'}</td>
        <td className="p-2">
          <button onClick={(e) => { e.stopPropagation(); setOpen(v => !v) }} className="text-primary-300 hover:text-primary-200 text-sm">{open ? 'Hide' : 'Show'}</button>
        </td>
      </tr>
      {open && (
        <tr className="border-t border-white/10 bg-white/5">
          <td colSpan={7} className="p-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
              <Section title="Stack" content={entry.stack || ''} />
              <Section title="Component Stack" content={entry.componentStack || ''} />
              <Section title="Tags" content={entry.tags || []} />
              <Section title="Context" content={entry.context || {}} />
              <Section title="Breadcrumbs" content={(entry.breadcrumbs || []).map(b => ({ t: b.timestamp, c: b.category, m: b.message, d: b.data, l: b.level }))} />
              <Section title="Fingerprint" content={entry.fingerprint || ''} />
            </div>
          </td>
        </tr>
      )}
    </>
  )
}

function exportErrorsToJson(errs: ErrorLogEntry[]) {
  try {
    const blob = new Blob([JSON.stringify(errs, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `errors_${new Date().toISOString()}.json`
    a.click()
    URL.revokeObjectURL(url)
  } catch {}
}

async function generateApiTests() {
  try { await fetch('/api/does-not-exist') } catch {}
  try { await fetch('http://localhost:1/ping') } catch {}
}

function generateErrorTests() {
  try { console.error(new Error('Test console error')) } catch {}
  try { Promise.reject(new Error('Test unhandled rejection')) } catch {}
  try { setTimeout(() => { throw new Error('Test runtime error') }, 0) } catch {}
}


