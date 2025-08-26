import { useEffect, useMemo, useState } from 'react'
import { apiDebugStore, type ApiLogEntry } from '@/dev/apiDebug'

export default function ApiDebug() {
  const [logs, setLogs] = useState<ApiLogEntry[]>(apiDebugStore.get())
  const [query, setQuery] = useState('')
  const [onlyErrors, setOnlyErrors] = useState(false)

  useEffect(() => {
    const unsub = apiDebugStore.subscribe(() => setLogs([...apiDebugStore.get()]))
    return unsub
  }, [])

  const filtered = useMemo(() => {
    return logs.filter(l => {
      const matchesQ = !query || (l.url + ' ' + (l.error || '')).toLowerCase().includes(query.toLowerCase())
      const matchesErr = !onlyErrors || !l.ok
      return matchesQ && matchesErr
    })
  }, [logs, query, onlyErrors])

  return (
    <div className="min-h-screen bg-[#0A1628] text-white p-4">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-2xl font-semibold mb-4">API Debug {import.meta.env.DEV ? '(dev)' : '(prod)'}</h1>
        {!import.meta.env.DEV && (
          <div className="mb-4 p-3 rounded bg-yellow-500/10 text-yellow-300">This page is intended for development use.</div>
        )}

        <div className="flex flex-wrap gap-2 mb-4">
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Filter by URL or error"
            className="px-3 py-2 rounded bg-white/10 border border-white/20 outline-none w-80"
          />
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={onlyErrors} onChange={e => setOnlyErrors(e.target.checked)} />
            Only errors
          </label>
          <button
            onClick={() => apiDebugStore.clear()}
            className="px-3 py-2 rounded bg-white/10 hover:bg-white/20 border border-white/20 text-sm"
          >
            Clear
          </button>
        </div>

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
              {filtered.map(entry => (
                <Row key={entry.id} entry={entry} />
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="p-6 text-center text-white/50">No logs yet. Trigger some API calls.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
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


