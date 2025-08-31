import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// Dev-time API middleware to support /api/dynamic-questions locally with Vite
// Mirrors the logic of api/dynamic-questions.ts for a single-command dev flow.
function devDynamicQuestionsPlugin() {
  return {
    name: 'dev-api-dynamic-questions',
    apply: 'serve' as const,
    configureServer(server: any) {
      const env = loadEnv(server.config.mode, process.cwd(), '')
      server.middlewares.use('/api/dynamic-questions', async (req: any, res: any) => {
        if (req.method !== 'POST') {
          res.statusCode = 405
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify({ error: 'Method Not Allowed' }))
          return
        }

        try {
          const chunks: Uint8Array[] = []
          await new Promise<void>((resolve, reject) => {
            req.on('data', (c: Uint8Array) => chunks.push(c))
            req.on('end', () => resolve())
            req.on('error', (e: any) => reject(e))
          })
          const raw = Buffer.concat(chunks).toString('utf-8')
          const body = raw ? JSON.parse(raw) : {}
          const id = body?.id
          if (!id) {
            res.statusCode = 400
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({ error: 'Missing required field: id' }))
            return
          }

          const SUPABASE_URL = env.SUPABASE_URL || env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
          const SUPABASE_SERVICE_ROLE_KEY = env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY
          const OPENAI_API_KEY = env.OPENAI_API_KEY || env.VITE_OPENAI_API_KEY || process.env.OPENAI_API_KEY || process.env.VITE_OPENAI_API_KEY
          const OPENAI_BASE_URL = env.OPENAI_BASE_URL || process.env.OPENAI_BASE_URL || 'https://api.openai.com'
          const OPENAI_MODEL = env.OPENAI_MODEL || process.env.OPENAI_MODEL || 'gpt-4o-mini'
          // Use model default temperature

          if (!SUPABASE_URL) throw new Error('Missing required env: SUPABASE_URL or VITE_SUPABASE_URL')
          if (!SUPABASE_SERVICE_ROLE_KEY) throw new Error('Missing required env: SUPABASE_SERVICE_ROLE_KEY')
          if (!OPENAI_API_KEY) throw new Error('Missing required env: OPENAI_API_KEY or VITE_OPENAI_API_KEY')

          const { createClient } = await import('@supabase/supabase-js')
          const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false }, global: { fetch } })

          const { data: row, error: fetchErr } = await supabase
            .from('master_discovery')
            .select('*')
            .eq('id', id)
            .single()
          if (fetchErr || !row) {
            res.statusCode = 404
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({ error: 'Record not found', details: fetchErr?.message }))
            return
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
          const buildUserPrompt = (r: Record<string, any>): string => {
            const lines: string[] = []
            lines.push('CONTEXT (static data for tailoring; some fields may be null):')
            lines.push('')
            lines.push(`user_id: ${r.user_id ?? 'null'}`)
            lines.push(`status: ${r.status ?? 'null'}`)
            lines.push(`created_at: ${r.created_at ?? 'null'}`)
            lines.push(`updated_at: ${r.updated_at ?? 'null'}`)
            const sa = (r.static_answers || {}) as any
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

          const userPrompt = buildUserPrompt(row)

          const aiResp = await fetch(`${OPENAI_BASE_URL}/v1/chat/completions`, {
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

          if (!aiResp.ok) {
            const errText = await aiResp.text()
            res.statusCode = 502
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({ error: 'OpenAI request failed', details: errText }))
            return
          }

          const completion: any = await aiResp.json()
          const content = completion?.choices?.[0]?.message?.content
          if (!content || typeof content !== 'string') {
            res.statusCode = 502
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({ error: 'Invalid OpenAI response format' }))
            return
          }

          let parsed: any
          try {
            parsed = JSON.parse(content)
          } catch (e) {
            const match = content.match(/\{[\s\S]*\}/)
            if (match) parsed = JSON.parse(match[0])
            else {
              res.statusCode = 502
              res.setHeader('Content-Type', 'application/json')
              res.end(JSON.stringify({ error: 'Response was not valid JSON' }))
              return
            }
          }

          const { error: updateErr } = await supabase
            .from('master_discovery')
            .update({ dynamic_questions: parsed })
            .eq('id', id)
          if (updateErr) {
            res.statusCode = 500
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({ error: 'Failed to save dynamic questions', details: updateErr.message }))
            return
          }

          res.statusCode = 200
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify({ ok: true, dynamic_questions: parsed }))
        } catch (err: any) {
          res.statusCode = 500
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify({ error: 'Unhandled error', details: err?.message || String(err) }))
        }
      })

      // Removed dev-time handler for /api/final-report
    }
  }
}

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), devDynamicQuestionsPlugin()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    target: 'esnext',
    minify: 'esbuild',
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks: {
          // Core React libraries
          'react-vendor': ['react', 'react-dom'],
          
          // Router and navigation
          'router': ['react-router-dom'],
          
          // AI module removed
          
          // UI components
          'components': [
            './src/components/index.ts',
            './src/components/ui/IconButton.tsx'
          ],
          
          // Polaris features removed
          
          // Services and utilities (trimmed)
          'services': [
            './src/services/clientUserService.ts'
          ],
          
          // Storage and offline
          'storage': [
            './src/lib/clientStorage.ts',
            './src/lib/offlineSync.ts'
          ]
        }
      }
    },
    chunkSizeWarningLimit: 1000
  },
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react-router-dom'
    ]
  },
  server: {
    port: 5174,
    host: true,
    open: true
  },
  preview: {
    port: 5174,
    host: true
  },
  define: {
    // Enable client-only mode by default in production
    'process.env.CLIENT_ONLY': JSON.stringify(true),
    'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'production')
  },
  // Note: PWA config moved out to dedicated plugin in this project. Remove invalid manifest block from vite config.
})