import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { saveSummary } from '@/services/polarisSummaryService'
import { useAuth } from '@/contexts/AuthContext'

export default function SeedJitinStarmap() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [status, setStatus] = useState<string>('Preparing…')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function run() {
      try {
        if (!user) {
          setStatus('Redirecting to login…')
          navigate('/login')
          return
        }

        setStatus('Creating starmap…')

        const title = 'Smartslate | Jitin Nair – Founder (India)'

        // Showcase markdown that exercises icons, sections, lists, timeline, risks, etc.
        const reportMd = `# Learning & Development Starmap Report

## Executive Summary

**Problem Statement:** Smartslate is scaling rapidly and needs a repeatable, high-quality enablement engine that accelerates delivery, reduces rework, and drives measurable client outcomes.

**Current State:**
- Project knowledge is dispersed across tools; onboarding new team members takes time
- Content is created ad‑hoc per deal; limited reuse and version control
- Metrics exist but are not consistently tied to business outcomes

**Root Causes:**
- Fragmented content pipeline and tooling
- Insufficient standardization for templates, QA, and accessibility
- Underutilized analytics for evidence‑based iteration

**Objectives:**
- Reduce time‑to‑readiness for new team members by 50%
- Increase content reuse by 40% via modular design system
- Achieve 90% stakeholder satisfaction and demonstrable client impact

## Business Objectives & Requirements

### Delivery Modalities
- **Blended Learning**: Cohort kickoffs + async microlearning for velocity
- **Workshops**: High‑leverage facilitation for alignment and hands‑on practice
- **Online Academy**: Always‑on, role‑based pathways with just‑in‑time search
- **Coaching**: Targeted performance support for leads and facilitators

### Scope

**Target Audiences:**
- Solution architects, project managers, and LXD practitioners
- Client‑facing leads and facilitators
- New contributors joining delivery teams

**Key Competencies:**
- Modular content design and reusability
- AI‑assisted authoring and QA workflows
- Data‑informed iteration and outcome mapping

**Content Outline:**
- Polaris Discovery Masterclass (case‑based)
- Authoring System: Templates, blocks, and patterns library
- Quality Framework: Accessibility, localization, assessment
- Analytics Playbook: Metrics, dashboards, and decision loops

## Learner Analysis

### Learner Profile
**Demographics:**
- Global, cross‑functional, mixed seniority
- Distributed teams working across time zones

**Technology Readiness:** High; daily use of modern SaaS and AI tools

**Learning Style Preferences:**
- Short, contextual, searchable learning objects
- Practice‑first with job‑embedded tasks

### Engagement Strategy
**Motivation Drivers:**
- Faster delivery, higher quality, client impact visibility

**Potential Barriers:**
- Time constraints during active projects; context switching

**Support Mechanisms:**
- Cohort cadence, office hours, peer review circles, exemplars

### Design Implications
**Content Adaptations:**
- Bite‑sized modules with embedded checklists and templates

**Delivery Adjustments:**
- Flipped workshops + async prep; recordings with chapter markers

**Accessibility Requirements:**
- WCAG‑aligned media, captions, transcripts, keyboard navigation

**Language Considerations:**
- Simplified English; glossary; localization‑ready strings

## Technology & Talent Analysis

### Technology Enablers
**Available Technologies:**
- Supabase, Vite/React, TailwindCSS, Perplexity, OpenAI/Anthropic

**Required Technologies:**
- Media CDN, analytics warehouse, feature‑flagged experimentation

**Integration Requirements:**
- SSO, RBAC, doc store, and content versioning

### Talent Requirements
**Internal Roles Needed:**
- LXDs, facilitators, QA editors, data analyst

**External Support Required:**
- Accessibility audit, localization vendor

**Skills Development Needs:**
- Advanced prompt engineering, measurement strategy, scripting automations

### Limitations & Mitigation
**Technology Constraints:**
- Model/token limits, rate caps, content security

**Talent Gaps Impact:**
- Throughput variability; knowledge silos

**Mitigation Strategies:**
- Content patterns, checklists, and pair‑review system; gradual automation

## Delivery Plan

### Phases

**Phase 1: Foundation** (3 weeks)
Goals:
- Stand up patterns library and QA checklist
- Pilot cohort for Polaris Discovery
Activities:
- Build templates; seed exemplars; run kickoff workshop

**Phase 2: Scale** (6 weeks)
Goals:
- Launch role‑based pathways and analytics v1
- Enable coaching for facilitators and leads
Activities:
- Publish microlearning; configure dashboards; run practice labs

**Phase 3: Optimize** (4 weeks)
Goals:
- Automate authoring and reviews; close feedback loop
- Expand localization and accessibility coverage
Activities:
- Add AI editor guardrails; refine rubrics; ship v2 dashboards

### Timeline
- **Wave 1 (Pilot):** 2025-09-01 to 2025-09-21
- **Wave 2 (Scale):** 2025-09-22 to 2025-11-02
- **Wave 3 (Optimize):** 2025-11-03 to 2025-11-30

### Resources Needed
- Patterns library, exemplar gallery, facilitator time, analytics stack

## Measurement & Success

**Success Metrics:**
- Time‑to‑readiness ↓ 50%
- Reuse ratio ↑ 40%
- Stakeholder satisfaction ≥ 90%
- Client‑impact case studies per quarter ≥ 3

**Assessment Strategy:**
- Productized rubrics, scenario checks, portfolio evidence

**Data Sources:**
- LMS/LXP events, Git history, PR metadata, surveys, delivery KPIs

## Budget Considerations

Establish a lean baseline; scale with measurable ROI.
- **Content Development:** $25k – $45k
- **Workshops & Coaching:** $15k – $35k
- **Analytics & Tooling:** $10k – $25k

## Risk Mitigation

- **Risk:** Team bandwidth conflicts during active deliveries
  **Mitigation:** Flipped model with async prep; recorded sessions; staggered cohorts
- **Risk:** Tool fragmentation and duplicated content
  **Mitigation:** Central patterns library; versioned blocks; strict naming
- **Risk:** Inconsistent measurement across teams
  **Mitigation:** Standard metric set; shared dashboards; monthly reviews

## Next Steps

1. Confirm audiences and success metrics with stakeholders
2. Approve initial content patterns and QA rubric
3. Schedule pilot cohort and facilitators
4. Stand up analytics dashboards (v1)
5. Begin exemplar collection and curation`

        const prelim = `# Preliminary Master Report\n\n- Research synthesis for Smartslate and L&D enablement engine\n- Validated by: Jitin Nair (Founder, India)\n- Notes: Use this prelim as context for the final Starmap.`

        const { data, error } = await saveSummary({
          company_name: 'Smartslate',
          report_title: title,
          summary_content: reportMd,
          prelim_report: prelim,
          stage1_answers: { requester_name: 'Jitin Nair', requester_role: 'Founder', requester_department: 'Executive', requester_email: 'jitin@smartslate.io' },
          stage2_answers: { org_name: 'Smartslate', org_industry: 'Technology', org_size: '11-50', org_headquarters: 'India', org_website: 'https://smartslate.io' },
          stage3_answers: { project_objectives: 'Scale enablement with measurable impact', project_budget_range: '$50k-$100k' },
          stage2_questions: [],
          stage3_questions: [],
          greeting_report: 'Context: Founder‑led, productized services, quality + velocity focus.',
          org_report: 'Smartslate builds AI‑assisted authoring and consulting accelerators.',
          requirement_report: 'Need modularity, measurement, and enablement at scale.'
        })

        if (error || !data) {
          setError(error?.message || 'Failed to create starmap')
          setStatus('Error')
          return
        }

        setStatus('Redirecting…')
        navigate(`/starmaps/${data.id}`, { replace: true })
      } catch (e: any) {
        setError(e?.message || 'Unexpected error')
        setStatus('Error')
      }
    }
    void run()
  }, [user, navigate])

  return (
    <div className="px-6 py-8">
      <div className="glass-card p-6">
        <h1 className="text-xl font-semibold text-white">Seeding Jitin's Starmap</h1>
        <p className="text-sm text-white/70 mt-2">{status}</p>
        {error && <p className="text-sm text-red-300 mt-2">{error}</p>}
      </div>
    </div>
  )
}


