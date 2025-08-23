// src/polaris/needs-analysis/static.ts
import type { NAField } from './types';

export const NA_STATIC_FIELDS: NAField[] = [
  // 1) Organization & Audience
  { id: 'org_name', label: 'Organization / Team name', type: 'text', required: true, placeholder: 'Smartslate – Services' },
  { id: 'industry', label: 'Industry', type: 'single_select', options: ['Technology','Finance','Healthcare','Manufacturing','Retail','Education','Other'], required: true },
  { id: 'employee_count', label: 'Approx. employee count', type: 'single_select', options: ['< 100','100–500','500–2,000','2,000–10,000','> 10,000'], required: true },
  { id: 'audience_role', label: 'Primary learner audience', type: 'multi_select', options: ['ICs','Frontline Managers','Senior Leaders','Sales','Engineering','Ops','New Hires','Other'], required: true },

  // 2) Business Context
  { id: 'business_objectives', label: 'Top 2–3 business objectives', type: 'textarea', help: 'What success looks like in business terms (revenue, retention, NPS, compliance, etc.)', required: true },
  { id: 'performance_gaps', label: 'Observed performance gaps', type: 'textarea', help: 'Behaviors, metrics, or workflows that need to change', required: true },
  { id: 'geographies', label: 'Geographies', type: 'multi_select', options: ['India','APAC','EMEA','Americas','Global'], required: true },

  // 3) Constraints & Preferences
  { id: 'budget_ceiling', label: 'Budget ceiling', type: 'slider', min: 0, max: 100, step: 5, unit: '₹L (approx.)', help: 'Rough range acceptable for pilot/phase 1', required: true },
  { id: 'time_to_impact', label: 'Desired time-to-impact', type: 'single_select', options: ['< 4 weeks','4–8 weeks','8–12 weeks','> 12 weeks'], required: true },
  { id: 'preferred_modalities', label: 'Preferred delivery modalities', type: 'multi_select', options: ['Live Virtual','In-person Workshop','Self-paced eLearning','Blended','Cohort-based','Job Aids/Toolkits','Coaching'], required: true },
  { id: 'constraints', label: 'Hard constraints', type: 'multi_select', options: ['Shift coverage','Compliance deadlines','Limited devices','Security restrictions','Bandwidth','Union rules','None'], required: true },

  // 4) Systems & Data
  { id: 'systems', label: 'Current systems', type: 'multi_select', options: ['LMS','LXP','HRIS','CRM','Slack/Teams','None/Other'], required: true },
  { id: 'success_metrics', label: 'Key metrics you track (or will track)', type: 'multi_select', options: ['Completion','Assessment scores','Time-to-productivity','Sales KPIs','CSAT/NPS','Quality/Defects','Attrition','Other'], required: true },

  // 5) Timeline & Scheduling
  { id: 'kickoff_window', label: 'Preferred kickoff window', type: 'calendar_range', help: 'Earliest start → Latest acceptable start', required: true },
  { id: 'stakeholder_workshop_date', label: 'Stakeholder workshop date (optional)', type: 'calendar_date' },

  // 6) Risk & Change Readiness
  { id: 'risk_tolerance', label: 'Risk tolerance for experimentation', type: 'slider', min: 0, max: 10, step: 1, help: '0 = very cautious • 10 = highly experimental', required: true },
  { id: 'change_readiness', label: 'Change readiness', type: 'single_select', options: ['Low','Medium','High'], required: true },

  // 7) Learner Familiarization
  { id: 'learner_age_range', label: 'Average learner age range', type: 'single_select', options: ['18-24','25-34','35-44','45-54','55+','Mixed ages'], help: 'Primary age demographic of your learners', required: true },
  { id: 'learner_tech_savviness', label: 'Learner tech savviness', type: 'slider', min: 0, max: 10, step: 1, help: '0 = minimal tech skills • 10 = highly tech-savvy', required: true },
  { id: 'learner_education_level', label: 'Typical education level', type: 'single_select', options: ['High school','Some college','Bachelor\'s degree','Master\'s degree','Mixed levels','Trade/Technical'], help: 'Most common education level among learners', required: true },
  { id: 'learning_preferences', label: 'Known learning preferences', type: 'multi_select', options: ['Visual content','Video-based','Reading/Text','Hands-on practice','Group discussions','Self-paced','Instructor-led','Mobile learning','Microlearning'], help: 'How your learners prefer to learn', required: true },
  { id: 'prior_training_experience', label: 'Prior corporate training experience', type: 'single_select', options: ['None/Limited','Some exposure','Moderate experience','Extensive experience','Varies widely'], help: 'Learners\' familiarity with corporate L&D programs', required: true },
  { id: 'learner_motivation_level', label: 'Expected learner motivation', type: 'slider', min: 0, max: 10, step: 1, help: '0 = highly resistant • 10 = highly motivated', required: true },
  { id: 'accessibility_needs', label: 'Accessibility requirements', type: 'multi_select', options: ['Visual accommodations','Hearing accommodations','Motor accommodations','Cognitive accommodations','Language translation','None identified','Need to assess'], help: 'Special accessibility needs in your learner population', required: true },
  { id: 'learner_time_availability', label: 'Time learners can dedicate weekly', type: 'single_select', options: ['< 30 minutes','30-60 minutes','1-2 hours','2-4 hours','4+ hours','Varies significantly'], help: 'Realistic time commitment for learning activities', required: true },
  { id: 'learner_device_access', label: 'Learner device access', type: 'multi_select', options: ['Company desktop','Personal computer','Company mobile','Personal mobile','Tablet','Shared terminals','Limited/No access'], help: 'Devices learners can use for training', required: true },
  { id: 'learner_work_environment', label: 'Typical work environment', type: 'multi_select', options: ['Office/Desk-based','Remote/Home','Field/On-site','Manufacturing floor','Retail floor','Mixed environments','Customer-facing'], help: 'Where learners typically work', required: true },
  { id: 'learner_language_diversity', label: 'Language considerations', type: 'textarea', help: 'Primary languages spoken and any translation needs', placeholder: 'e.g., 60% English, 30% Hindi, 10% Regional languages', required: true },
  { id: 'learner_cultural_factors', label: 'Cultural considerations', type: 'textarea', help: 'Cultural factors that may impact learning design', placeholder: 'e.g., Hierarchical culture, preference for group learning, specific religious considerations', required: true },

  // 8) Technology & Talent
  { id: 'available_technologies', label: 'Available technologies & platforms', type: 'multi_select', options: ['Cloud Infrastructure','AI/ML Tools','Data Analytics','Automation Tools','Collaboration Platforms','Custom Development','Legacy Systems','None/Limited'], help: 'Current technology capabilities your organization has access to', required: true },
  { id: 'tech_expertise_level', label: 'Internal technical expertise level', type: 'slider', min: 0, max: 10, step: 1, help: '0 = no technical expertise • 10 = highly advanced tech team', required: true },
  { id: 'talent_availability', label: 'Available talent & skills', type: 'multi_select', options: ['Subject Matter Experts','Instructional Designers','Tech Developers','Data Analysts','Project Managers','Change Agents','External Consultants','Limited Resources'], help: 'Human resources available for the initiative', required: true },
  { id: 'talent_gaps', label: 'Critical talent gaps', type: 'textarea', help: 'Key skills or roles that are missing or insufficient', placeholder: 'e.g., No dedicated L&D team, Limited data analysis capabilities', required: true },
  { id: 'tech_limitations', label: 'Technology limitations & constraints', type: 'textarea', help: 'Technical barriers or restrictions that may impact delivery', placeholder: 'e.g., Legacy LMS, No API access, Security restrictions on cloud tools', required: true },
  { id: 'talent_constraints', label: 'Talent availability constraints', type: 'multi_select', options: ['High turnover','Competing priorities','Geographic distribution','Language barriers','Skill gaps','Budget for hiring','Union restrictions','None'], required: true },
  { id: 'tech_investment_appetite', label: 'Technology investment readiness', type: 'single_select', options: ['No new tech investment','Minimal investment (<10L)','Moderate investment (10-50L)','Significant investment (50L+)','Open to recommendations'], help: 'Willingness to invest in new technology for this initiative', required: true },

  // 9) Content Creation Tools
  { id: 'content_delivery_types', label: 'Relevant deliveries for content creation', type: 'multi_select', options: ['Live Virtual','In-person Workshop','Self-paced eLearning','Blended Learning','Microlearning','Video','Podcast/Audio','Job Aids/Toolkits','Coaching','AR/VR'], help: 'Select all delivery types you expect to create content for' },
  { id: 'authoring_tools', label: 'eLearning authoring tools', type: 'multi_select', options: ['Articulate 360 (Rise/Storyline)','Adobe Captivate','iSpring Suite','domiKnow | ONE','Lectora','Adapt Builder','Evolve','Elucidat'], help: 'Select current or available authoring tools' },
  { id: 'video_audio_tools', label: 'Video/Audio creation tools', type: 'multi_select', options: ['Camtasia','Adobe Premiere Pro','Final Cut Pro','Descript','Loom','OBS Studio','Riverside','Audacity'], help: 'Tools used for recording, editing, and producing media' },
  { id: 'visual_design_tools', label: 'Visual design & prototyping', type: 'multi_select', options: ['Figma','Adobe Illustrator','Adobe Photoshop','Canva','Miro','FigJam'], help: 'Design and collaboration tools for visuals and flows' },
  { id: 'interactive_tools', label: 'Interactive & simulation tools', type: 'multi_select', options: ['H5P','Genially','CenarioVR','ThingLink','Articulate Rise interactions','Captivate interactions'], help: 'Tools for interactivity, branching, simulations, or VR' },
  { id: 'ai_content_tools', label: 'AI content generation/assistants', type: 'multi_select', options: ['OpenAI (ChatGPT)','Anthropic (Claude)','Google (Gemini)','Jasper','Copy.ai','Writesonic','Notion AI','Synthesia (AI video)','HeyGen','D-ID','Pictory','Runway'], help: 'AI tools for drafting, media, and acceleration' },
  { id: 'translation_tools', label: 'Translation & localization', type: 'multi_select', options: ['Lokalise','Smartling','Crowdin','DeepL','Google Translate','Weglot'], help: 'Localization platforms or machine translation' },
  { id: 'content_libraries', label: 'Content libraries & catalogs', type: 'multi_select', options: ['LinkedIn Learning','Coursera for Business','Udemy Business','Skillsoft','Pluralsight','Go1'], help: 'Licensed catalogs you can leverage' },
  { id: 'lms_lxp_platforms', label: 'LMS/LXP platforms in use', type: 'multi_select', options: ['Moodle','Canvas','Cornerstone','Docebo','SAP Litmos','TalentLMS','360Learning','Degreed','EdCast'], help: 'Platforms where content will live or be distributed' },
  { id: 'assessment_survey_tools', label: 'Assessment & survey tools', type: 'multi_select', options: ['Typeform','Google Forms','Microsoft Forms','Qualtrics','SurveyMonkey','ClassMarker','Kahoot!','Mentimeter'], help: 'Tools for quizzes, checks, and feedback' },
  { id: 'knowledge_doc_tools', label: 'Knowledge base & docs', type: 'multi_select', options: ['Confluence','Notion','SharePoint','Google Docs'], help: 'Where job aids or SOPs will be authored and maintained' },
  { id: 'other_content_tools', label: 'Other tools or providers', type: 'textarea', placeholder: 'List any additional vendors/providers or internal tools relevant to content creation' },
  { id: 'integration_constraints_content_tools', label: 'Integration constraints for content tools', type: 'textarea', help: 'e.g., SCORM/xAPI requirements, SSO, security reviews, hosting limitations', placeholder: 'List any integration, security, or compliance requirements that content tools must meet' },

  // 10) Contacts
  { id: 'primary_contact_name', label: 'Primary stakeholder name', type: 'text', required: true },
  { id: 'primary_contact_role', label: 'Primary stakeholder role', type: 'text', placeholder: 'Head of L&D / VP Sales Enablement', required: true }
];
