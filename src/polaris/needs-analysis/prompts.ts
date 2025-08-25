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
- CRITICAL: Consider technology capabilities (available_technologies, tech_expertise_level, tech_limitations) and talent resources (talent_availability, talent_gaps, talent_constraints) from static answers.
- ESSENTIAL: Account for learner characteristics (learner_age_range, learner_tech_savviness, learning_preferences, learner_motivation_level, accessibility_needs, learner_time_availability, learner_device_access) when crafting questions.
- IMPORTANT: Consider content creation tools, vendors, and platforms if provided (content_delivery_types, authoring_tools, video_audio_tools, visual_design_tools, interactive_tools, ai_content_tools, translation_tools, content_libraries, lms_lxp_platforms, assessment_survey_tools, knowledge_doc_tools, other_content_tools, integration_constraints_content_tools) to align with delivery feasibility.
- For Stage ${stageNumber === 2 ? '2: Probe deeper into how learner profiles and tech/talent gaps might impact the solution design' : stageNumber === 3 ? '3: Clarify learner engagement strategies and tech/talent requirements' : stageNumber === 4 ? '4: Finalize learner support needs and implementation approaches' : '5: Consolidate talent, tools, vendors, and resource plans for scalable delivery and integration'}.
- If learners have low tech savviness or limited device access, ask about simplified delivery methods, support systems, or alternative formats.
- If learner motivation is low, explore engagement strategies, incentives, or mandatory vs. optional approaches.
- Consider accessibility needs and language diversity when asking about content delivery and support mechanisms.
 - Mandatory coverage for Recommended Solution sub-sections. Until fully specified, include at least one question per area (avoid simple duplication; ask confirmations/clarifiers if already answered):
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
