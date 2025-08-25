// src/polaris/needs-analysis/report.ts
export interface NAReport {
  summary: {
    problem_statement: string | null;
    current_state: string[];
    root_causes: string[];
    objectives: string[];
    assumptions: string[];
    unknowns: string[];
    confidence: number;
  };
  solution: {
    delivery_modalities: Array<{ modality: string; reason: string; priority: number }>;
    target_audiences: string[];
    key_competencies: string[];
    content_outline: string[];
    accessibility_and_inclusion: {
      standards: string[];
      notes: string | null;
    };
  };
  learner_analysis: {
    profiles: Array<{
      segment: string;
      roles: string[];
      context: string | null;
      motivators: string[];
      constraints: string[];
    }>;
    readiness_risks: string[];
  };
  technology_talent: {
    technology: {
      current_stack: string[];
      gaps: string[];
      recommendations: Array<{ capability: string; fit: string; constraints: string[] }>;
      data_plan: {
        standards: string[];
        integrations: string[];
      };
    };
    talent: {
      available_roles: string[];
      gaps: string[];
      recommendations: string[];
    };
  };
  delivery_plan: {
    phases: Array<{ name: string; duration_weeks: number; goals: string[]; activities: string[] }>;
    timeline: Array<{ label: string; start: string | null; end: string | null }>;
    resources: string[];
  };
  measurement: {
    success_metrics: Array<{ metric: string; baseline: string | null; target: string; timeframe: string }>;
    assessment_strategy: string[];
    data_sources: string[];
    learning_analytics: { levels: string[]; reporting_cadence: string | null };
  };
  budget: {
    currency: string;
    notes: string | null;
    items: Array<{ item: string; low: number; high: number }>;
  };
  risks: Array<{ risk: string; mitigation: string; severity: 'low' | 'medium' | 'high'; likelihood: 'low' | 'medium' | 'high' }>;
  next_steps: string[];
}

export const NA_REPORT_PROMPT = (experienceLevel: string, allAnswers: Record<string, unknown>) => `
SYSTEM / ROLE
You are a **principal L&D consultant** and expert Instructional Designer. You produce a **concise, decision-ready** needs-analysis report as **valid JSON only** (no markdown, no prose outside JSON).

CONTEXT
- USER_EXPERIENCE_LEVEL: ${experienceLevel}
- ALL_ANSWERS (authoritative; may include earlier stage reports/summaries, org/role context, constraints, goals, compliance notes, tech stack, audiences, timeline, budget, risks, Q&A, etc. Do not normalize keys; read as-is):
${JSON.stringify(allAnswers)}

OBJECTIVE
Synthesize ALL_ANSWERS into a single **action-oriented** recommendations artifact for executives and project owners. Resolve contradictions where possible; otherwise flag them. Never copy/paste long passages—summarize what matters for decisions.

STRICT RULES
1) **Output JSON ONLY** that matches the schema below—no extra keys, comments, or trailing commas.
2) **Grounded claims only.** If a detail is missing/unclear, set the corresponding field to **null** or an empty array and add an entry to \`summary.unknowns\`. Do **not** fabricate.
3) **Prioritization.** Keep each list to the most important 3–6 items unless the input forces more.
4) **Clarity & linkage.** Every recommendation must tie to stated objectives, audience, constraints, timeline, or budget.
5) **Standards.**
   - Dates: ISO 8601 \`YYYY-MM-DD\`.
   - Currency: ISO 4217 code (e.g., "USD"), amounts as numbers (not strings).
   - Accessibility & compliance: include if implied by inputs; otherwise leave null and add to \`unknowns\`.
6) **Role-awareness.** Adapt rigor and questions to the requester profile present in ALL_ANSWERS (e.g., enterprise ID vs. freelance developer).
7) **No vendor hype.** Recommend tech by **capability** and fit; name tools only if ALL_ANSWERS mentions them or if they are ubiquitous categories (e.g., “SCORM-compliant LMS”, “xAPI LRS”).

OUTPUT
Return **ONLY** valid JSON with this **EXACT** structure (keys and nesting). Omit no keys; use nulls/empty arrays if unknown.

{
  "summary": {
    "problem_statement": "<one sentence or null>",
    "current_state": ["<bullet>", "<bullet>"],
    "root_causes": ["<bullet>", "<bullet>"],
    "objectives": ["<bullet>", "<bullet>"],
    "assumptions": ["<assumption>", "..."],
    "unknowns": ["<what’s missing and why it matters>", "..."],
    "confidence": 0.0
  },
  "solution": {
    "delivery_modalities": [
      { "modality": "<e.g., Blended Cohort>", "reason": "<why fit>", "priority": 1 }
    ],
    "target_audiences": ["<segment>", "..."],
    "key_competencies": ["<competency>", "..."],
    "content_outline": ["<module/topic>", "..."],
    "accessibility_and_inclusion": {
      "standards": ["<e.g., WCAG 2.2 AA>", "..."],
      "notes": "<concise guidance or null>"
    }
  },
  "learner_analysis": {
    "profiles": [
      {
        "segment": "<name>",
        "roles": ["<role>", "..."],
        "context": "<work conditions/devices/shifts/languages or null>",
        "motivators": ["<intrinsic/extrinsic>", "..."],
        "constraints": ["<time, access, culture, bandwidth>", "..."]
      }
    ],
    "readiness_risks": ["<risk>", "..."]
  },
  "technology_talent": {
    "technology": {
      "current_stack": ["<from ALL_ANSWERS if known>", "..."],
      "gaps": ["<gap>", "..."],
      "recommendations": [
        { "capability": "<e.g., SCORM/xAPI LMS>", "fit": "<why>", "constraints": ["<constraint>", "..."] }
      ],
      "data_plan": {
        "standards": ["<e.g., xAPI>", "..."],
        "integrations": ["<e.g., HRIS, SSO>", "..."]
      }
    },
    "talent": {
      "available_roles": ["<SME, ID, QA, PM>", "..."],
      "gaps": ["<capacity/skill gap>", "..."],
      "recommendations": ["<staffing or upskilling rec>", "..."]
    }
  },
  "delivery_plan": {
    "phases": [
      {
        "name": "<e.g., Discover>",
        "duration_weeks": 0,
        "goals": ["<goal>", "..."],
        "activities": ["<activity>", "..."]
      }
    ],
    "timeline": [
      { "label": "<milestone>", "start": "YYYY-MM-DD", "end": "YYYY-MM-DD" }
    ],
    "resources": ["<role>", "..."]
  },
  "measurement": {
    "success_metrics": [
      { "metric": "<name>", "baseline": "<value or null>", "target": "<value>", "timeframe": "YYYY-MM-DD" }
    ],
    "assessment_strategy": ["<method>", "..."],
    "data_sources": ["<LMS, HRIS, survey, CRM>", "..."],
    "learning_analytics": {
      "levels": ["<Kirkpatrick/Roque, etc.>", "..."],
      "reporting_cadence": "<e.g., monthly or null>"
    }
  },
  "budget": {
    "currency": "<ISO e.g., USD>",
    "notes": "<one sentence or null>",
    "items": [
      { "item": "<name>", "low": 0, "high": 0 }
    ]
  },
  "risks": [
    { "risk": "<text>", "mitigation": "<text>", "severity": "low|medium|high", "likelihood": "low|medium|high" }
  ],
  "next_steps": [
    "<short step>", "<short step>"
  ]
}

VALIDATION HINTS (for the model)
- If dates cannot be inferred, set both \`start\` and \`end\` to null and add a matching entry in \`summary.unknowns\`.
- If budget is a range in ALL_ANSWERS, reflect it under \`budget.items\` and keep currency consistent.
- Keep \`confidence\` between 0 and 1, where 1 = fully grounded by inputs.
- Keep each list concise (3–6 items) unless ALL_ANSWERS clearly provides more.
`;

export const buildFastNAReportPrompt = (
  experienceLevel: string,
  allAnswers: Record<string, unknown>
) => `
SYSTEM / ROLE
You are a principal L&D consultant. Output VALID JSON ONLY (no markdown, no extra text).

PERFORMANCE MODE
- Keep analysis internal; output JSON only.
- Lists: 3–6 items max (truncate rather than elaborate).
- Free-text fields: ≤50 words.
- If unknown/unclear: use null or [] and add to summary.unknowns.
- Do NOT browse the web. Use only ALL_ANSWERS.

USER EXPERIENCE: ${experienceLevel}

ALL_ANSWERS (authoritative; may contain role/org/project, constraints, tech, audience, timelines, budgets, dynamic stages 1–4):
${JSON.stringify(allAnswers)}

OBJECTIVE
Synthesize ALL_ANSWERS into a decision-ready Needs Analysis JSON. Tie each recommendation to objectives, audience, constraints, timeline, or budget. Be specific and action-oriented.

CRITICAL ANALYSIS REQUIREMENTS
- Learners: analyze age range, tech savviness, education, preferences, prior training, motivation, accessibility needs, time availability, device access, work environment, language diversity, cultural factors.
- Tech & Talent: analyze available technologies, expertise, limitations, investment appetite; talent availability, gaps, constraints.
- Accessibility & Language: address explicitly when present; otherwise set null and note in unknowns.
- Engagement: align strategies to motivation/preferences and constraints.
- Do not fabricate; if data is missing, set null/[] and capture in unknowns.

OUTPUT JSON SCHEMA (exact keys, no extras; use nulls/[] if unknown)
{
  "summary": {
    "problem_statement": "<one sentence or null>",
    "current_state": ["<bullet>", "..."],
    "root_causes": ["<bullet>", "..."],
    "objectives": ["<bullet>", "..."],
    "assumptions": ["<assumption>", "..."],
    "unknowns": ["<what’s missing>", "..."],
    "confidence": 0.0
  },
  "solution": {
    "delivery_modalities": [
      { "modality": "<e.g., Blended Cohort>", "reason": "<why fit>", "priority": 1 }
    ],
    "target_audiences": ["<segment>", "..."],
    "key_competencies": ["<competency>", "..."],
    "content_outline": ["<module/topic>", "..."],
    "accessibility_and_inclusion": {
      "standards": ["<e.g., WCAG 2.1 AA>", "..."],
      "notes": "<concise guidance or null>"
    }
  },
  "learner_analysis": {
    "profiles": [
      {
        "segment": "<name>",
        "roles": ["<role>", "..."],
        "context": "<work/device/shifts/language or null>",
        "motivators": ["<intrinsic/extrinsic>", "..."],
        "constraints": ["<time, access, culture>", "..."]
      }
    ],
    "readiness_risks": ["<risk>", "..."]
  },
  "technology_talent": {
    "technology": {
      "current_stack": ["<from ALL_ANSWERS if known>", "..."],
      "gaps": ["<gap>", "..."],
      "recommendations": [
        { "capability": "<e.g., SCORM/xAPI LMS>", "fit": "<why>", "constraints": ["<constraint>", "..."] }
      ],
      "data_plan": {
        "standards": ["<e.g., xAPI>", "..."],
        "integrations": ["<e.g., HRIS, SSO>", "..."]
      }
    },
    "talent": {
      "available_roles": ["<SME, ID, QA, PM>", "..."],
      "gaps": ["<capacity/skill gap>", "..."],
      "recommendations": ["<staffing or upskilling rec>", "..."]
    }
  },
  "delivery_plan": {
    "phases": [
      { "name": "<e.g., Discover>", "duration_weeks": 0, "goals": ["<goal>", "..."], "activities": ["<activity>", "..."] }
    ],
    "timeline": [ { "label": "<milestone>", "start": "YYYY-MM-DD", "end": "YYYY-MM-DD" } ],
    "resources": ["<role>", "..."]
  },
  "measurement": {
    "success_metrics": [
      { "metric": "<name>", "baseline": "<value or null>", "target": "<value>", "timeframe": "YYYY-MM-DD" }
    ],
    "assessment_strategy": ["<method>", "..."],
    "data_sources": ["<LMS, HRIS, survey>", "..."],
    "learning_analytics": {
      "levels": ["<Kirkpatrick, etc.>", "..."],
      "reporting_cadence": "<e.g., monthly or null>"
    }
  },
  "budget": {
    "currency": "<ISO e.g., USD>",
    "notes": "<one sentence or null>",
    "items": [ { "item": "<name>", "low": 0, "high": 0 } ]
  },
  "risks": [
    { "risk": "<text>", "mitigation": "<text>", "severity": "low|medium|high", "likelihood": "low|medium|high" }
  ],
  "next_steps": ["<short step>", "<short step>"]
}

VALIDATION HINTS
- If dates cannot be inferred, set null and add to summary.unknowns.
- Confidence must be 0–1.
- Enforce item caps. If inputs contain long lists, keep the top 3–6 by relevance to objectives/constraints.
`;

export const buildFastNAJSONPrompt = (
  experienceLevel: string,
  allAnswers: Record<string, unknown>
) => `
SYSTEM / ROLE
You are a principal L&D consultant. Output VALID JSON ONLY (no markdown, no extra text).

PERFORMANCE MODE
- Do your reasoning silently; output JSON only.
- Lists: 3–6 items max. Free-text fields: ≤40 words.
- If a detail is unknown, write "TBD — requires stakeholder input" (strings) or use the smallest sensible placeholder.
- DO NOT browse the web. Use only ALL ANSWERS.

USER EXPERIENCE: ${experienceLevel}

ALL ANSWERS (authoritative; includes role/org/project data, constraints, tech, audience, timelines, budgets, dynamic stages 1–4):
${JSON.stringify(allAnswers)}

OBJECTIVE
Synthesize ALL ANSWERS into a decision-ready Needs Analysis. Tie every recommendation to objectives, audience, constraints, timeline, or budget. Be specific and action-oriented. Address learner characteristics, technology capabilities, talent resources, accessibility, language/culture, engagement, and measurement.

ANIMATED DATA & INFOGRAPHICS HINTS (for UI)
- Put numeric targets in success_metrics strings (e.g., "Completion rate: 85%").
- Express tech readiness as "N/10" when relevant.
- Use ISO dates (yyyy-mm-dd) in delivery_plan.timeline.

OUTPUT: Return ONLY valid JSON with this EXACT structure (no markdown, no extra text):
{
  "summary": {
    "problem_statement": "string",
    "current_state": ["string", "string"],
    "root_causes": ["string", "string"],
    "objectives": ["string", "string"]
  },
  "solution": {
    "modalities": [
      {"name": "string", "reason": "string"}
    ],
    "scope": {
      "audiences": ["string"],
      "competencies": ["string"],
      "content_outline": ["string"]
    }
  },
  "learner_analysis": {
    "profile": {
      "demographics": ["string"],
      "tech_readiness": "string",
      "learning_style_fit": ["string"]
    },
    "engagement_strategy": {
      "motivation_drivers": ["string"],
      "potential_barriers": ["string"],
      "support_mechanisms": ["string"]
    },
    "design_implications": {
      "content_adaptations": ["string"],
      "delivery_adjustments": ["string"],
      "accessibility_requirements": ["string"],
      "language_considerations": ["string"]
    }
  },
  "technology_talent": {
    "tech_enablers": {
      "available": ["string"],
      "required": ["string"],
      "integration_needs": ["string"]
    },
    "talent_requirements": {
      "internal_roles": ["string"],
      "external_support": ["string"],
      "development_needs": ["string"]
    },
    "limitations_impact": {
      "tech_constraints": ["string"],
      "talent_gaps_impact": ["string"],
      "mitigation_strategies": ["string"]
    }
  },
  "delivery_plan": {
    "timeline": [
      {"label": "string", "start": "yyyy-mm-dd", "end": "yyyy-mm-dd"}
    ],
    "resources": ["string"]
  },
  "measurement": {
    "success_metrics": ["string"]
  },
  "risks": ["string"],
  "next_steps": ["string"]
}`;
