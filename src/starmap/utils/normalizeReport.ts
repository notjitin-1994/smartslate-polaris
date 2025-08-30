export function normalizeReport(input: any): any {
  if (!input) return null
  const schema = { ...input }

  // Minimal wrappers if missing
  schema.version ??= '1.0.0'
  schema.meta ??= {
    report_id: 'auto',
    generated_at: new Date().toISOString(),
    generated_for_user_id: input?.meta?.generated_for_user_id ?? 'unknown',
    title: input?.meta?.title ?? 'Learning Implementation Blueprint',
    description: input?.meta?.description ?? ''
  }
  schema.theme ??= { color: { background: { app: '#0B0F1A', surface: '#11162A', elevated: '#151B31' }, primary: '#0E7CFF', secondary: '#7839EE', accent: '#22C55E', neutral: { '900':'#0B1020','700':'#2A3245','500':'#6B7280','300':'#CBD5E1','100':'#F1F5F9' }, semantic: { success:'#16A34A', info:'#0284C7', warning:'#D97706', danger:'#DC2626' }, chart_palettes: { default: ['#0E7CFF','#7839EE','#22C55E','#F59E0B','#EC4899','#10B981','#8B5CF6','#06B6D4'], color_blind_safe: ['#0072B2','#E69F00','#009E73','#CC79A7','#D55E00','#56B4E9','#F0E442','#000000'] } }, typography: { font_family: { display: 'Inter', body: 'Inter', mono: 'JetBrains Mono' }, scale: { xs:12, sm:14, md:16, lg:18, xl:20, '2xl':24, '3xl':30, '4xl':36, '5xl':48 }, line_height: { tight:1.2, normal:1.5, relaxed:1.7 }, weight: { regular:400, medium:500, semibold:600, bold:700 } }, spacing: { xxs:4, xs:8, sm:12, md:16, lg:24, xl:32, '2xl':48 }, radius: { sm:8, md:14, lg:20, pill:999 }, shadow: { sm:'0 4px 14px rgba(0,0,0,.18)', md:'0 10px 30px rgba(0,0,0,.22)', lg:'0 24px 60px rgba(0,0,0,.28)' }, motion: { duration: { fast:180, base:280, slow:420, hero:700 }, easing: { enter:'cubic-bezier(0.22,1,0.36,1)', exit:'cubic-bezier(0.4,0,1,1)', emphasized:'cubic-bezier(0.2,0,0,1)' }, stagger_ms: 60, reduce_motion_respect: true } }
  schema.accessibility ??= { min_contrast_ratio: 4.5, color_blind_mode_available: true, high_contrast_theme_available: true, aria_landmarks: ['main'], keyboard_focus_ring: true, skip_to_content_enabled: true }
  schema.layout ??= { grid: { columns: { sm: 4, md: 8, lg: 12 }, gap: { sm: 8, md: 12, lg: 16 } }, breakpoints: { sm: 640, md: 960, lg: 1280 } }

  const toMarkdown = (d: any) => {
    if (typeof d?.markdown === 'string') return d.markdown
    const parts: string[] = []
    if (d.title) parts.push(`### ${d.title}`)
    if (d.audience) parts.push(`**Audience:** ${d.audience}`)
    if (d.format) parts.push(`**Format:** ${d.format}`)
    if (d.timeline) parts.push(`**Timeline:** ${d.timeline}`)
    if (d.credential) parts.push(`**Credential:** ${d.credential}`)
    if (Array.isArray(d.problems)) parts.push(`**Problems:**\n${d.problems.map((x:string)=>`- ${x}`).join('\n')}`)
    if (Array.isArray(d.constraints)) parts.push(`**Constraints:**\n${d.constraints.map((x:string)=>`- ${x}`).join('\n')}`)
    return parts.join('\n\n') || '_No details provided._'
  }

  const fixEl = (el: any) => {
    if (!el?.type) return el
    const d = el.data ?? {}

    if (el.type === 'markdown_block') {
      return { ...el, data: { markdown: toMarkdown(d) } }
    }

    if (el.type === 'bar_chart' && d.labels && d.values) {
      return { ...el, data: { title: d.title ?? 'Bar Chart', categories: d.labels, series: [{ name: 'Value', values: d.values }] } }
    }

    if (el.type === 'donut_chart') {
      // If series->points (time series), convert to line_chart
      if (Array.isArray(d.series) && d.series[0]?.points) {
        return {
          ...el,
          type: 'line_chart',
          data: {
            title: d.title ?? 'Trend',
            categories: d.series[0].points.map((p:any)=>p.x),
            series: d.series.map((s:any)=>({ name: s.name, values: s.points.map((p:any)=>p.y) }))
          }
        }
      }
      // If series of name/value, convert to slices
      if (Array.isArray(d.series) && d.series[0]?.value != null && !d.slices) {
        return { ...el, data: { title: d.title, slices: d.series.map((s:any)=>({ label: s.name, value: s.value })) } }
      }
    }

    if (el.type === 'risk_matrix') {
      d.scale ??= { likelihood: ['1','2','3','4','5'], impact: ['1','2','3','4','5'] }
      return { ...el, data: d }
    }

    if (el.type === 'milestone_map' && d.gates && !d.lanes) {
      // Provide graceful fallback
      return { ...el, type: 'grid_of_cards', data: { cards: d.gates.map((g:any)=>({ title: g.name, body: `${g.label} — Owner: ${g.owner}` })) } }
    }

    return el
  }

  if (Array.isArray(schema.sections)) {
    schema.sections = schema.sections.map((sec:any)=>({
      ...sec,
      elements: (sec.elements ?? []).map(fixEl)
    }))
  }

  return schema
}


