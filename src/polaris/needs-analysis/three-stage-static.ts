// Three-stage static fields for revamped starmap creation flow
import type { NAField } from './types'

// Stage 1: Requester Details
export const STAGE1_REQUESTER_FIELDS: NAField[] = [
  { 
    id: 'requester_name', 
    label: 'Your name', 
    type: 'text', 
    required: true, 
    placeholder: 'Jane Smith' 
  },
  { 
    id: 'requester_role', 
    label: 'Your role', 
    type: 'text', 
    required: true, 
    placeholder: 'Head of L&D' 
  },
  { 
    id: 'requester_department', 
    label: 'Department', 
    type: 'single_select', 
    options: ['Human Resources', 'Learning & Development', 'Operations', 'Sales', 'Engineering', 'Product', 'Marketing', 'Finance', 'Other'],
    required: true 
  },
  { 
    id: 'requester_email', 
    label: 'Email address', 
    type: 'text', 
    required: true, 
    placeholder: 'jane.smith@company.com' 
  },
  { 
    id: 'requester_phone', 
    label: 'Phone number (optional)', 
    type: 'text', 
    placeholder: '+1 555-0123' 
  },
  { 
    id: 'requester_profile_url', 
    label: 'LinkedIn or public profile URL', 
    type: 'text', 
    placeholder: 'https://linkedin.com/in/your-handle' 
  },
  { 
    id: 'requester_timezone', 
    label: 'Time zone', 
    type: 'single_select',
    options: ['UTC-12:00', 'UTC-11:00', 'UTC-10:00', 'UTC-09:00', 'UTC-08:00 (PST)', 'UTC-07:00 (MST)', 'UTC-06:00 (CST)', 'UTC-05:00 (EST)', 'UTC-04:00', 'UTC-03:00', 'UTC-02:00', 'UTC-01:00', 'UTC+00:00 (GMT)', 'UTC+01:00 (CET)', 'UTC+02:00 (EET)', 'UTC+03:00', 'UTC+04:00', 'UTC+05:00', 'UTC+05:30 (IST)', 'UTC+06:00', 'UTC+07:00', 'UTC+08:00 (CST/SGT)', 'UTC+09:00 (JST)', 'UTC+10:00 (AEST)', 'UTC+11:00', 'UTC+12:00'],
    default: 'UTC+05:30 (IST)'
  }
]

// Stage 2: Organisation Information
export const STAGE2_ORGANIZATION_FIELDS: NAField[] = [
  { 
    id: 'org_name', 
    label: 'Organization name', 
    type: 'text', 
    required: true, 
    placeholder: 'Acme Corporation' 
  },
  { 
    id: 'org_industry', 
    label: 'Industry', 
    type: 'single_select', 
    options: ['Technology', 'Finance', 'Healthcare', 'Manufacturing', 'Retail', 'Education', 'Government', 'Non-profit', 'Consulting', 'Energy', 'Transportation', 'Telecommunications', 'Media & Entertainment', 'Other'],
    required: true 
  },
  { 
    id: 'org_size', 
    label: 'Organization size', 
    type: 'single_select', 
    options: ['1-50 employees', '51-200 employees', '201-500 employees', '501-1000 employees', '1001-5000 employees', '5001-10000 employees', '10000+ employees'],
    required: true 
  },
  { 
    id: 'org_headquarters', 
    label: 'Headquarters location', 
    type: 'text', 
    required: true, 
    placeholder: 'San Francisco, CA, USA' 
  },
  { 
    id: 'org_website', 
    label: 'Company website', 
    type: 'text', 
    placeholder: 'https://www.example.com' 
  },
  { 
    id: 'org_mission', 
    label: 'Mission statement', 
    type: 'textarea', 
    help: 'Brief description of your organization\'s mission and values',
    placeholder: 'Our mission is to...' 
  },
  { 
    id: 'org_compliance', 
    label: 'Legal/Compliance requirements', 
    type: 'multi_select',
    options: ['GDPR', 'HIPAA', 'SOC 2', 'ISO 27001', 'PCI DSS', 'FERPA', 'CCPA', 'Industry-specific regulations', 'None', 'Other'],
    help: 'Select all that apply to your organization',
    required: true
  },
  { 
    id: 'org_stakeholders', 
    label: 'Key stakeholder groups', 
    type: 'multi_select',
    options: ['C-Suite', 'Board of Directors', 'HR Leadership', 'Department Heads', 'Union Representatives', 'Employee Resource Groups', 'External Partners', 'Customers', 'Investors'],
    help: 'Select all groups involved in L&D decisions',
    required: true
  }
]

// Stage 3: Project Scoping
export const STAGE3_PROJECT_FIELDS: NAField[] = [
  { 
    id: 'project_objectives', 
    label: 'Primary objectives', 
    type: 'textarea', 
    required: true,
    help: 'What are you trying to achieve with this L&D initiative?',
    placeholder: 'Improve sales performance by 20%, reduce onboarding time from 4 weeks to 2 weeks...'
  },
  { 
    id: 'project_constraints', 
    label: 'Key constraints', 
    type: 'textarea', 
    required: true,
    help: 'What limitations or challenges do you face?',
    placeholder: 'Limited budget, distributed workforce, technology restrictions...'
  },
  { 
    id: 'target_audience', 
    label: 'Target audience persona', 
    type: 'textarea', 
    required: true,
    help: 'Describe your learners - demographics, roles, experience levels',
    placeholder: 'Mid-level managers, 30-45 years old, 5+ years experience, tech-savvy...'
  },
  { 
    id: 'project_timeline', 
    label: 'Expected timeline', 
    type: 'calendar_range',
    required: true,
    help: 'When do you plan to start and complete this initiative?'
  },
  { 
    id: 'project_budget_range', 
    label: 'Budget range', 
    type: 'single_select',
    options: ['< $10,000', '$10,000 - $50,000', '$50,000 - $100,000', '$100,000 - $250,000', '$250,000 - $500,000', '$500,000 - $1M', '> $1M', 'To be determined'],
    required: true
  },
  { 
    id: 'available_hardware', 
    label: 'Available hardware/devices', 
    type: 'multi_select',
    options: ['Desktop computers', 'Laptops', 'Tablets', 'Smartphones', 'VR headsets', 'Smart boards', 'Training room AV equipment', 'Limited/None'],
    help: 'What devices can learners use?'
  },
  { 
    id: 'available_software', 
    label: 'Available software/platforms', 
    type: 'multi_select',
    options: ['LMS', 'Microsoft 365', 'Google Workspace', 'Zoom', 'Slack', 'Teams', 'Moodle', 'Canvas', 'Custom platforms', 'None'],
    help: 'What platforms are already in use?'
  },
  { 
    id: 'subject_matter_experts', 
    label: 'Subject matter experts', 
    type: 'textarea',
    placeholder: 'List internal or external experts available for content development'
  },
  { 
    id: 'additional_context', 
    label: 'Other important information', 
    type: 'textarea',
    placeholder: 'Any other context that would help in designing your L&D solution'
  }
]

// Group metadata for UI organization
export const THREE_STAGE_GROUPS = [
  {
    id: 'stage1',
    title: 'Requester Details',
    description: 'Tell us about yourself',
    fields: STAGE1_REQUESTER_FIELDS,
    researchLabel: 'GreetingReport'
  },
  {
    id: 'stage2', 
    title: 'Organisation Information',
    description: 'Help us understand your organization',
    fields: STAGE2_ORGANIZATION_FIELDS,
    researchLabel: 'OrgReport'
  },
  {
    id: 'stage3',
    title: 'Project Scoping',
    description: 'Define your L&D initiative requirements',
    fields: STAGE3_PROJECT_FIELDS,
    researchLabel: 'RequirementReport'
  }
]
