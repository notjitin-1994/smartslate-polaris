// src/polaris/needs-analysis/report.ts
export interface NAReport {
  summary: {
    problem_statement: string;
    current_state: string[];                 // bullets
    root_causes: string[];                   // bullets
    objectives: string[];                    // measurable
  };
  solution: {
    modalities: Array<{ name: string; reason: string; }>;   // Live, eLearning, Blended, Coaching, Toolkits
    scope: {
      audiences: string[];
      competencies: string[];                // e.g., consultative selling, coaching, compliance
      content_outline: string[];             // module-level bullets
    };
  };
  learner_analysis: {
    profile: {
      demographics: string[];                 // Age range, education level, etc.
      tech_readiness: string;                // Overall tech savviness assessment
      learning_style_fit: string[];          // Preferred learning approaches based on profile
    };
    engagement_strategy: {
      motivation_drivers: string[];           // What will motivate these learners
      potential_barriers: string[];           // Obstacles to engagement
      support_mechanisms: string[];           // Help and support approaches
    };
    design_implications: {
      content_adaptations: string[];          // How content should be adapted for learners
      delivery_adjustments: string[];         // Delivery method modifications
      accessibility_requirements: string[];   // Specific accessibility needs to address
      language_considerations: string[];      // Language/localization needs
    };
  };
  technology_talent: {
    tech_enablers: {
      available: string[];                    // Technologies that can be leveraged
      required: string[];                     // New tech needed for success
      integration_needs: string[];            // Systems that need to be connected
    };
    talent_requirements: {
      internal_roles: string[];               // Internal roles/skills needed
      external_support: string[];             // External expertise required
      development_needs: string[];            // Skills to be developed internally
    };
    limitations_impact: {
      tech_constraints: string[];             // How tech limitations affect the solution
      talent_gaps_impact: string[];           // How talent gaps affect delivery
      mitigation_strategies: string[];        // Strategies to work around limitations
    };
  };
  delivery_plan: {
    phases: Array<{
      name: string; duration_weeks: number; goals: string[]; activities: string[];
    }>;
    timeline: Array<{ label: string; start: string; end: string }>;   // ISO dates (align with calendar inputs)
    resources: string[];                      // roles + counts suggested
  };
  measurement: {
    success_metrics: string[];                // leading + lagging
    assessment_strategy: string[];            // quizzes, observations, projects
    data_sources: string[];                   // LMS, CRM, HRIS
  };
  budget: {
    notes: string;
    ranges: Array<{ item: string; low: string; high: string }>; // descriptive ranges; currency left as string for flexibility
  };
  risks: Array<{ risk: string; mitigation: string }>;
  next_steps: string[];                        // immediate actions
}

export const NA_REPORT_PROMPT = (
  experienceLevel: string,
  allAnswers: Record<string, unknown>
) => `ROLE: You are a principal L&D consultant. Produce a decision-ready Needs Analysis Report.
USER EXPERIENCE: ${experienceLevel}
ALL ANSWERS: ${JSON.stringify(allAnswers)}

REQUIREMENTS:
- Be specific and action-oriented. Avoid fluff.
- Tie recommendations to business objectives, constraints, and systems provided.
- CRITICAL: Analyze learner characteristics (learner_age_range, learner_tech_savviness, learner_education_level, learning_preferences, prior_training_experience, learner_motivation_level, accessibility_needs, learner_time_availability, learner_device_access, learner_work_environment, learner_language_diversity, learner_cultural_factors) to tailor the solution.
- ESSENTIAL: Analyze technology capabilities (available_technologies, tech_expertise_level, tech_limitations, tech_investment_appetite) and talent resources (talent_availability, talent_gaps, talent_constraints) from the answers.
- Consider how learner profiles affect content design, delivery methods, and support needs.
- Address accessibility requirements and language/cultural considerations explicitly.
- Consider how tech/talent limitations impact solution design and delivery approach.
- Recommend engagement strategies based on learner motivation levels and preferences.
- Prefer modalities that match learner tech savviness, device access, and time availability.
- Include phases with durations, a simple timeline, and clear next steps.
- Provide pragmatic success metrics and data sources.
- Budget ranges should be realistic bands (as text), not exact quotes.
\nANIMATED DATA & INFOGRAPHICS REQUIREMENTS (for UI visualizations):
- Use quantifiable targets wherever reasonable so the UI can render bars/gauges:
  - Put numeric percentages in success_metrics (e.g., "Completion rate: 85%" or "Time-to-productivity: 30% faster").
  - Express technology readiness as an integer format "N/10" (e.g., "7/10").
  - Prefer adding simple fractions or percentages in assessment_strategy items when applicable (e.g., "Observation checklists – 40%").
- For risks, include severity words in the risk text such as "High", "Medium", or "Low" so the UI can badge them.
- Ensure delivery_plan.timeline contains realistic ISO dates (yyyy-mm-dd) so the UI can draw the timeline bars.
- Keep all values concise and human-readable (no markdown in fields, plain text only).

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
    "phases": [
      {"name": "string", "duration_weeks": number, "goals": ["string"], "activities": ["string"]}
    ],
    "timeline": [
      {"label": "string", "start": "yyyy-mm-dd", "end": "yyyy-mm-dd"}
    ],
    "resources": ["string"]
  },
  "measurement": {
    "success_metrics": ["string"],
    "assessment_strategy": ["string"],
    "data_sources": ["string"]
  },
  "budget": {
    "notes": "string",
    "ranges": [
      {"item": "string", "low": "string", "high": "string"}
    ]
  },
  "risks": [
    {"risk": "string", "mitigation": "string"}
  ],
  "next_steps": ["string"]
}`;
