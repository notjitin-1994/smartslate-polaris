// src/polaris/needs-analysis/static.ts
import type { NAField } from './types';

export const NA_STATIC_FIELDS: NAField[] = [
  // 1) Organization & Audience
  { id: 'org_name', label: 'Organization / Team name', type: 'text', required: true, placeholder: 'Smartslate – Services' },
  { id: 'industry', label: 'Industry', type: 'single_select', options: ['Technology','Finance','Healthcare','Manufacturing','Retail','Education','Other'] },
  { id: 'employee_count', label: 'Approx. employee count', type: 'single_select', options: ['< 100','100–500','500–2,000','2,000–10,000','> 10,000'] },
  { id: 'audience_role', label: 'Primary learner audience', type: 'multi_select', options: ['ICs','Frontline Managers','Senior Leaders','Sales','Engineering','Ops','New Hires','Other'] },

  // 2) Business Context
  { id: 'business_objectives', label: 'Top 2–3 business objectives', type: 'textarea', help: 'What success looks like in business terms (revenue, retention, NPS, compliance, etc.)' },
  { id: 'performance_gaps', label: 'Observed performance gaps', type: 'textarea', help: 'Behaviors, metrics, or workflows that need to change' },
  { id: 'geographies', label: 'Geographies', type: 'multi_select', options: ['India','APAC','EMEA','Americas','Global'] },

  // 3) Constraints & Preferences
  { id: 'budget_ceiling', label: 'Budget ceiling', type: 'slider', min: 0, max: 100, step: 5, unit: '₹L (approx.)', help: 'Rough range acceptable for pilot/phase 1' },
  { id: 'time_to_impact', label: 'Desired time-to-impact', type: 'single_select', options: ['< 4 weeks','4–8 weeks','8–12 weeks','> 12 weeks'] },
  { id: 'preferred_modalities', label: 'Preferred delivery modalities', type: 'multi_select', options: ['Live Virtual','In-person Workshop','Self-paced eLearning','Blended','Cohort-based','Job Aids/Toolkits','Coaching'] },
  { id: 'constraints', label: 'Hard constraints', type: 'multi_select', options: ['Shift coverage','Compliance deadlines','Limited devices','Security restrictions','Bandwidth','Union rules','None'] },

  // 4) Systems & Data
  { id: 'systems', label: 'Current systems', type: 'multi_select', options: ['LMS','LXP','HRIS','CRM','Slack/Teams','None/Other'] },
  { id: 'success_metrics', label: 'Key metrics you track (or will track)', type: 'multi_select', options: ['Completion','Assessment scores','Time-to-productivity','Sales KPIs','CSAT/NPS','Quality/Defects','Attrition','Other'] },

  // 5) Timeline & Scheduling
  { id: 'kickoff_window', label: 'Preferred kickoff window', type: 'calendar_range', help: 'Earliest start → Latest acceptable start' },
  { id: 'stakeholder_workshop_date', label: 'Stakeholder workshop date (optional)', type: 'calendar_date' },

  // 6) Risk & Change Readiness
  { id: 'risk_tolerance', label: 'Risk tolerance for experimentation', type: 'slider', min: 0, max: 10, step: 1, help: '0 = very cautious • 10 = highly experimental' },
  { id: 'change_readiness', label: 'Change readiness', type: 'single_select', options: ['Low','Medium','High'] },

  // 7) Learner Familiarization
  { id: 'learner_age_range', label: 'Average learner age range', type: 'single_select', options: ['18-24','25-34','35-44','45-54','55+','Mixed ages'], help: 'Primary age demographic of your learners' },
  { id: 'learner_tech_savviness', label: 'Learner tech savviness', type: 'slider', min: 0, max: 10, step: 1, help: '0 = minimal tech skills • 10 = highly tech-savvy' },
  { id: 'learner_education_level', label: 'Typical education level', type: 'single_select', options: ['High school','Some college','Bachelor\'s degree','Master\'s degree','Mixed levels','Trade/Technical'], help: 'Most common education level among learners' },
  { id: 'learning_preferences', label: 'Known learning preferences', type: 'multi_select', options: ['Visual content','Video-based','Reading/Text','Hands-on practice','Group discussions','Self-paced','Instructor-led','Mobile learning','Microlearning'], help: 'How your learners prefer to learn' },
  { id: 'prior_training_experience', label: 'Prior corporate training experience', type: 'single_select', options: ['None/Limited','Some exposure','Moderate experience','Extensive experience','Varies widely'], help: 'Learners\' familiarity with corporate L&D programs' },
  { id: 'learner_motivation_level', label: 'Expected learner motivation', type: 'slider', min: 0, max: 10, step: 1, help: '0 = highly resistant • 10 = highly motivated' },
  { id: 'accessibility_needs', label: 'Accessibility requirements', type: 'multi_select', options: ['Visual accommodations','Hearing accommodations','Motor accommodations','Cognitive accommodations','Language translation','None identified','Need to assess'], help: 'Special accessibility needs in your learner population' },
  { id: 'learner_time_availability', label: 'Time learners can dedicate weekly', type: 'single_select', options: ['< 30 minutes','30-60 minutes','1-2 hours','2-4 hours','4+ hours','Varies significantly'], help: 'Realistic time commitment for learning activities' },
  { id: 'learner_device_access', label: 'Learner device access', type: 'multi_select', options: ['Company desktop','Personal computer','Company mobile','Personal mobile','Tablet','Shared terminals','Limited/No access'], help: 'Devices learners can use for training' },
  { id: 'learner_work_environment', label: 'Typical work environment', type: 'multi_select', options: ['Office/Desk-based','Remote/Home','Field/On-site','Manufacturing floor','Retail floor','Mixed environments','Customer-facing'], help: 'Where learners typically work' },
  { id: 'learner_language_diversity', label: 'Language considerations', type: 'textarea', help: 'Primary languages spoken and any translation needs', placeholder: 'e.g., 60% English, 30% Hindi, 10% Regional languages' },
  { id: 'learner_cultural_factors', label: 'Cultural considerations', type: 'textarea', help: 'Cultural factors that may impact learning design', placeholder: 'e.g., Hierarchical culture, preference for group learning, specific religious considerations' },

  // 8) Technology & Talent
  { id: 'available_technologies', label: 'Available technologies & platforms', type: 'multi_select', options: ['Cloud Infrastructure','AI/ML Tools','Data Analytics','Automation Tools','Collaboration Platforms','Custom Development','Legacy Systems','None/Limited'], help: 'Current technology capabilities your organization has access to' },
  { id: 'tech_expertise_level', label: 'Internal technical expertise level', type: 'slider', min: 0, max: 10, step: 1, help: '0 = no technical expertise • 10 = highly advanced tech team' },
  { id: 'talent_availability', label: 'Available talent & skills', type: 'multi_select', options: ['Subject Matter Experts','Instructional Designers','Tech Developers','Data Analysts','Project Managers','Change Agents','External Consultants','Limited Resources'], help: 'Human resources available for the initiative' },
  { id: 'talent_gaps', label: 'Critical talent gaps', type: 'textarea', help: 'Key skills or roles that are missing or insufficient', placeholder: 'e.g., No dedicated L&D team, Limited data analysis capabilities' },
  { id: 'tech_limitations', label: 'Technology limitations & constraints', type: 'textarea', help: 'Technical barriers or restrictions that may impact delivery', placeholder: 'e.g., Legacy LMS, No API access, Security restrictions on cloud tools' },
  { id: 'talent_constraints', label: 'Talent availability constraints', type: 'multi_select', options: ['High turnover','Competing priorities','Geographic distribution','Language barriers','Skill gaps','Budget for hiring','Union restrictions','None'] },
  { id: 'tech_investment_appetite', label: 'Technology investment readiness', type: 'single_select', options: ['No new tech investment','Minimal investment (<10L)','Moderate investment (10-50L)','Significant investment (50L+)','Open to recommendations'], help: 'Willingness to invest in new technology for this initiative' },

  // 9) Contacts
  { id: 'primary_contact_name', label: 'Primary stakeholder name', type: 'text' },
  { id: 'primary_contact_role', label: 'Primary stakeholder role', type: 'text', placeholder: 'Head of L&D / VP Sales Enablement' }
];
