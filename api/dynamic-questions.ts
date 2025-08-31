export const config = { runtime: 'nodejs', maxDuration: 60 }

type RequestBody = {
  id?: string
}

function ensureEnv(name: string): string {
  const value = (process.env as Record<string, string | undefined>)[name]
  if (!value) throw new Error(`Missing required env: ${name}`)
  return value
}

function buildUserPrompt(row: Record<string, any>): string {
  const lines: string[] = []
  lines.push('CONTEXT (static data for tailoring; some fields may be null):')
  lines.push('')
  lines.push(`user_id: ${row.user_id ?? 'null'}`)
  lines.push(`status: ${row.status ?? 'null'}`)
  lines.push(`created_at: ${row.created_at ?? 'null'}`)
  lines.push(`updated_at: ${row.updated_at ?? 'null'}`)
  // Prefer structured static_answers to build context
  const sa = (row.static_answers || {}) as any
  const req = sa.requestor || {}
  const grp = sa.group || {}
  const get = (block: any, key: string) => block?.[key]?.user_answer
  lines.push(`full_name: ${get(req, 'full_name') ?? 'null'}`)
  lines.push(`work_email: ${get(req, 'work_email') ?? 'null'}`)
  lines.push(`role_title: ${get(req, 'role_title') ?? 'null'}`)
  lines.push(`phone_number: ${get(req, 'phone_number') ?? 'null'}`)
  lines.push(`preferred_contact_method: ${get(req, 'preferred_contact_method') ?? 'null'}`)
  lines.push(`context_goals: ${get(req, 'context_goals') ?? 'null'}`)
  lines.push(`group_name: ${get(grp, 'group_name') ?? 'null'}`)
  lines.push(`group_type: ${get(grp, 'group_type') ?? 'null'}`)
  lines.push(`industry: ${get(grp, 'industry') ?? 'null'}`)
  lines.push(`group_size: ${get(grp, 'size') ?? 'null'}`)
  {
    const ps = get(grp, 'primary_stakeholders')
    const psText = Array.isArray(ps) ? ps.join(', ') : (ps ?? 'null')
    lines.push(`primary_stakeholders: ${psText}`)
  }
  lines.push(`desired_outcomes: ${get(grp, 'desired_outcomes') ?? 'null'}`)
  lines.push(`timeline_target: ${get(grp, 'timeline_target') ?? 'null'}`)
  lines.push(`constraints_notes: ${get(grp, 'constraints_notes') ?? 'null'}`)
  lines.push('')
  lines.push('TASK:')
  lines.push('Based on the above, generate exactly 7 stages with 5 questions each.')
  lines.push('Questions must be maximally contextual for this user’s role, company, and goals.')
  lines.push('Research the user’s role and organization from work_email domain or org name if possible; otherwise, generalize based on role_title and industry.')
  lines.push('If information is missing, include clarifying questions early.')
  lines.push('')
  lines.push('Each stage should gather insights necessary for producing a complete Learning Design Blueprint, including:')
  lines.push('- Clear objectives and scope')
  lines.push('- Audience profiling and environment analysis')
  lines.push('- Constraints, risks, and mitigation strategies')
  lines.push('- Learning modalities and frameworks best suited to goals')
  lines.push('- Delivery logistics and timelines')
  lines.push('- Measurement strategy (assessment, tracking, transfer, performance support)')
  lines.push('- Success criteria, milestones, and next steps')
  lines.push('')
  lines.push('OUTPUT REQUIREMENTS:')
  lines.push('- Respond with JSON ONLY that conforms to the schema below.')
  lines.push('- Do not echo the schema text back.')
  lines.push('- Include realistic defaults, contextual options, and conditional logic when useful.')
  lines.push('- Ensure each stage feels progressively closer to a final blueprint.')
  return lines.join('\n')
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

    const SUPABASE_URL = ensureEnv('SUPABASE_URL')
    const SUPABASE_SERVICE_ROLE_KEY = ensureEnv('SUPABASE_SERVICE_ROLE_KEY')
    const OPENAI_API_KEY = ensureEnv('OPENAI_API_KEY')
    const OPENAI_BASE_URL = (process.env as any).OPENAI_BASE_URL || 'https://api.openai.com'
    const OPENAI_MODEL = (process.env as any).OPENAI_MODEL || 'gpt-4o-mini'
    // Use model default temperature

    // Import dynamically to avoid edge bundling issues
    const { createClient } = await import('@supabase/supabase-js')
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false }, global: { fetch } })

    // Fetch the latest row to build context
    const { data: row, error: fetchErr } = await supabase
      .from('master_discovery')
      .select('*')
      .eq('id', id)
      .single()

    if (fetchErr || !row) {
      return new Response(JSON.stringify({ error: 'Record not found', details: fetchErr?.message }), { status: 404, headers: { 'Content-Type': 'application/json' } })
    }

    const systemPrompt = `You are an expert Learning Experience Architect and Prompt Engineer.
Your goal is to generate a structured, stage-based questionnaire that collects all critical inputs needed to produce a complete Learning Design Blueprint document.

You must research and contextualize the user’s role and organization (from their work email domain or provided org name).
Leverage static data (role, goals, stakeholders, industry, group size, constraints, desired outcomes, timeline) to design highly contextual questions.
Ensure the questionnaire directly supports discovery for instructional design, learning strategy, development, delivery planning, and evaluation.

Output must be valid JSON only, matching the schema described in the task.

### Principles
- Ask only the most relevant 5 questions per stage (7 stages total).
- Each stage progressively builds toward a blueprint covering: discovery, scope, risks, modalities, logistics, assessment, success criteria.
- Avoid generic wording; adapt to user’s role, industry, org type, group size, urgency, and constraints.
- Incorporate frameworks when appropriate (ADDIE, Bloom’s Taxonomy, Kirkpatrick, 70-20-10, Gagné’s Nine Events, etc.).
- If company domain or role is recognized, tailor questions to best practices in that sector/role.
- If a key field is missing, ask for it early in the flow.

### JSON Rules
- 7 stages, each with exactly 5 questions.
- Stage titles MUST remain unchanged:
  1) Discovery & Goals
  2) Audience & Environment
  3) Constraints & Risks
  4) Content & Modality Preferences
  5) Delivery Plan & Logistics
  6) Assessment & Data
  7) Success Criteria & Next Steps
- Question types: text, number, slider, single_select, multi_select, boolean, date, email, url.
- Use conditional visibility where useful.
- Provide helpful labels, defaults, and options tailored to context.`
    const userPrompt = buildUserPrompt(row)

    // Call OpenAI Chat Completions with JSON-only response (short timeout)
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 20000)
    const openaiReq = fetch(`${OPENAI_BASE_URL}/v1/chat/completions`, {
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
      }),
      signal: controller.signal
    })
    const openaiResp = await openaiReq
    clearTimeout(timeoutId)

    if (!openaiResp.ok) {
      const errText = await openaiResp.text()
      return new Response(JSON.stringify({ error: 'OpenAI request failed', details: errText }), { status: 502, headers: { 'Content-Type': 'application/json' } })
    }

    const completion = await openaiResp.json().catch(() => ({}))
    const content = completion?.choices?.[0]?.message?.content
    if (!content || typeof content !== 'string') {
      return new Response(JSON.stringify({ error: 'Invalid OpenAI response format' }), { status: 502, headers: { 'Content-Type': 'application/json' } })
    }

    let parsed: any
    try {
      parsed = JSON.parse(content)
    } catch (e) {
      // If model returned fenced JSON, attempt to extract
      const match = content.match(/\{[\s\S]*\}/)
      if (match) {
        parsed = JSON.parse(match[0])
      } else {
        return new Response(JSON.stringify({ error: 'Response was not valid JSON' }), { status: 502, headers: { 'Content-Type': 'application/json' } })
      }
    }

    // Save to DB
    const { error: updateErr } = await supabase
      .from('master_discovery')
      .update({ dynamic_questions: parsed })
      .eq('id', id)

    if (updateErr) {
      return new Response(JSON.stringify({ error: 'Failed to save dynamic questions', details: updateErr.message }), { status: 500, headers: { 'Content-Type': 'application/json' } })
    }

    return new Response(JSON.stringify({ ok: true, dynamic_questions: parsed }), { status: 200, headers: { 'Content-Type': 'application/json' } })
  } catch (err: any) {
    const isAbort = (err?.name === 'AbortError') || /aborted|timeout/i.test(String(err?.message || err))
    if (isAbort) {
      return new Response(JSON.stringify({ error: 'Upstream timeout', details: 'OpenAI request exceeded 20s' }), { status: 504, headers: { 'Content-Type': 'application/json' } })
    }
    return new Response(JSON.stringify({ error: 'Unhandled error', details: err?.message || String(err) }), { status: 500, headers: { 'Content-Type': 'application/json' } })
  }
}


