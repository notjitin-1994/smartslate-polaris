// src/polaris/needs-analysis/customDynamicPrompts.ts
// Paste your custom dynamic-question prompts here, in order.
// Each entry should be a complete instruction block that will be appended to the
// standard questionnaire generator. It will receive:
// - Prior stage answers (stage 1–3) and any dynamic answers so far
// - Research context (greeting/org/requirements and, if available, prelim)
// - A gathered list of prior questions and their current answers
// The output must still be pure JSON (title + questions) as enforced by the base prompt.

export const CUSTOM_DYNAMIC_PROMPTS: string[] = [
  `FOCUS THIS STAGE ON DELIVERY MODALITIES.
Ask 6–8 targeted questions to lock down delivery choices and constraints.
Cover: synchronous vs async; cohort vs self-paced; blended ratio target; session length/cadence; classroom/on-the-job components; mobile/offline; bandwidth/device constraints; accessibility accommodations; must-avoid formats; rationale; rollout sequencing (pilot vs full launch).
Prefer: multi_select/single_select for formats; slider/number for ratios, session length, cadence; textarea for rationale; calendar_range for pilot windows.`,
  `FOCUS THIS STAGE ON TARGET AUDIENCES.
Ask 6–8 questions to define segments and implications for design.
Cover: primary/secondary segments; roles/seniority; approximate headcount/coverage %; locations/time zones; languages; accessibility needs; device/work context; time availability; mandatory vs optional status; risks to reach/coverage.
Prefer: multi_select for segments/roles/languages; slider/number for coverage %, time/week; single_select for device context; textarea for special considerations.`,
  `FOCUS THIS STAGE ON KEY COMPETENCIES.
Ask 6–8 questions to identify competencies and how they’ll be evidenced.
Cover: top competencies (names/frameworks); target proficiency levels; critical vs nice-to-have; prerequisite skills; assessment expectations (performance demo, knowledge checks, practicals); recertification/refresh cycles; evidence requirements (audit, manager sign-off).
Prefer: multi_select for competencies; single_select for frameworks/scales; slider for target levels/priority; textarea for assessment/evidence details.`,
  `FOCUS THIS STAGE ON CONTENT OUTLINE.
Ask 6–8 questions to shape a high-level outline with scope and sequencing.
Cover: proposed modules/topics; depth/level per module; estimated time per module; prerequisites/dependencies; gated vs open navigation; optional/specialization tracks; example/case sources; content reusability constraints; must-include/must-exclude topics.
Prefer: text for module names; number/slider for time estimates; single_select for gated/open; multi_select for tracks; textarea for constraints/rationale.`,
];


