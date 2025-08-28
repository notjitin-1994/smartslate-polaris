# Needs Analysis Data Model

## Entity Relationship Diagram

```mermaid
erDiagram
    needs_projects ||--o{ needs_stakeholders : has
    needs_projects ||--o{ needs_audiences : has
    needs_projects ||--o{ needs_task_items : has
    needs_projects ||--o| needs_recommendations : has
    needs_projects ||--o| needs_estimates : has
    needs_projects ||--o{ needs_risks : has
    needs_projects ||--o{ needs_artifacts : has
    needs_recommendations ||--o{ needs_blend_items : contains
    
    needs_projects {
        uuid id PK
        uuid user_id FK
        text title
        text business_goal
        jsonb success_metrics
        date deadline
        numeric budget_cap
        text[] languages
        text status
        timestamptz created_at
        timestamptz updated_at
    }
    
    needs_stakeholders {
        uuid id PK
        uuid project_id FK
        text name
        text role
        text email
        boolean is_approver
        timestamptz created_at
    }
    
    needs_audiences {
        uuid id PK
        uuid project_id FK
        text name
        integer size
        text[] devices
        text[] accessibility_needs
        text[] locales
        timestamptz created_at
    }
    
    needs_task_items {
        uuid id PK
        uuid project_id FK
        text name
        text frequency
        text impact
        numeric current_error_rate
        numeric target_error_rate
        text[] root_causes
        timestamptz created_at
    }
    
    needs_recommendations {
        uuid id PK
        uuid project_id FK
        text rationale
        text status
        timestamptz created_at
        timestamptz updated_at
    }
    
    needs_blend_items {
        uuid id PK
        uuid recommendation_id FK
        text type
        jsonb parameters
        integer order_index
        timestamptz created_at
    }
    
    needs_estimates {
        uuid id PK
        uuid project_id FK
        jsonb assumptions
        jsonb effort_hours
        integer timeline_days
        numeric total_cost
        timestamptz created_at
    }
    
    needs_risks {
        uuid id PK
        uuid project_id FK
        text name
        text mitigation
        text severity
        timestamptz created_at
    }
    
    needs_artifacts {
        uuid id PK
        uuid project_id FK
        text kind
        text url
        integer version
        timestamptz approved_at
        uuid approved_by FK
        timestamptz created_at
    }
```

## Table Descriptions

### needs_projects
Core project entity containing high-level information about the needs analysis.

**Key Fields:**
- `status`: Tracks project lifecycle (draft → in_progress → completed → approved)
- `success_metrics`: Flexible JSON storage for KPIs
- `languages`: Array of ISO language codes

### needs_stakeholders
People involved in or impacted by the training initiative.

**Key Fields:**
- `is_approver`: Boolean flag for approval permissions
- Links to project via foreign key

### needs_audiences
Target learner groups with their characteristics.

**Key Fields:**
- `devices`: Array of device types (desktop, mobile, tablet, etc.)
- `accessibility_needs`: WCAG requirements
- `locales`: Language/region combinations

### needs_task_items
Specific tasks being analyzed for performance improvement.

**Key Fields:**
- `frequency`: How often the task is performed
- `impact`: Business criticality rating
- `root_causes`: Array of identified issues

### needs_recommendations
AI-generated or manually created training recommendations.

**Key Fields:**
- `rationale`: Explanation of why this approach is recommended
- One-to-one relationship with project

### needs_blend_items
Individual components of a blended learning solution.

**Key Fields:**
- `type`: Learning modality (microlearning, job_aid, ilt, etc.)
- `parameters`: Flexible JSON for modality-specific data
- `order_index`: Sequence in the learning path

### needs_estimates
Cost and timeline projections.

**Key Fields:**
- `effort_hours`: JSON breakdown by role
- `assumptions`: Array of estimation assumptions

### needs_risks
Identified project risks and mitigation strategies.

**Key Fields:**
- `severity`: Risk level (low, medium, high)
- `mitigation`: Proposed risk reduction approach

### needs_artifacts
Generated deliverables (reports, statements of work, etc.).

**Key Fields:**
- `kind`: Type of artifact
- `version`: Supports multiple versions
- `approved_at/by`: Approval tracking

## Indexes

Performance indexes are created on:
- All foreign key columns
- Project status field
- User ID for fast project listing

## Row Level Security

All tables have RLS enabled with policies ensuring:
- Users can only access their own projects
- Related data accessible via project ownership
- No cross-user data leakage

## Data Relationships

### One-to-Many
- Project → Stakeholders
- Project → Audiences  
- Project → Task Items
- Project → Risks
- Project → Artifacts
- Recommendation → Blend Items

### One-to-One
- Project → Recommendation
- Project → Estimate

## JSON Field Schemas

### success_metrics
```json
{
  "metric_name": "target_value",
  "customer_satisfaction": "90%",
  "error_reduction": "50%"
}
```

### effort_hours
```json
{
  "instructionalDesign": 120,
  "contentDevelopment": 180,
  "mediaProduction": 60,
  "qualityAssurance": 40,
  "projectManagement": 30,
  "total": 430
}
```

### blend_item parameters
```json
{
  "duration": "30 minutes",
  "format": "video",
  "interactions": ["quiz", "scenario"],
  "deliveryMethod": "self-paced"
}
```
