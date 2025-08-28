# Needs Analysis User Flow

## Overview
The Needs Analysis feature provides a guided workflow for Learning & Development professionals to conduct comprehensive training needs assessments, from initial intake through final report approval.

## User Journey

### 1. Dashboard Entry
- User navigates to `/needs-analysis` from the portal
- Views list of existing projects with status indicators
- Can create new project or continue existing ones

### 2. Project Creation & Intake Wizard
**Route:** `/needs-analysis/new`

The intake wizard consists of 4 steps:

#### Step 1: Business Context
- Project title (required)
- Business goal/problem statement
- Success metrics (key-value pairs)
- Target deadline
- Budget cap

#### Step 2: Stakeholders
- Add multiple stakeholders
- Name and role (required)
- Email address (optional)
- Approval permissions flag

#### Step 3: Audiences
- Define target learner groups
- Audience name and size
- Device preferences (desktop, mobile, tablet, etc.)
- Accessibility requirements
- Language/locale needs

#### Step 4: Constraints
- Content languages selection
- Project timeline
- Budget range

**Auto-save:** Progress is saved after each step completion

### 3. Diagnostic Assessment
**Route:** `/needs-analysis/:id/diagnostic`

- Root cause analysis checklist
- Performance gap calculator
- Task inventory and analysis
- Training vs non-training decision tree

**Output:** Diagnostic report determining if training is the appropriate solution

### 4. Recommendation Generation
**Route:** `/needs-analysis/:id/recommendation`

- AI-powered recommendation engine
- Modality selection matrix
- Blended learning approach design
- Effort estimation
- Risk assessment

**Features:**
- Edit generated recommendations
- Add custom blend items
- Adjust estimates

### 5. Report Generation & Review
**Route:** `/needs-analysis/:id/report`

**Report Sections:**
- Executive Summary
- Business Context & Goals
- Audience Analysis
- Key Findings
- Recommended Solution
- Implementation Plan
- Budget & Timeline
- Risk Mitigation
- Success Metrics

**Actions:**
- Preview report
- Export to PDF
- Export to Word
- Request approval
- Share with stakeholders

### 6. Approval Workflow
- Designated approvers receive notification
- Review report online
- Approve/reject with comments
- Approval timestamp and user tracked

## Navigation Flow

```
Portal Dashboard
    └── Needs Analysis Card
        └── Needs Analysis Dashboard (/needs-analysis)
            ├── New Project → Intake Wizard
            └── Existing Project
                ├── Continue Intake
                ├── Diagnostic
                ├── Recommendations
                └── Report

Intake Wizard Flow:
Step 1 → Step 2 → Step 3 → Step 4 → Diagnostic
```

## Key User Actions

### Primary Actions
1. **Create Project** - Start new needs analysis
2. **Save Progress** - Auto-save at each step
3. **Run Analysis** - Execute diagnostic assessment
4. **Generate Report** - Create final deliverable
5. **Approve Report** - Sign off on recommendations

### Secondary Actions
- Edit project details
- Add/remove stakeholders
- Update audiences
- Regenerate recommendations
- Export reports
- Share with team

## Error States & Recovery

### Common Error Scenarios
1. **Incomplete Required Fields**
   - Inline validation messages
   - Prevent progression until resolved

2. **Session Timeout**
   - Auto-save prevents data loss
   - Resume from last saved state

3. **API Failures**
   - Retry mechanisms
   - User-friendly error messages
   - Fallback to saved data

### Recovery Flows
- Autosave every 30 seconds
- Manual save button available
- Draft status allows incomplete projects
- Resume wizard from any step

## Mobile Considerations
- Responsive design for tablets (minimum 800px)
- Touch-friendly UI elements
- Simplified navigation
- Collapsible sections for smaller screens

## Accessibility
- WCAG AA compliance
- Keyboard navigation support
- Screen reader compatible
- High contrast mode support
- Clear focus indicators
- Descriptive labels and ARIA attributes
