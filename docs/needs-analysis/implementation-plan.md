# Needs Analysis Implementation Plan

## Executive Summary
This plan outlines the implementation of a production-grade "Needs Analysis" feature for Learning/Instructional Designers. The feature will provide an end-to-end workflow from intake through diagnostic assessment to recommendation generation and report creation with approval capabilities.

## Architecture Overview

### Technology Decisions
- **Frontend**: React + TypeScript (existing stack)
- **Routing**: React Router with lazy loading
- **Database**: Supabase (PostgreSQL)
- **Styling**: Tailwind CSS
- **PDF Generation**: html2canvas + jspdf (existing libs)
- **State Management**: React Context + Supabase
- **Feature Flags**: Environment variable based

### Key Design Principles
1. **Leverage Existing Code**: Build upon existing needs-analysis components
2. **Incremental Enhancement**: Add new capabilities without breaking existing features
3. **Type Safety**: Full TypeScript coverage
4. **Accessibility**: WCAG AA compliance from the start
5. **Performance**: Lazy loading and code splitting

## Data Model

### New Database Tables
```sql
-- Projects table
create table needs_projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) not null,
  title text not null,
  business_goal text,
  success_metrics jsonb default '{}',
  deadline date,
  budget_cap numeric,
  languages text[] default '{}',
  status text default 'draft',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Stakeholders
create table needs_stakeholders (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references needs_projects(id) on delete cascade,
  name text not null,
  role text not null,
  email text,
  is_approver boolean default false,
  created_at timestamptz default now()
);

-- Audiences
create table needs_audiences (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references needs_projects(id) on delete cascade,
  name text not null,
  size integer,
  devices text[] default '{}',
  accessibility_needs text[] default '{}',
  locales text[] default '{}',
  created_at timestamptz default now()
);

-- Task Analysis Items
create table needs_task_items (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references needs_projects(id) on delete cascade,
  name text not null,
  frequency text check (frequency in ('daily', 'weekly', 'monthly', 'quarterly', 'yearly')),
  impact text check (impact in ('low', 'medium', 'high', 'critical')),
  current_error_rate numeric,
  target_error_rate numeric,
  root_causes text[] default '{}',
  created_at timestamptz default now()
);

-- Recommendations
create table needs_recommendations (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references needs_projects(id) on delete cascade,
  rationale text not null,
  status text default 'draft',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Blend Items
create table needs_blend_items (
  id uuid primary key default gen_random_uuid(),
  recommendation_id uuid references needs_recommendations(id) on delete cascade,
  type text check (type in ('microlearning', 'guided_practice', 'job_aid', 'ilt', 'vilt', 'simulation')),
  parameters jsonb default '{}',
  order_index integer default 0,
  created_at timestamptz default now()
);

-- Estimates
create table needs_estimates (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references needs_projects(id) on delete cascade,
  assumptions jsonb default '{}',
  effort_hours jsonb default '{}',
  timeline_days integer,
  total_cost numeric,
  created_at timestamptz default now()
);

-- Risks
create table needs_risks (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references needs_projects(id) on delete cascade,
  name text not null,
  mitigation text,
  severity text check (severity in ('low', 'medium', 'high')),
  created_at timestamptz default now()
);

-- Artifacts
create table needs_artifacts (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references needs_projects(id) on delete cascade,
  kind text check (kind in ('report', 'sow', 'charter')),
  url text,
  version integer default 1,
  approved_at timestamptz,
  approved_by uuid references auth.users(id),
  created_at timestamptz default now()
);
```

## Implementation Phases

### Phase 1: Foundation (Week 1)
1. **Feature Flag Setup**
   - Add `VITE_NEEDS_ANALYSIS_ENABLED` to env.example
   - Create feature gate component
   - Add conditional routing

2. **Database Schema**
   - Create migration files
   - Generate TypeScript types
   - Add RLS policies

3. **Service Layer**
   - Create `needsAnalysisService.ts`
   - Implement CRUD operations
   - Add error handling

### Phase 2: Intake Wizard (Week 1-2)
1. **Wizard Component**
   - Multi-step form with progress indicator
   - Auto-save on step change
   - Validation at each step

2. **Steps**
   - Business Context (goal, metrics, deadline)
   - Stakeholder Management (inline add/edit)
   - Audience Definition
   - Constraints (budget, timeline, languages)

### Phase 3: Diagnostic Flow (Week 2)
1. **Training vs Non-Training Analysis**
   - Root cause checklist
   - Performance gap calculator
   - Decision tree logic

2. **Task Analysis**
   - Task inventory form
   - Frequency/impact matrix
   - Error rate tracking

### Phase 4: Recommendation Engine (Week 2-3)
1. **Modality Selection**
   - Rule-based algorithm
   - Blend composition
   - Rationale generation

2. **Estimation Logic**
   - Coefficient-based calculations
   - Role-based effort distribution
   - Timeline generation

### Phase 5: Report Generation (Week 3)
1. **HTML Report Template**
   - Executive summary
   - Findings section
   - Recommendation details
   - Scope & estimates

2. **PDF Export**
   - Integrate with existing PDF generation
   - Styled output matching brand

3. **Approval Workflow**
   - Request approval button
   - Timestamp and user tracking
   - Email notifications (future)

## API Design

### RESTful Endpoints
```typescript
// Project Management
POST   /api/needs/projects          // Create project
GET    /api/needs/projects          // List projects
GET    /api/needs/projects/:id      // Get project details
PATCH  /api/needs/projects/:id      // Update project
DELETE /api/needs/projects/:id      // Delete project

// Wizard Data
POST   /api/needs/projects/:id/stakeholders
POST   /api/needs/projects/:id/audiences
POST   /api/needs/projects/:id/tasks

// Analysis & Generation
POST   /api/needs/projects/:id/analyze      // Run diagnostic
POST   /api/needs/projects/:id/recommend    // Generate recommendation
GET    /api/needs/projects/:id/report       // Get report HTML
POST   /api/needs/projects/:id/approve      // Approve report
```

## UI/UX Flow

### Navigation Structure
```
/needs-analysis                     // Project list dashboard
/needs-analysis/new                 // Start new analysis
/needs-analysis/:id                 // Project overview
/needs-analysis/:id/intake          // Intake wizard
/needs-analysis/:id/diagnostic      // Diagnostic assessment  
/needs-analysis/:id/recommendation  // View/edit recommendation
/needs-analysis/:id/report          // Final report view
```

### Component Structure
```
src/features/needs-analysis/
├── components/
│   ├── NeedsWizard/
│   │   ├── WizardProgress.tsx
│   │   ├── BusinessContextStep.tsx
│   │   ├── StakeholderStep.tsx
│   │   ├── AudienceStep.tsx
│   │   └── ConstraintsStep.tsx
│   ├── Diagnostic/
│   │   ├── RootCauseAnalysis.tsx
│   │   ├── PerformanceGap.tsx
│   │   └── TaskInventory.tsx
│   ├── Recommendation/
│   │   ├── ModalityMatrix.tsx
│   │   ├── BlendEditor.tsx
│   │   └── RationaleEditor.tsx
│   └── Report/
│       ├── ReportViewer.tsx
│       ├── ReportPDF.tsx
│       └── ApprovalFlow.tsx
├── hooks/
│   ├── useNeedsProject.ts
│   ├── useWizardState.ts
│   └── useEstimator.ts
├── services/
│   ├── needsAnalysisService.ts
│   ├── estimatorService.ts
│   └── reportService.ts
└── types/
    └── needs-analysis.types.ts
```

## Testing Strategy

### Unit Tests
- Estimator calculations
- Training/non-training decision logic
- Data validation functions

### Integration Tests
- API endpoint testing
- Database operations
- Report generation

### E2E Tests
- Complete wizard flow
- Report generation and export
- Approval workflow

## Rollout Plan

1. **Feature Flag Deployment**
   - Deploy with feature disabled
   - Enable for internal testing
   - Gradual rollout to users

2. **Migration Strategy**
   - No data migration needed (new feature)
   - Backward compatible with existing code

3. **Monitoring**
   - Track feature usage
   - Monitor performance metrics
   - Collect user feedback

## Success Metrics

1. **Technical**
   - Page load time < 2s
   - API response time < 500ms
   - Zero critical bugs

2. **Business**
   - Project completion rate > 80%
   - Report generation success > 95%
   - User satisfaction > 4/5

## Risk Mitigation

1. **Technical Risks**
   - Large report generation: Implement pagination
   - Complex calculations: Cache results
   - Database performance: Add indexes

2. **User Experience Risks**
   - Long wizard: Save progress, allow resume
   - Complex UI: Progressive disclosure
   - Mobile experience: Responsive design

## Next Steps

1. Create feature branch
2. Set up database migrations
3. Implement service layer
4. Build UI components incrementally
5. Add tests alongside development
6. Document API and user flows
7. Prepare PR with screenshots
