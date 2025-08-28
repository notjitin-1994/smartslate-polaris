// src/polaris/needs-analysis/prompts.ts
export const NA_STAGE_TITLE_PROMPT = (
  experienceLevel: string,
  stageNumber: 2 | 3 | 4 | 5,
  _prior: Record<string, unknown>
) => `You are a senior L&D consultant. Generate a short, human title (max 6 words) for Dynamic Stage ${stageNumber} of a needs analysis.
Tone should match the user's experience level: "${experienceLevel}".
The title must avoid jargon and reflect the most salient unresolved areas based on prior answers.
Return ONLY the title as plain text.`;

export const NA_QUESTIONNAIRE_PROMPT = (
  experienceLevel: string,
  stageNumber: 2 | 3 | 4 | 5,
  staticAnswers: Record<string, unknown>,
  dynamicAnswersSoFar: Record<string, unknown>
) => `ROLE: You are a world-class L&D diagnostician crafting Stage ${stageNumber} questions for a needs analysis.
USER EXPERIENCE: ${experienceLevel}
CONTEXT:
- STATIC ANSWERS: ${JSON.stringify(staticAnswers)}
- DYNAMIC ANSWERS SO FAR: ${JSON.stringify(dynamicAnswersSoFar)}

INSTRUCTIONS:
- Create 6–9 questions. Mix types from: text, textarea, single_select, multi_select, calendar_date, calendar_range, slider, number.
- Keep labels simple and specific. Use options where it reduces typing.
- Prefer sliders for ranges (team size, % coverage, budget %) and calendars for dates.
- Ask only what is needed to produce a professional, decision-ready report. No PII.
- Calibrate depth to the experience level: novices get definitions and narrower choices; experts get tighter, assumption-checking prompts.
- CRITICAL: Use the provided static answers across these sections: Organization & Audience; Business Context & Strategic Alignment; Project Requirements; Resources & Constraints; Systems & Data; Timeline & Scheduling; Risk & Change Readiness; Learning Transfer; Performance Support; Documentation.
- ESSENTIAL: Account for audience characteristics (segments, seniority, language, accessibility, device/bandwidth) and any delivery constraints, budget ceilings, integration readiness, and timeline windows when crafting questions.
- IMPORTANT: If baselines/targets are present, ask clarifiers that pin down definitions, sources, and measurement cadence. Where gaps exist, elicit concise, decision-ready inputs.
- For Stage ${stageNumber === 2 ? '2: Probe deeper into delivery choices, audience coverage, and feasibility given constraints' : stageNumber === 3 ? '3: Clarify competencies, assessment expectations, and rollout sequencing' : stageNumber === 4 ? '4: Finalize performance support, transfer plan, and measurement' : '5: Consolidate risks, dependencies, and implementation details for sign-off'}.
- If learners have low tech savviness or limited device access, ask about simplified delivery methods, support systems, or alternative formats.
- If learner motivation is low, explore engagement strategies, incentives, or mandatory vs. optional approaches.
- Consider accessibility needs and language diversity when asking about content delivery and support mechanisms.
 - Mandatory coverage for Business Objectives & Requirements sub-sections. Until fully specified, include at least one question per area (avoid simple duplication; ask confirmations/clarifiers if already answered):
   - Delivery Modalities: preferences and constraints (synchronous vs async; cohort vs self-paced; blended ratio; session length/cadence; mobile/offline; bandwidth/device limits; classroom/on-the-job components); rationale and trade-offs.
   - Target Audiences: segments/roles; approximate headcount/coverage %; locations/time zones; languages; accessibility needs; device/work context; time availability; mandatory vs optional learners; risks to reach/coverage.
   - Key Competencies: competency names/frameworks; target proficiency levels; critical vs optional; prerequisite skills; assessment expectations; recertification cycles; evidence requirements (e.g., audit, manager sign-off).
   - Content Outline: modules/topics; depth/level; prerequisites/dependencies; estimated time per module; gated vs open; optional/specialization tracks; examples/case sources; content reusability constraints; must-include/must-exclude.
 - Choose fitting question types: multi_select/single_select for options; slider/number for coverage %, durations, ratios; calendar_date/calendar_range for key dates; textarea for rationale/constraints.
 - Ask only for gaps; if prior answers exist, ask clarifiers or confirmations rather than repeating.
- IMPORTANT: Output **pure JSON** matching this schema:
{
  "title": "<short stage title>",
  "questions": [
    { "id": "...", "type": "text|...", "label": "...", "help": "...", "required": true|false, "options": ["..."], "min": 0, "max": 10, "step": 1, "unit": "%|hrs|₹", "placeholder": "...", "default": <value> }
  ]
}
NO prose. NO markdown fences. JSON only.`;

// New multi-stage dynamic questionnaire prompt (SYSTEM + USER messages)
export function NA_DYNAMIC_STAGES_PROMPT(input: {
  companyName?: string
  experienceLevel: string
  // legacy static
  stage1Answers?: Record<string, unknown>
  stage2Answers?: Record<string, unknown>
  stage3Answers?: Record<string, unknown>
  // new static sections
  requirementsStatic?: Record<string, unknown>
  learningTransferStatic?: Record<string, unknown>
  performanceSupportStatic?: Record<string, unknown>
  documentationStatic?: Record<string, unknown>
  // research
  preliminaryReport?: string
  greetingReport?: string
  orgReport?: string
  requirementsReport?: string
  // prior dynamic
  previousDynamic?: Record<string, unknown>
}) {
  const safe = (v: unknown) => {
    try { return JSON.stringify(v ?? {}, null, 2) } catch { return '{}' }
  }
  const safeText = (v?: string) => (v || '').toString()
  const system = [
    'You are an expert Learning & Development (L&D) diagnostician working inside the Polaris platform.',
    'Your ONLY job is to generate dynamic questionnaire stages for a Learning Needs Analysis.',
    'You must return ONLY valid JSON that matches the schema. Do not include explanations, commentary, or markdown fences.'
  ].join('\n')

  const user = `
# ROLE
Act as a senior instructional designer, content developer, and stakeholder advisor. 
You design **validated, JSON-only questionnaires** that close the most important information gaps left after static intake and research. 
Your output should be concise, decision-ready, and professional.

# GOAL
Produce **2–4 questionnaire stages**, each with **6–9 high-value questions**, that:
- Minimize duplication (confirm instead of re-asking),
- Resolve ambiguities in requirements, risks, transfer, or sustainment,
- Provide actionable data for a **decision-ready report** and implementation plan.

# INPUTS
- Company: ${input.companyName || ''}
- Experience Level: ${input.experienceLevel}

## STATIC ANSWERS
- Stage 1 (Requester & Context): ${safe(input.stage1Answers)}
- Stage 2 (Organization): ${safe(input.stage2Answers)}
- Stage 3 (Project): ${safe(input.stage3Answers)}

## NEW STATIC SECTIONS
- Requirements: ${safe(input.requirementsStatic)}
- Learning Transfer: ${safe(input.learningTransferStatic)}
- Performance Support: ${safe(input.performanceSupportStatic)}
- Documentation: ${safe(input.documentationStatic)}

## RESEARCH REPORTS
- Preliminary: ${safeText(input.preliminaryReport)}
- Greeting/Context: ${safeText(input.greetingReport)}
- Organization: ${safeText(input.orgReport)}
- Requirements: ${safeText(input.requirementsReport)}

## PRIOR DYNAMIC Q&A
- Previous Dynamic Answers: ${safe(input.previousDynamic)}

# PROCESS
When generating questions:
1. **Grounding:** Use all static answers, new sections, and research reports to guide questions. 
   - If an area is complete, create confirmation/refinement questions. 
   - If ambiguous, probe with select/slider/boolean questions. 
   - If critical but missing, introduce concise clarifiers.
2. **Calibration:** Adapt depth to ${input.experienceLevel}.  
   - Novices → definitions, guided options.  
   - Experts → assumption checks, trade-offs.  
3. **Coverage:** Across stages, ensure questions address:
   - Delivery & scaling decisions,
   - Target audiences & coverage,
   - Requirements & outcomes (competencies, assessment, compliance, success criteria),
   - Sustainment (learning transfer, performance support, documentation),
   - Systems, data, resourcing, budget, and milestones.
4. **Design:** 
   - Use \`single_select\`/\`multi_select\` for categories, \`slider\` for % or ranges, \`calendar\` for dates, \`boolean\` for confirmations.  
   - Reserve \`textarea\` for rationale or evidence.  
   - Labels ≤14 words, help ≤20 words.  
   - IDs must be kebab-case unique.  
5. **Exclusions:**  
   - Never ask for PII (emails, names, IDs).  
   - Do not re-collect fully known information.  

# OUTPUT SCHEMA
{
  "stages": [
    {
      "id": "stage_1",
      "title": "string (≤6 words, plain, no jargon)",
      "description": "string (optional, ≤25 words)",
      "questions": [
        {
          "id": "kebab-case-unique-id",
          "type": "text|textarea|single_select|multi_select|slider|number|calendar_date|calendar_range|boolean",
          "label": "concise, plain-language question",
          "help": "short hint (optional)",
          "required": true,
          "options": [ { "value": "string", "label": "string" } ]
        }
      ]
    }
  ]
}

# VALIDATION RULES
- 2–4 stages. 6–9 questions per stage.
- Each stage must cover at least one of: 
  (1) delivery/scaling, (2) audiences/coverage, (3) requirements/transfer/support/compliance.
- No nulls, empty arrays, or placeholder text.
- Return ONLY the JSON object.

# RETURN
Return the JSON object only, following the schema exactly.`

  return { system, user }
}
