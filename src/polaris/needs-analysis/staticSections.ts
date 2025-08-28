// Static intake sections for Polaris (finalized structure)
import type { NAField } from './types'

export interface NASection {
  id: string
  title: string
  description?: string
  fields: NAField[]
}

export const POLARIS_STATIC_SECTIONS: NASection[] = [
  {
    id: 'org_audience',
    title: 'Organization & Audience',
    description: 'Learners, locations, inclusion needs.',
    fields: [
      { id: 'org_name', label: 'Organization / Team name', type: 'text', required: true, placeholder: 'e.g., Smartslate – Services' },
      { id: 'industry', label: 'Industry', type: 'single_select', options: ['Technology','Finance','Healthcare','Manufacturing','Retail','Education','Government','Non-profit','Other'], required: true },
      { id: 'employee_count', label: 'Approx. employee count', type: 'single_select', options: ['< 100','100–500','500–2,000','2,000–10,000','> 10,000'], required: true },
      { id: 'geographies_covered', label: 'Geographies covered', type: 'multi_select', options: ['Global','AMER','EMEA','APAC','India','Other'], required: true },
      { id: 'primary_learner_segments', label: 'Primary learner segments', type: 'multi_select', options: ['ICs','Frontline','Managers','Senior Leaders','Sales','Engineering','Operations','New Hires','Field Workforce','Customer Support','Compliance-sensitive','Other'], required: true },
      { id: 'typical_seniority', label: 'Typical seniority of learners', type: 'multi_select', options: ['Entry-level','Associate / Junior','Mid-level','Senior / IC4+','Lead / Manager','Director+','Mixed'], required: true },
      { id: 'language_requirements', label: 'Language requirements', type: 'textarea', placeholder: 'e.g., English primary; support Hindi and 2 regional languages', required: true },
      { id: 'device_bandwidth_access', label: 'Device & bandwidth access', type: 'multi_select', options: ['Desktop','Laptop','Mobile','Tablet','Shared kiosks','Low bandwidth','Offline scenarios','No personal devices'], required: true },
      { id: 'accessibility_considerations', label: 'Accessibility considerations', type: 'multi_select', options: ['Visual','Hearing','Motor','Cognitive','Language/Translation','None known','Need assessment'], required: true }
    ]
  },
  {
    id: 'business_context',
    title: 'Business Context & Strategic Alignment',
    description: 'Business goals and success measures.',
    fields: [
      { id: 'top_business_objectives', label: 'Top 2–3 business objectives', type: 'textarea', required: true, placeholder: 'e.g., Improve conversion rate by 10%, reduce onboarding time to 2 weeks' },
      { id: 'observed_performance_gaps', label: 'Observed performance gaps', type: 'textarea', required: true, placeholder: 'Behaviors, metrics, or workflows that need to change' },
      { id: 'learning_contribution', label: 'How will learning contribute to these objectives?', type: 'textarea', required: true },
      { id: 'key_metrics_tracked', label: 'Key metrics you track (or will track)', type: 'multi_select', options: ['Completion','Assessment scores','Time-to-proficiency','Sales KPIs','Quality/Defects','Productivity','CSAT/NPS','Safety','Compliance','Attrition','Other'], required: true },
      { id: 'measurement_notes', label: 'Measurement notes / definitions (baselines, KPI calculations)', type: 'textarea', placeholder: 'Include baselines, formulas, and data sources' }
    ]
  },
  {
    id: 'project_requirements',
    title: 'Project Requirements',
    description: 'Objectives, skills, assessments, compliance, rollout.',
    fields: [
      { id: 'project_objectives', label: 'Project objectives & desired outcomes', type: 'textarea', required: true },
      { id: 'target_competencies', label: 'Target competencies / skills', type: 'textarea', placeholder: 'List competencies to target' },
      { id: 'competency_framework', label: 'Competency framework / levels (if any)', type: 'textarea', placeholder: 'e.g., Bloom’s, SFIA, Dreyfus, internal framework' },
      { id: 'assessment_approach', label: 'Assessment approach', type: 'multi_select', options: ['Knowledge checks','Performance demo','Scenario-based','Simulation','Observation','Peer review','Manager sign-off','Certification/Exam','Survey/Feedback','Other'] },
      { id: 'regulatory_must_haves', label: 'Regulatory / compliance must-haves', type: 'multi_select', options: ['GDPR','HIPAA','SOC 2','ISO 27001','PCI DSS','SOX','OSHA','FDA','SEBI/IRDAI','Other'] },
      { id: 'compliance_notes', label: 'Compliance notes / citations (standards, policies, links)', type: 'textarea' },
      { id: 'audience_coverage_target', label: 'Audience coverage target (%)', type: 'slider', min: 0, max: 100, step: 5, unit: '%' },
      { id: 'localization_needs', label: 'Localization needs (languages)', type: 'textarea', placeholder: 'Languages, markets, and any constraints' },
      { id: 'delivery_constraints', label: 'Delivery constraints', type: 'multi_select', options: ['Shift coverage','24×7 workforce','No mobile devices','Firewall/VPN only','Bandwidth limits','Security/PII limits','Union rules','On-site only','Travel limits','Other'] },
      { id: 'authoring_delivery_tech_decided', label: 'Authoring/delivery tech already decided', type: 'multi_select', options: ['LMS','LXP','MS Teams','Slack','Zoom','SCORM','xAPI','SAML/SSO','On-prem only','None decided','Other'] },
      { id: 'source_content_available', label: 'Source content available', type: 'textarea', placeholder: 'Existing decks, SOPs, videos, docs' },
      { id: 'links_existing_content', label: 'Links to existing content (optional)', type: 'textarea', placeholder: 'Paste URLs, separated by new lines' },
      { id: 'rollout_strategy', label: 'Rollout strategy', type: 'textarea', placeholder: 'Pilot → phased → full launch; cohorts; sequencing' },
      { id: 'critical_milestones_window', label: 'Critical milestones window (pilot → launch)', type: 'calendar_range' },
      { id: 'baseline_metrics', label: 'Baseline metrics (current values)', type: 'textarea' },
      { id: 'target_kpi_deltas', label: 'Target KPI deltas (desired improvements)', type: 'textarea' },
      { id: 'dependencies_assumptions', label: 'Dependencies & assumptions', type: 'textarea' },
      { id: 'success_criteria_signoff', label: 'Success criteria & sign-off', type: 'textarea' }
    ]
  },
  {
    id: 'resources_constraints',
    title: 'Resources & Constraints',
    description: 'Budget, priorities, timeline, modalities, staffing.',
    fields: [
      { id: 'budget_ceiling', label: 'Budget ceiling', type: 'number', unit: '₹' },
      { id: 'budget_allocation_priorities', label: 'Budget allocation priorities', type: 'multi_select', options: ['Content','Technology','Facilitation','Translation/Localization','Incentives','Marketing/Comms','Analytics','Change management','Other'] },
      { id: 'desired_time_to_impact', label: 'Desired time-to-impact', type: 'single_select', options: ['< 4 weeks','4–8 weeks','8–12 weeks','> 12 weeks'], required: true },
      { id: 'preferred_delivery_modalities', label: 'Preferred delivery modalities', type: 'multi_select', options: ['Live Virtual','In-person Workshop','Self-paced eLearning','Blended','Cohort-based','Job Aids/Toolkits','Coaching','Microlearning'], required: true },
      { id: 'hard_constraints', label: 'Hard constraints', type: 'multi_select', options: ['Budget cap','Timeline fixed','No travel','Low bandwidth','No mobile devices','Security review','Legal review','Audit trail required','No third-party SaaS','Other'] },
      { id: 'internal_resource_availability', label: 'Internal resource availability', type: 'multi_select', options: ['Subject Matter Experts','Instructional Designers','Facilitators','Program Managers','Data Analysts','IT/Integration','Change Managers','Limited resources'] }
    ]
  },
  {
    id: 'systems_data',
    title: 'Systems & Data',
    description: 'Stack, integrations, data confidence.',
    fields: [
      { id: 'current_systems', label: 'Current systems in use', type: 'multi_select', options: ['LMS','LXP','HRIS','CRM','BI (Tableau/Looker)','Slack','Teams','Email','SSO (SAML/OIDC)','None'] },
      { id: 'integration_readiness', label: 'Integration readiness', type: 'single_select', options: ['Low','Medium','High'] },
      { id: 'learning_data_maturity', label: 'Learning data maturity', type: 'single_select', options: ['Low','Medium','High'] },
      { id: 'confidence_in_existing_data', label: 'Confidence in existing data', type: 'slider', min: 0, max: 10, step: 1 }
    ]
  },
  {
    id: 'timeline_scheduling',
    title: 'Timeline & Scheduling',
    description: 'Kickoff windows and key dates.',
    fields: [
      { id: 'critical_project_deadlines', label: 'Critical project deadlines', type: 'textarea' },
      { id: 'preferred_kickoff_window', label: 'Preferred kickoff window', type: 'calendar_range' },
      { id: 'stakeholder_workshop_date', label: 'Stakeholder workshop date (optional)', type: 'calendar_date' },
      { id: 'schedule_flexibility', label: 'Schedule flexibility', type: 'single_select', options: ['Rigid','Somewhat flexible','Flexible'] }
    ]
  },
  {
    id: 'risk_change',
    title: 'Risk & Change Readiness',
    description: 'Risks, stakeholders, change support.',
    fields: [
      { id: 'org_experimentation_appetite', label: 'Organizational appetite for experimentation', type: 'slider', min: 0, max: 10, step: 1 },
      { id: 'past_ld_adoption_experience', label: 'Past L&D adoption experience', type: 'single_select', options: ['Poor','Mixed','Good','Strong','Unknown'] },
      { id: 'stakeholders_list', label: 'Stakeholders (sponsors, blockers, champions, etc.)', type: 'textarea' },
      { id: 'key_risks_anticipated', label: 'Key risks anticipated', type: 'textarea' },
      { id: 'change_management_support', label: 'Change management support available', type: 'single_select', options: ['None','Limited','Moderate','Strong'] }
    ]
  },
  {
    id: 'learning_transfer',
    title: 'Learning Transfer',
    description: 'On-the-job application and reinforcement.',
    fields: [
      { id: 'application_context', label: 'Where will learners apply new skills?', type: 'textarea' },
      { id: 'manager_role_in_reinforcement', label: 'Manager/supervisor role in reinforcement', type: 'textarea' },
      { id: 'transfer_barriers', label: 'Barriers to learning transfer', type: 'textarea' },
      { id: 'transfer_measurement', label: 'How will transfer be measured?', type: 'textarea' }
    ]
  },
  {
    id: 'performance_support',
    title: 'Performance Support',
    description: 'Job aids and embedded support.',
    fields: [
      { id: 'existing_performance_support', label: 'Existing performance support tools in use', type: 'multi_select', options: ['Job aids','Checklists','Playbooks','Knowledge base','In-app guidance','Chatbot','Mentoring','None'] },
      { id: 'preferred_support_formats', label: 'Preferred formats for new support', type: 'multi_select', options: ['PDF','Interactive guides','Cards','Video','Short audio','Cheat sheets','Templates','Tooltips','Other'] },
      { id: 'support_embedding_locations', label: 'Where should support be embedded?', type: 'multi_select', options: ['LMS/LXP','In workflow tools','Intranet/KB','Mobile app','Email/Chat','QR/on-site','Other'] },
      { id: 'support_maintenance_owner', label: 'Who will maintain/update performance support content?', type: 'single_select', options: ['L&D','Operations','Product/IT','Shared','Other'] }
    ]
  },
  {
    id: 'documentation',
    title: 'Documentation',
    description: 'Coverage and ownership.',
    fields: [
      { id: 'current_documentation_quality', label: 'Current documentation quality', type: 'single_select', options: ['No docs','Outdated','Partial','Good','Excellent'] },
      { id: 'critical_processes_covered', label: 'Critical processes covered in documentation', type: 'textarea' },
      { id: 'documentation_ownership', label: 'Documentation ownership', type: 'single_select', options: ['L&D','Operations','QA','Engineering','Shared','Other'] },
      { id: 'integrate_docs_with_training', label: 'Should documentation be integrated with training?', type: 'single_select', options: ['Yes','No','Maybe'] }
    ]
  }
]


