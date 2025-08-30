import { Button } from '@/components/ui/button'
import { exportCSV } from '@/starmap/utils/export'

type ColumnDef = { key: string; label: string }

function toColumnDefs(input: any, sampleRow: any): ColumnDef[] {
  const fromStrings = (cols: string[]): ColumnDef[] => cols.map((k) => ({ key: k, label: k }))
  if (Array.isArray(input) && input.length) {
    if (typeof input[0] === 'string') return fromStrings(input as string[])
    if (typeof input[0] === 'object') {
      // Support [{ key, label }] or [{ accessor, header }]
      return (input as any[]).map((c) => ({
        key: String(c.key ?? c.accessor ?? c.field ?? c.name ?? ''),
        label: String(c.label ?? c.header ?? c.title ?? c.name ?? c.key ?? ''),
      })).filter((c) => c.key)
    }
  }
  // Derive from object keys or array indices
  if (sampleRow && typeof sampleRow === 'object' && !Array.isArray(sampleRow)) {
    return Object.keys(sampleRow).map((k) => ({ key: k, label: k }))
  }
  if (Array.isArray(sampleRow)) {
    return sampleRow.map((_: any, idx: number) => ({ key: String(idx), label: `Col ${idx + 1}` }))
  }
  return []
}

function toRowObjects(rows: any[], columns: ColumnDef[]): any[] {
  if (!Array.isArray(rows)) return []
  if (!rows.length) return []
  if (typeof rows[0] === 'object' && !Array.isArray(rows[0])) return rows
  // Convert array rows to objects by column order
  return rows.map((arr: any[]) => {
    const obj: Record<string, any> = {}
    columns.forEach((c, i) => { obj[c.key] = (arr as any[])[i] })
    return obj
  })
}

function getValue(row: any, key: string): any {
  // Support dot-notation accessors like "stats.total"
  if (!key.includes('.')) return row?.[key]
  return key.split('.').reduce((acc: any, part: string) => (acc == null ? acc : acc[part]), row)
}

export default function DataTable({ spec }: { spec: any }) {
  const rawRows: any[] = Array.isArray(spec?.data?.rows)
    ? spec.data.rows
    : Array.isArray(spec?.data?.data)
      ? spec.data.data
      : Array.isArray(spec?.data?.items)
        ? spec.data.items
        : []

  const colDefs: ColumnDef[] = toColumnDefs(spec?.data?.columns || spec?.data?.headers, rawRows[0])
  const rows = toRowObjects(rawRows, colDefs.length ? colDefs : toColumnDefs(undefined, rawRows[0]))
  const columns = (colDefs.length ? colDefs : toColumnDefs(undefined, rows[0]))

  if (!rows.length || !columns.length) return <div className="text-sm opacity-70">No data available.</div>

  const toDisplay = (v: any) => {
    if (v === null || v === undefined) return ''
    if (typeof v === 'number') return v
    if (typeof v === 'string') return v
    return JSON.stringify(v)
  }
  const safeRowsForCsv = rows.map((r) => {
    const out: Record<string, any> = {}
    columns.forEach((c) => {
      const v = getValue(r, c.key)
      out[c.label] = toDisplay(v)
    })
    return out
  })

  return (
    <div className="read-surface">
      <div className="flex items-center justify-between px-3 py-2 border-b border-white/10 rounded-t-[1rem]">
        <div className="text-sm font-medium">{spec?.title || 'Table'}</div>
        <div className="flex gap-2">
          <Button size="sm" variant="secondary" onClick={() => exportCSV(safeRowsForCsv, (spec?.title || 'table') + '.csv')}>Export CSV</Button>
        </div>
      </div>
      <div className="overflow-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-white/5">
            <tr>
              {columns.map((c) => (
                <th key={c.key} className="text-left px-3 py-2 font-medium text-white/80">{c.label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i} className="odd:bg-white/[0.02]">
                {columns.map((c) => {
                  const v = getValue(r, c.key)
                  const display = toDisplay(v)
                  return <td key={c.key} className="px-3 py-2 text-white/80">{String(display)}</td>
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}


