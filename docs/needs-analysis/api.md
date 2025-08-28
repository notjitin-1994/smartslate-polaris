# Needs Analysis API Documentation

## Overview
The Needs Analysis API provides endpoints for managing training needs analysis projects, including intake, diagnostics, recommendations, and reporting.

## Authentication
All API endpoints require authentication via Bearer token in the Authorization header:
```
Authorization: Bearer <supabase_access_token>
```

## Base URL
Development: `http://localhost:5173/api/needs`
Production: `https://your-domain.com/api/needs`

## Endpoints

### Projects

#### List Projects
```http
GET /api/needs/projects
```

Returns all projects for the authenticated user.

**Response:**
```json
{
  "projects": [
    {
      "id": "uuid",
      "title": "Customer Service Training",
      "business_goal": "Improve customer satisfaction",
      "status": "draft",
      "created_at": "2024-01-01T00:00:00Z"
    }
  ]
}
```

#### Create Project
```http
POST /api/needs/projects
```

Creates a new needs analysis project.

**Request Body:**
```json
{
  "title": "Customer Service Training",
  "business_goal": "Improve customer satisfaction scores by 20%",
  "success_metrics": {
    "csat_target": "90%",
    "response_time": "< 2 minutes"
  },
  "deadline": "2024-06-01",
  "budget_cap": 50000,
  "languages": ["en", "es"]
}
```

**Response:**
```json
{
  "project": {
    "id": "uuid",
    "user_id": "user-uuid",
    "title": "Customer Service Training",
    "status": "draft",
    "created_at": "2024-01-01T00:00:00Z"
  }
}
```

#### Get Project Details
```http
GET /api/needs/projects/:id
```

Returns complete project details including all related data.

**Response:**
```json
{
  "project": { /* project data */ },
  "stakeholders": [ /* array of stakeholders */ ],
  "audiences": [ /* array of audiences */ ],
  "tasks": [ /* array of task items */ ],
  "recommendation": { /* recommendation data */ },
  "blendItems": [ /* array of blend items */ ],
  "estimate": { /* estimate data */ },
  "risks": [ /* array of risks */ ],
  "artifacts": [ /* array of artifacts */ ]
}
```

#### Update Project
```http
PATCH /api/needs/projects/:id
```

Updates project fields.

**Request Body:**
```json
{
  "title": "Updated Title",
  "status": "in_progress"
}
```

#### Delete Project
```http
DELETE /api/needs/projects/:id
```

Deletes a project and all related data (cascade delete).

### Analysis

#### Run Diagnostic Analysis
```http
POST /api/needs/projects/:id/analyze
```

Analyzes root causes and determines training vs non-training solutions.

**Response:**
```json
{
  "isTrainingSolution": true,
  "recommendation": "training",
  "rationale": "Root cause analysis indicates...",
  "performanceGap": {
    "current": 15.5,
    "target": 5.0,
    "gap": 10.5
  },
  "rootCauses": ["knowledge", "skills", "practice"]
}
```

#### Generate Recommendation
```http
POST /api/needs/projects/:id/recommend
```

Generates AI-powered training recommendations.

**Request Body:**
```json
{
  "analysisResults": { /* diagnostic results */ },
  "preferences": {
    "modalityPreference": "blended",
    "timeConstraints": "urgent"
  }
}
```

### Report

#### Get Report HTML
```http
GET /api/needs/projects/:id/report
```

Returns the formatted HTML report.

**Response:**
HTML content as text/html

#### Approve Project
```http
POST /api/needs/projects/:id/approve
```

Marks the project and latest report as approved.

**Response:**
```json
{
  "success": true,
  "approvedAt": "2024-01-01T00:00:00Z"
}
```

### Related Entities

#### Add Stakeholder
```http
POST /api/needs/projects/:id/stakeholders
```

**Request Body:**
```json
{
  "name": "John Doe",
  "role": "Project Sponsor",
  "email": "john@company.com",
  "is_approver": true
}
```

#### Add Audience
```http
POST /api/needs/projects/:id/audiences
```

**Request Body:**
```json
{
  "name": "Customer Service Reps",
  "size": 150,
  "devices": ["desktop", "mobile"],
  "accessibility_needs": ["screen_reader"],
  "locales": ["en-US", "es-ES"]
}
```

#### Add Task
```http
POST /api/needs/projects/:id/tasks
```

**Request Body:**
```json
{
  "name": "Handle customer complaints",
  "frequency": "daily",
  "impact": "high",
  "current_error_rate": 15,
  "target_error_rate": 5,
  "root_causes": ["knowledge", "process"]
}
```

## Error Responses

All endpoints return consistent error responses:

```json
{
  "error": "Error message"
}
```

Common HTTP status codes:
- 400: Bad Request (invalid input)
- 401: Unauthorized (missing/invalid token)
- 404: Not Found (resource doesn't exist)
- 500: Internal Server Error

## Rate Limiting
Currently no rate limiting is implemented. This should be added before production deployment.

## Webhooks
Future enhancement: Add webhook support for project status changes and approvals.
