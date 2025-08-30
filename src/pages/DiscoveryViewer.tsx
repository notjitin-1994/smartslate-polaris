import { useParams } from 'react-router-dom'
import { useEffect, useMemo, useRef, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { motion, AnimatePresence } from 'framer-motion'
import VisualRenderer from '@/starmap/VisualRenderer'
import { normalizeReport } from '@/starmap/utils/normalizeReport'
import { isVisualSchema } from '@/starmap/utils/typeguards'
import SourceMarkdown from '@/starmap/SourceMarkdown'
import { exportPNG, exportPDF } from '@/starmap/utils/export'

// Lightweight client-side normalizer to coerce legacy/raw report content
// into the VisualRenderer schema when records are not yet normalized server-side.
function slugifyId(input: string, fallbackPrefix: string): string {
  const base = (input || '').toString().toLowerCase().trim()
  const slug = base.replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
  const finalSlug = slug || `${fallbackPrefix}-${Math.random().toString(36).slice(2, 8)}`
  return finalSlug
}

function mapElementType(rawType: any): string {
  const t = typeof rawType === 'string' ? rawType.toLowerCase() : ''
  const mapping: Record<string, string> = {
    infographic: 'markdown_block',
    chart: 'donut_chart',
    bar_chart: 'bar_chart',
    stacked_bar_chart: 'stacked_bar_chart',
    line_chart: 'line_chart',
    area_chart: 'area_chart',
    bullet_chart: 'bullet_chart',
    pie_chart: 'donut_chart',
    milestone_map: 'milestone_map',
    animation: 'media',
    markdown: 'markdown_block',
    text: 'markdown_block',
  }
  const passthrough: Record<string, true> = {
    kpi_card_group: true,
    timeline: true,
    milestone_map: true,
    gantt: true,
    risk_matrix: true,
    bar_chart: true,
    stacked_bar_chart: true,
    line_chart: true,
    area_chart: true,
    bullet_chart: true,
    donut_chart: true,
    radar_chart: true,
    bubble_chart: true,
    heatmap: true,
    funnel_chart: true,
    sankey: true,
    journey_map: true,
    progress_ring: true,
    table: true,
    grid_of_cards: true,
    infographic_composition: true,
    flowchart: true,
    markdown_block: true,
    media: true,
  }
  if (t in passthrough) return t
  if (t in mapping) return mapping[t]
  return 'markdown_block'
}

function normalizeVisualReportContent(input: any): any | null {
  try {
    const reportContent = input?.views?.report?.content ?? input
    const sourceContent = input?.views?.source?.content

    const isElementLike = (obj: any): boolean => !!obj && typeof obj === 'object' && (
      typeof obj.type === 'string' || typeof obj.chart_type === 'string' || typeof obj.chartType === 'string' || typeof obj?.data?.chart_type === 'string'
    )

    let sections: any[] = []
    if (Array.isArray(reportContent?.sections)) {
      sections = reportContent.sections
    } else if (Array.isArray(reportContent)) {
      if (reportContent.length > 0 && isElementLike(reportContent[0]) && !reportContent[0]?.elements) {
        sections = [{ id: 'overview', title: 'Overview', elements: reportContent }]
      } else {
        sections = reportContent
      }
    } else if (Array.isArray(input?.sections)) {
      sections = input.sections
    } else {
      sections = []
    }

    const normalizedSections = sections.map((section: any, sIdx: number) => {
      const title = section?.title || section?.name || `Section ${sIdx + 1}`
      const subtitle = section?.subtitle || section?.summary || undefined
      const sectionLooksLikeElement = isElementLike(section) && !Array.isArray(section?.elements)
      const rawElements = sectionLooksLikeElement
        ? [section]
        : Array.isArray(section?.elements)
          ? section.elements
          : Array.isArray(section?.visual_elements)
            ? section.visual_elements
            : Array.isArray(section?.items)
              ? section.items
              : []

      const adaptElementData = (type: string, data: any): any => {
        if (!data || typeof data !== 'object') return {}
        switch (type) {
          case 'donut_chart': {
            if (Array.isArray((data as any).slices)) {
              return {
                ...data,
                series: (data as any).slices.map((s: any) => ({ name: s.label ?? s.name, value: Number(s.value) || 0 })),
              }
            }
            if (Array.isArray((data as any).series) && (data as any).series[0] && Array.isArray((data as any).series[0].points)) {
              // If mistakenly supplied with line-style series/points, flatten first series
              const s0 = (data as any).series[0]
              const flat = (s0.points as any[]).map((p: any) => ({ name: String(p.x ?? p.label ?? ''), value: Number(p.y ?? p.value ?? 0) }))
              return { ...data, series: flat }
            }
            return data
          }
          case 'line_chart':
          case 'area_chart':
          case 'bar_chart': {
            if (Array.isArray((data as any).x) && Array.isArray((data as any).y)) {
              return {
                ...data,
                series: (data as any).x.map((name: any, i: number) => ({ name: String(name), value: Number((data as any).y[i]) || 0 })),
              }
            }
            return data
          }
          case 'stacked_bar_chart': {
            return data
          }
          case 'timeline': {
            if (Array.isArray((data as any).events)) {
              return {
                ...data,
                items: (data as any).events.map((e: any) => ({ date: e.date, title: e.label || e.title, description: e.description })),
              }
            }
            return data
          }
          case 'bullet_chart': {
            if (Array.isArray((data as any).rows)) {
              const measures = (data as any).rows.map((r: any) => ({ kpi: r.kpi ?? r.name, unit: r.unit, target: r.target, current: r.current }))
              return { ...data, measures }
            }
            return data
          }
          case 'risk_matrix': {
            if (Array.isArray((data as any).items)) {
              const max = Math.max(1, (data as any).scale_max ?? (data as any).scale?.max ?? 5)
              const size = max
              const matrix: number[][] = Array.from({ length: size }, () => Array.from({ length: size }, () => 0))
              for (const r of (data as any).items) {
                const x = Math.min(size, Math.max(1, Number(r.likelihood) || 1)) - 1
                const y = Math.min(size, Math.max(1, Number(r.impact) || 1)) - 1
                matrix[y][x] += 1
              }
              return { ...data, matrix, labelsX: Array.from({ length: size }, (_, i) => `${i + 1}`), labelsY: Array.from({ length: size }, (_, i) => `${i + 1}`) }
            }
            if (Array.isArray((data as any).risks)) {
              const max = Math.max(1, (data as any).scale?.max ?? 5)
              const size = max
              const matrix: number[][] = Array.from({ length: size }, () => Array.from({ length: size }, () => 0))
              for (const r of (data as any).risks) {
                const x = Math.min(size, Math.max(1, Number(r.likelihood) || 1)) - 1
                const y = Math.min(size, Math.max(1, Number(r.impact) || 1)) - 1
                matrix[y][x] += 1
              }
              return { ...data, matrix, labelsX: Array.from({ length: size }, (_, i) => `${i + 1}`), labelsY: Array.from({ length: size }, (_, i) => `${i + 1}`) }
            }
            return data
          }
          case 'markdown_block': {
            if (typeof (data as any).markdown === 'string' && (data as any).markdown.trim()) {
              return data
            }
            if (typeof (data as any).content === 'string' && (data as any).content.trim()) {
              return { ...data, markdown: (data as any).content }
            }
            const candidates: any[] = [
              (data as any).summary,
              (data as any).description,
              (data as any).text,
              (data as any).body,
            ]
            const picked = candidates.find((v) => typeof v === 'string' && String(v).trim())
            if (picked) return { ...data, markdown: String(picked).trim() }
            if (Array.isArray((data as any).bullets)) {
              const md = ((data as any).bullets as any[]).map((b: any) => `- ${typeof b === 'string' ? b : (b?.text ?? '')}`).filter(Boolean).join('\n')
              if (md) return { ...data, markdown: md }
            }
            if (Array.isArray((data as any).items)) {
              const md = ((data as any).items as any[]).map((it: any) => `- ${typeof it === 'string' ? it : (it?.text ?? it?.label ?? '')}`).filter(Boolean).join('\n')
              if (md) return { ...data, markdown: md }
            }
            return data
          }
          default:
            return data
        }
      }

      const elements = rawElements.map((el: any, eIdx: number) => {
        let type = mapElementType(el?.type)
        if (String(el?.type || '').toLowerCase() === 'chart') {
          const ct = String(el?.data?.chart_type || el?.data?.chartType || el?.chart_type || '').toLowerCase()
          if (ct === 'bar') type = 'bar_chart'
          else if (ct === 'stacked_bar' || ct === 'stacked') type = 'stacked_bar_chart'
          else if (ct === 'line') type = 'line_chart'
          else if (ct === 'area') type = 'area_chart'
          else if (ct === 'donut' || ct === 'pie') type = 'donut_chart'
          else if (ct === 'sankey') type = 'sankey'
          else if (ct === 'bullet') type = 'bullet_chart'
        }
        // Prefer explicit chart_type signal even if element.type is mismatched
        const declaredCt = String(el?.data?.chart_type || el?.data?.chartType || '').toLowerCase()
        if (declaredCt) {
          if (declaredCt === 'bar') type = 'bar_chart'
          else if (declaredCt === 'stacked_bar' || declaredCt === 'stacked') type = 'stacked_bar_chart'
          else if (declaredCt === 'line') type = 'line_chart'
          else if (declaredCt === 'area') type = 'area_chart'
          else if (declaredCt === 'donut' || declaredCt === 'pie') type = 'donut_chart'
          else if (declaredCt === 'sankey') type = 'sankey'
          else if (declaredCt === 'bullet') type = 'bullet_chart'
        }
        const id = el?.id || slugifyId(`${type}-${eIdx + 1}`, `el-${eIdx + 1}`)
        let data: any = adaptElementData(type, el?.data)
        // Flatten multi-series `{ series: [{ name, points:[{x,y}]}...] }` to first series for current simple renderers
        if ((type === 'bar_chart' || type === 'line_chart' || type === 'area_chart') && Array.isArray((data as any)?.series) && Array.isArray((data as any).series[0]?.points)) {
          const s0 = (data as any).series[0]
          const flat = (s0.points as any[]).map((p: any) => ({ name: p.x ?? p.label ?? '', value: Number(p.y ?? p.value ?? 0) }))
          if (import.meta.env.DEV) {
            try {
              // eslint-disable-next-line no-console
              console.info('[dev] Flattened multi-series to first series', { id, type, seriesNames: (data as any).series.map((s: any) => s.name) })
            } catch {}
          }
          data = { ...data, series: flat }
        }
        if (type === 'markdown_block') {
          const hasMd = typeof (data as any)?.markdown === 'string' && String((data as any).markdown).trim()
          if (!hasMd) {
            const candidates: any[] = [el?.content, el?.text, el?.summary]
            const picked = candidates.find((v) => typeof v === 'string' && String(v).trim())
            if (picked) data = { ...(data || {}), markdown: String(picked).trim() }
          }
        }
        const layout = el?.layout || { span: { lg: 12, md: 8, sm: 4 } }
        return { id, type, data: data || {}, layout }
      })

      return {
        id: section?.id || slugifyId(title, `section-${sIdx + 1}`),
        title,
        subtitle,
        elements,
      }
    })

    const ensuredSections = normalizedSections.length > 0
      ? normalizedSections
      : [
          {
            id: 'overview',
            title: 'Overview',
            elements: [
              {
                id: 'overview-md',
                type: 'markdown_block',
                data: { markdown: typeof sourceContent === 'string' ? sourceContent : 'Report generated. Switch to the Source tab for details.' },
                layout: { span: { lg: 12, md: 8, sm: 4 } },
              },
            ],
          },
        ]

    const schema = { sections: ensuredSections }
    return schema
  } catch {
    return null
  }
}

type MasterDiscoveryRow = {
  id: string
  final_report: {
    meta?: { title?: string; description?: string; [k: string]: any }
    views?: {
      source?: { format: 'markdown'; content: string }
      report?: { format: 'visualized'; content: any }
    }
    [k: string]: any
  } | null
  created_at: string
  updated_at: string
}

export default function DiscoveryViewer() {
  const { starmapID } = useParams()
  const [row, setRow] = useState<MasterDiscoveryRow | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const reportRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    let mounted = true

    const fetchRow = async () => {
      const { data, error } = await supabase
        .from('master_discovery')
        .select('id, final_report, created_at, updated_at')
        .eq('id', starmapID!)
        .maybeSingle()

      if (!mounted) return
      if (error) console.error(error)
      setRow(data as any)
      setLoading(false)
    }

    fetchRow()

    const channel = supabase
      .channel(`md-${starmapID}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'master_discovery', filter: `id=eq.${starmapID}` },
        (payload) => setRow(payload.new as any)
      )
      .subscribe()

    return () => { supabase.removeChannel(channel); mounted = false }
  }, [starmapID])

  const finalReport = row?.final_report ?? {}
  const meta = finalReport?.meta ?? {}
  const title = useMemo(() => meta.title ?? 'Learning Implementation Blueprint', [meta])
  const description = useMemo(() => meta.description ?? '', [meta])
  const source = finalReport?.views?.source?.content ?? ''
  const report = finalReport?.views?.report?.content ?? null
  const visualReport = useMemo(() => {
    if (report && isVisualSchema(report)) return report
    const candidateA = normalizeReport(finalReport?.views?.report?.content ?? finalReport)
    if (candidateA && isVisualSchema(candidateA)) return candidateA
    const normalized = normalizeVisualReportContent(finalReport)
    if (import.meta.env.DEV) {
      try {
        const missing: string[] = []
        const sections = (normalized as any)?.sections || []
        if (!Array.isArray(sections) || sections.length === 0) missing.push('sections[] missing')
        const perSectionIssues = sections.map((s: any) => {
          const issues: string[] = []
          if (!s?.id) issues.push('no id')
          if (!s?.title) issues.push('no title')
          if (!Array.isArray(s?.elements) || s.elements.length === 0) issues.push('no elements')
          else {
            s.elements.forEach((el: any, i: number) => {
              const elIssues: string[] = []
              if (!el?.id) elIssues.push('no id')
              if (!el?.type) elIssues.push('no type')
              if (!el?.data || (typeof el.data === 'object' && Object.keys(el.data).length === 0)) elIssues.push('empty data')
              if (elIssues.length) issues.push(`el[${i}] ${el?.type || 'unknown'} → ${elIssues.join(', ')}`)
            })
          }
          return { sectionId: s?.id || '(unknown)', issues }
        })
        const hasIssues = missing.length > 0 || perSectionIssues.some((s: any) => (s.issues || []).length > 0)
        if (hasIssues) {
          // eslint-disable-next-line no-console
          console.info('[dev] Visual report validation', { globalIssues: missing, perSectionIssues })
        }
      } catch {}
    }
    return normalized && isVisualSchema(normalized) ? normalized : null
  }, [report, finalReport])

  const [draftTitle, setDraftTitle] = useState(title)
  const [draftDesc, setDraftDesc] = useState(description)
  useEffect(() => setDraftTitle(title), [title])
  useEffect(() => setDraftDesc(description), [description])

  const saveMeta = async () => {
    if (!row) return
    setSaving(true)
    const next = {
      ...(row.final_report ?? {}),
      meta: { ...(row.final_report?.meta ?? {}), title: draftTitle, description: draftDesc }
    }
    const { error } = await supabase
      .from('master_discovery')
      .update({ final_report: next })
      .eq('id', row.id)
    if (error) console.error(error)
    setSaving(false)
  }

  if (loading) {
    return (
      <div className="px-6 py-8">
        <div className="h-9 w-64 rounded bg-white/10 animate-pulse mb-3" />
        <div className="h-5 w-96 rounded bg-white/10 animate-pulse mb-6" />
        <div className="h-10 w-56 rounded bg-white/10 animate-pulse" />
      </div>
    )
  }

  return (
    <div className="px-0 pb-10">
      <div className="mb-6">
        <div className="flex items-start justify-between gap-4">
          <div className="w-full">
            <Input
              value={draftTitle}
              onChange={(e) => setDraftTitle(e.target.value)}
              className="text-2xl md:text-3xl font-semibold bg-transparent border-0 focus-visible:ring-0 px-0"
              aria-label="Discovery title"
            />
            <Textarea
              value={draftDesc}
              onChange={(e) => setDraftDesc(e.target.value)}
              className="mt-2 bg-transparent min-h-[72px]"
              placeholder="Add a short description of this discovery…"
              aria-label="Discovery description"
            />
          </div>
          <div className="flex-shrink-0 pt-1 flex gap-2">
            <Button onClick={saveMeta} disabled={saving}>{saving ? 'Saving…' : 'Save'}</Button>
            <Button variant="secondary" onClick={() => { if (reportRef.current) exportPNG(reportRef.current) }}>PNG</Button>
            <Button variant="secondary" onClick={() => { if (reportRef.current) exportPDF(reportRef.current) }}>PDF</Button>
          </div>
        </div>
      </div>

      <Tabs defaultValue="report" className="w-full">
        <TabsList className="grid grid-cols-2 w-full max-w-md">
          <TabsTrigger value="report">Report</TabsTrigger>
          <TabsTrigger value="source">Source</TabsTrigger>
        </TabsList>

        <TabsContent value="report" className="mt-6">
          <AnimatePresence mode="wait">
            {visualReport ? (
              <motion.div
                key="report"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.28 }}
              >
                <div ref={reportRef}>
                  <VisualRenderer schema={visualReport} />
                </div>
              </motion.div>
            ) : (
              <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-sm opacity-70">
                No visual report found. Check the Source tab or regenerate the report.
              </motion.div>
            )}
          </AnimatePresence>
        </TabsContent>

        <TabsContent value="source" className="mt-6">
          <SourceMarkdown markdown={source} />
        </TabsContent>
      </Tabs>
    </div>
  )
}


