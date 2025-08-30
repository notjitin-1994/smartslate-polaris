export const config = { runtime: 'edge' }

type RequestBody = {
  id?: string
}

function ensureEnv(name: string, fallback?: string): string {
  const value = (process.env as Record<string, string | undefined>)[name] || fallback
  if (!value) throw new Error(`Missing required env: ${name}`)
  return value
}

function buildSystemPrompt(): string {
  return `You are an expert Learning Experience Architect, Strategy Consultant, and Experience Designer.
Your task is to generate a final Learning Implementation Blueprint JSON document.
This JSON will power a web-based viewer with two tabs: "Source" and "Report".

### Output Format
The output must be valid JSON with the following structure:

{
  "meta": {
    "generated_for_user_id": string,
    "role_title": string|null,
    "organization": string|null,
    "industry": string|null,
    "notes": string
  },
  "views": {
    "source": {
      "format": "markdown",
      "content": "..." // full structured markdown with headings, lists, tables, highlights
    },
    "report": {
      "format": "visualized",
      "content": {
        "sections": [
          {
            "title": string,
            "summary": string,
            "visual_elements": [
              { "type": "infographic"|"timeline"|"chart"|"milestone_map"|"risk_matrix"|"table"|"animation", "data": object }
            ]
          }
        ]
      }
    }
  }
}

### Report Expectations
1. Source Tab (Markdown)
   - Provide a full structured learning blueprint in clean markdown.
   - Support formatting: headings, bold, italics, underline, tables, bullet/numbered lists, highlights, blockquotes.
   - Ensure readability for non-technical human readers.

2. Report Tab (Visualized)
   - Provide a structured array of sections for rendering.
   - Include suggestions for charts, infographics, animated timelines, and milestone maps.
   - Ensure accessibility (color-safe, screen reader friendly, minimal clutter).
   - Designed for modern, aesthetic, industry-leading report presentation.
   - Each section should map to a key blueprint element (Discovery, Audience, Risks, Content Strategy, Delivery Plan, Assessment, Success Criteria).

3. Integration with Data
   - Synthesize inputs from both static_answers and dynamic_answers.
   - Ensure all context (role, org, stakeholders, constraints, goals, timeline) is reflected in the recommendations.
   - If key info is missing, note gaps explicitly in the report.

4. Tone & Style
   - Consultative, actionable, implementation-ready.
   - Blueprint must guide real-world execution (scope, risks, modalities, logistics, tracking, evaluation).`
}

function buildUserPrompt(row: Record<string, any>): string {
  const staticAnswers = row.static_answers || {}
  const dynamicAnswers = row.dynamic_answers || {}
  const userId = row.user_id || ''
  const roleTitle = (staticAnswers?.requestor?.role_title?.user_answer) || null
  const organization = (staticAnswers?.group?.group_name?.user_answer) || null
  const industry = (staticAnswers?.group?.industry?.user_answer) || null

  const lines: string[] = []
  lines.push('CONTEXT DATA:')
  lines.push('')
  lines.push('static_answers:')
  lines.push(JSON.stringify(staticAnswers))
  lines.push('')
  lines.push('dynamic_answers:')
  lines.push(JSON.stringify(dynamicAnswers))
  lines.push('')
  lines.push('TASK:')
  lines.push('Using the above, generate a comprehensive Learning Implementation Blueprint document as described in the system prompt.')
  lines.push('')
  lines.push('- Ensure the document integrates all provided answers into a structured, coherent strategy.')
  lines.push('- Fill in any missing details by drawing on best practices in learning design, project management, and instructional frameworks.')
  lines.push('- Adapt recommendations to the user’s role, organization, industry, goals, group size, stakeholders, timeline, constraints, and risks.')
  lines.push('- Where appropriate, provide concrete examples, frameworks, or models tailored to context.')
  lines.push('- Include actionable timelines, milestones, and metrics so the document is implementation-ready.')
  lines.push('')
  lines.push('OUTPUT:')
  lines.push('Return a single JSON object exactly following the Output Format defined in the system prompt.')
  lines.push('Populate meta.generated_for_user_id, meta.role_title, meta.organization, meta.industry based on context (nullable when unknown).')
  return lines.join('\n')
}

function slugifyId(input: string, fallbackPrefix: string): string {
  const base = (input || '').toString().toLowerCase().trim()
  const slug = base
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
  const finalSlug = slug || `${fallbackPrefix}-${Math.random().toString(36).slice(2, 8)}`
  return finalSlug
}

function mapElementType(rawType: any): string {
  const t = typeof rawType === 'string' ? rawType.toLowerCase() : ''
  // Map broad/generic types from the model to supported renderer types
  const mapping: Record<string, string> = {
    infographic: 'markdown_block',
    chart: 'donut_chart',
    bar_chart: 'bar_chart',
    line_chart: 'table',
    area_chart: 'table',
    pie_chart: 'donut_chart',
    milestone_map: 'timeline',
    animation: 'markdown_block',
    markdown: 'markdown_block',
    text: 'markdown_block',
  }
  const passthrough: Record<string, true> = {
    // Supported renderer element types
    kpi_card_group: true,
    timeline: true,
    milestone_map: true,
    gantt: true,
    risk_matrix: true,
    donut_chart: true,
    bar_chart: true,
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

function adaptElementData(type: string, data: any): any {
  if (!data || typeof data !== 'object') return {}
  switch (type) {
    case 'donut_chart': {
      // Accept {slices:[{label,value}], title} → {series:[{name,value}]}
      if (Array.isArray((data as any).slices)) {
        return {
          ...data,
          series: (data as any).slices.map((s: any) => ({ name: s.label ?? s.name, value: Number(s.value) || 0 })),
        }
      }
      return data
    }
    case 'timeline': {
      // Accept {events:[{date,label}]} → {items:[{date,title}]}
      if (Array.isArray((data as any).events)) {
        return {
          ...data,
          items: (data as any).events.map((e: any) => ({ date: e.date, title: e.label || e.title, description: e.description })),
        }
      }
      return data
    }
    case 'risk_matrix': {
      // Accept {risks:[{likelihood, impact, name}], scale} → matrix grid heat approximation
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
    case 'milestone_map': {
      // Accept {milestones:[{name,outcome,duration_min}]}
      return data
    }
    case 'table': {
      // Allow rows/columns passthrough; also adapt bullet/measures to rows
      if (Array.isArray((data as any).measures)) {
        const rows = (data as any).measures.map((m: any) => ({
          kpi: m.kpi ?? m.name ?? '',
          unit: m.unit ?? '',
          target: m.target ?? '',
          current: m.current ?? '',
        }))
        return { ...data, rows, columns: ['kpi','unit','target','current'] }
      }
      return data
    }
    case 'bullet_chart': {
      // Accept measures directly
      if (Array.isArray((data as any).measures)) return data
      // Adapt from table.rows to measures if needed
      if (Array.isArray((data as any).rows)) {
        const measures = (data as any).rows.map((r: any) => ({
          kpi: r.kpi ?? r.name,
          unit: r.unit,
          target: r.target,
          current: r.current,
        }))
        return { ...data, measures }
      }
      return data
    }
    case 'markdown_block': {
      // Accept {markdown:string} or {content:string} → {markdown}; also build markdown from structured fields
      if (typeof (data as any).markdown === 'string' && (data as any).markdown.trim()) {
        return data
      }
      if (typeof (data as any).content === 'string' && (data as any).content.trim()) {
        return { ...data, markdown: (data as any).content }
      }
      // Coalesce common text-bearing fields
      const candidates: any[] = [
        (data as any).summary,
        (data as any).description,
        (data as any).text,
        (data as any).body,
      ]
      let mdParts: string[] = []
      for (const c of candidates) {
        if (typeof c === 'string' && c.trim()) mdParts.push(String(c).trim())
      }
      if (typeof (data as any).framework === 'string') {
        mdParts.push(`**Framework:** ${(data as any).framework}`)
      }
      if (Array.isArray((data as any).principles)) {
        mdParts.push('', ...(data as any).principles.map((p: any) => `- ${String(p)}`))
      }
      if (Array.isArray((data as any).supports)) {
        mdParts.push('', ...((data as any).supports as any[]).map((s: any) => `- ${s.name ? `**${s.name}**: ` : ''}${s.value ?? ''}`))
      }
      if (Array.isArray((data as any).badges)) {
        mdParts.push('', '**Badges**')
        mdParts.push(...((data as any).badges as any[]).map((b: any) => `- ${b.name}${b.criteria ? ` — ${b.criteria}` : ''}`))
      }
      if (Array.isArray((data as any).steps)) {
        mdParts.push('', '**Steps**')
        mdParts.push(...((data as any).steps as any[]).map((s: any, i: number) => `${i + 1}. ${String(s)}`))
      }
      if (Array.isArray((data as any).bullets)) {
        mdParts.push('', ...((data as any).bullets as any[]).map((b: any) => `- ${typeof b === 'string' ? b : (b?.text ?? '')}`))
      }
      if (Array.isArray((data as any).items)) {
        mdParts.push('', ...((data as any).items as any[]).map((it: any) => `- ${typeof it === 'string' ? it : (it?.text ?? it?.label ?? '')}`))
      }
      if (Array.isArray((data as any).links)) {
        mdParts.push('', '**Links**')
        mdParts.push(...((data as any).links as any[]).map((l: any) => `- ${l.source ?? ''} → ${l.target ?? ''} (${l.value ?? ''})`))
      }
      const markdown = mdParts.filter(Boolean).join('\n')
      return markdown ? { ...data, markdown } : data
    }
    default:
      return data
  }
}

function normalizeVisualReport(parsed: any): any {
  try {
    const reportContent = parsed?.views?.report?.content
    const sourceContent = parsed?.views?.source?.content

    // If content already looks like a VisualSchema, lightly coerce keys if needed
    const sections: any[] = Array.isArray(reportContent?.sections)
      ? reportContent.sections
      : Array.isArray(reportContent)
        ? reportContent
        : Array.isArray(parsed?.sections)
          ? parsed.sections
          : []

    const normalizedSections = sections.map((section: any, sIdx: number) => {
      const title = section?.title || section?.name || `Section ${sIdx + 1}`
      const subtitle = section?.subtitle || section?.summary || undefined
      const rawElements = Array.isArray(section?.elements)
        ? section.elements
        : Array.isArray(section?.visual_elements)
          ? section.visual_elements
          : Array.isArray(section?.items)
            ? section.items
            : []

      const elements = rawElements.map((el: any, eIdx: number) => {
        let type = mapElementType(el?.type)
        if (String(el?.type || '').toLowerCase() === 'chart') {
          const ct = String(el?.data?.chart_type || '').toLowerCase()
          if (ct === 'bar') type = 'bar_chart'
          else if (ct === 'donut' || ct === 'pie') type = 'donut_chart'
          else if (ct === 'sankey') type = 'sankey'
          else if (ct === 'bullet') type = 'table'
        }
        const id = el?.id || slugifyId(`${type}-${eIdx + 1}`, `el-${eIdx + 1}`)
        // Try to preserve data field; if plain text present, map to markdown
        let data: any = adaptElementData(type, el?.data)
        if (type === 'markdown_block') {
          // If markdown not populated, coalesce from multiple possible fields including element-level content
          const existing = typeof (data as any)?.markdown === 'string' ? String((data as any).markdown).trim() : ''
          if (!existing) {
            const candidates: any[] = [
              (data as any)?.content,
              (data as any)?.summary,
              (data as any)?.description,
              (data as any)?.text,
              el?.content,
              el?.text,
              el?.summary,
            ]
            const picked = candidates.find((v) => typeof v === 'string' && String(v).trim())
            if (picked) data = { ...(data || {}), markdown: String(picked).trim() }
          }
          // If bullets array provided but still no markdown, synthesize a list
          if (!(data as any)?.markdown && Array.isArray((data as any)?.bullets)) {
            const lines = ((data as any).bullets as any[]).map((b: any) => `- ${typeof b === 'string' ? b : (b?.text ?? '')}`)
            const md = lines.filter(Boolean).join('\n')
            if (md) data = { ...(data || {}), markdown: md }
          }
        }
        // Basic width span fallback
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

    // If no sections, create a single markdown section from source or fallback note
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

    // Build full VisualSchema object according to spec
    const visualSchema = {
      version: String(parsed?.version || '1.0'),
      meta: {
        report_id: String(parsed?.meta?.report_id || slugifyId('report', 'rpt')),
        generated_at: new Date().toISOString(),
        generated_for_user_id: String(parsed?.meta?.generated_for_user_id || ''),
        title: String(parsed?.meta?.title || 'Learning Implementation Blueprint'),
        subtitle: parsed?.meta?.subtitle ?? null,
        description: parsed?.meta?.description ?? null,
      },
      theme: parsed?.theme ?? {
        brand: { name: 'Smartslate', logo_url: null, favicon_url: null },
        color: {
          primary: '#4F46E5', secondary: '#7C69F5', accent: '#a7dadb',
          neutral: { '900': '#0b1321', '700': '#1f2a3a', '500': '#4b5563', '300': '#9ca3af', '100': '#e5e7eb' },
          semantic: { success: '#10B981', info: '#3B82F6', warning: '#F59E0B', danger: '#EF4444' },
          background: { app: '#020C1B', surface: '#0d1b2a', elevated: '#142433' },
          chart_palettes: { default: ['#4F46E5','#22C55E','#F59E0B','#EF4444','#06B6D4'], color_blind_safe: ['#1170AA','#FC7D0B','#A3ACB9','#57606C','#5FA2CE'] }
        },
        typography: {
          font_family: { display: 'Quicksand, sans-serif', body: 'Lato, sans-serif', mono: 'ui-monospace, monospace' },
          scale: { xs: 12, sm: 14, md: 16, lg: 18, xl: 20, '2xl': 24, '3xl': 30, '4xl': 36, '5xl': 48 },
          line_height: { tight: 1.1, normal: 1.4, relaxed: 1.7 },
          weight: { regular: 400, medium: 500, semibold: 600, bold: 700 },
        },
        spacing: { xxs: 4, xs: 8, sm: 12, md: 16, lg: 24, xl: 32, '2xl': 48 },
        radius: { sm: 6, md: 10, lg: 14, pill: 9999 },
        shadow: { sm: '0 1px 2px rgba(0,0,0,0.1)', md: '0 8px 24px rgba(0,0,0,0.2)', lg: '0 20px 40px rgba(0,0,0,0.25)' },
        motion: { duration: { fast: 120, base: 220, slow: 400, hero: 700 }, easing: { enter: 'cubic-bezier(0.2, 0, 0, 1)', exit: 'cubic-bezier(0.4, 0, 1, 1)', emphasized: 'cubic-bezier(0.2, 0, 0, 1)' }, stagger_ms: 40, reduce_motion_respect: true },
      },
      accessibility: parsed?.accessibility ?? {
        min_contrast_ratio: 4.5,
        color_blind_mode_available: true,
        high_contrast_theme_available: false,
        aria_landmarks: ['banner','navigation','main','contentinfo'],
        keyboard_focus_ring: true,
        skip_to_content_enabled: true,
      },
      layout: parsed?.layout ?? {
        grid: { columns: { sm: 4, md: 8, lg: 12 }, gap: { sm: 8, md: 12, lg: 16 } },
        breakpoints: { sm: 640, md: 768, lg: 1024 },
      },
      sections: ensuredSections,
    }

    const normalized = {
      ...parsed,
      views: {
        ...parsed?.views,
        source: parsed?.views?.source || { format: 'markdown', content: typeof sourceContent === 'string' ? sourceContent : '' },
        report: {
          format: 'visualized',
          content: visualSchema,
        },
      },
    }
    return normalized
  } catch {
    // On any failure, return original
    return parsed
  }
}

export default async function handler(request: Request): Promise<Response> {
  try {
    if (request.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Method Not Allowed' }), { status: 405, headers: { 'Content-Type': 'application/json' } })
    }

    const { id }: RequestBody = await request.json()
    if (!id) {
      return new Response(JSON.stringify({ error: 'Missing required field: id' }), { status: 400, headers: { 'Content-Type': 'application/json' } })
    }

    const SUPABASE_URL = ensureEnv('SUPABASE_URL', (process.env as any).VITE_SUPABASE_URL)
    const SUPABASE_SERVICE_ROLE_KEY = ensureEnv('SUPABASE_SERVICE_ROLE_KEY')
    const OPENAI_API_KEY = ensureEnv('OPENAI_API_KEY', (process.env as any).VITE_OPENAI_API_KEY)
    const OPENAI_BASE_URL = (process.env as any).OPENAI_BASE_URL || 'https://api.openai.com'
    const OPENAI_MODEL = (process.env as any).OPENAI_MODEL || 'gpt-4o-mini'
    // Use model default temperature (provider requires default)

    const { createClient } = await import('@supabase/supabase-js')
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false }, global: { fetch } })

    // Fetch latest context
    const { data: row, error: fetchErr } = await supabase
      .from('master_discovery')
      .select('*')
      .eq('id', id)
      .single()

    if (fetchErr || !row) {
      return new Response(JSON.stringify({ error: 'Record not found', details: fetchErr?.message }), { status: 404, headers: { 'Content-Type': 'application/json' } })
    }

    // Do not update status here to avoid violating DB check constraints
    try {
      /* no-op */
    } catch {}

    const systemPrompt = buildSystemPrompt()
    const userPrompt = buildUserPrompt(row)

    // Call OpenAI with JSON-only response
    const openaiResp = await fetch(`${OPENAI_BASE_URL}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: OPENAI_MODEL,
        // omit temperature to use model default
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ]
      })
    })

    if (!openaiResp.ok) {
      const errText = await openaiResp.text()
      return new Response(JSON.stringify({ error: 'OpenAI request failed', details: errText }), { status: 502, headers: { 'Content-Type': 'application/json' } })
    }

    const completion = await openaiResp.json()
    const content = completion?.choices?.[0]?.message?.content
    if (!content || typeof content !== 'string') {
      return new Response(JSON.stringify({ error: 'Invalid OpenAI response format' }), { status: 502, headers: { 'Content-Type': 'application/json' } })
    }

    let parsed: any
    try {
      parsed = JSON.parse(content)
    } catch (e) {
      const match = content.match(/\{[\s\S]*\}/)
      if (match) {
        parsed = JSON.parse(match[0])
      } else {
        return new Response(JSON.stringify({ error: 'Response was not valid JSON' }), { status: 502, headers: { 'Content-Type': 'application/json' } })
      }
    }

    // Normalize report shape for the VisualRenderer expectations
    const normalized = normalizeVisualReport(parsed)

    // Save to DB (avoid changing status to satisfy DB check constraints)
    const { error: updateErr } = await supabase
      .from('master_discovery')
      .update({ final_report: normalized })
      .eq('id', id)

    if (updateErr) {
      return new Response(JSON.stringify({ error: 'Failed to save final report', details: updateErr.message }), { status: 500, headers: { 'Content-Type': 'application/json' } })
    }

    return new Response(JSON.stringify({ ok: true, final_report: normalized }), { status: 200, headers: { 'Content-Type': 'application/json' } })
  } catch (err: any) {
    return new Response(JSON.stringify({ error: 'Unhandled error', details: err?.message || String(err) }), { status: 500, headers: { 'Content-Type': 'application/json' } })
  }
}


