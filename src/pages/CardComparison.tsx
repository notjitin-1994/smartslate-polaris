import { useState } from 'react'
import StarmapJobCard from '@/components/StarmapJobCard'
import EnhancedStarmapCard from '@/components/EnhancedStarmapCard'
import type { StarmapJob } from '@/services/starmapJobsService'

// Sample data for demonstration
const sampleJob: StarmapJob = {
  id: 'demo-1',
  user_id: 'user-1',
  title: 'Digital Learning Transformation Strategy',
  status: 'processing',
  stage1_complete: true,
  stage2_complete: true,
  stage3_complete: false,
  dynamic_complete: false,
  stage1_data: {},
  stage2_data: {},
  stage3_data: {},
  dynamic_questions: [],
  dynamic_answers: {},
  preliminary_report: `# Digital Learning Transformation Report

## Delivery Plan

### Timeline
- **Phase 1: Discovery & Assessment** (2 weeks)
  Start: 2024-01-15 → End: 2024-01-29
- **Phase 2: Design & Development** (4 weeks)
  Start: 2024-01-30 → End: 2024-02-27
- **Phase 3: Implementation & Rollout** (8 weeks)
  Start: 2024-02-28 → End: 2024-04-24

## Success Metrics

- **Course Completion Rate**: Baseline: null · Target: 80% · by 2025-10-31
- **Cross-functional Project Participation**: Baseline: null · Target: 10% increase · by 2025-10-31
- **Manager Confidence in Hybrid Leadership**: Baseline: null · Target: 75%+ self-reported · by 2025-10-31

## Risks

- **Risk: No internal SMEs identified** · Mitigation: Partner with external consultants
- **Risk: LMS technical limitations reduce engagement** · Mitigation: Implement workarounds and user training
- **Risk: Limited technical skills in learner base** · Mitigation: Provide pre-training support modules`,
  report_job_progress: 40,
  created_at: '2024-01-10T10:00:00Z',
  updated_at: '2024-01-15T14:30:00Z',
  session_state: {},
  last_saved_at: '2024-01-15T14:30:00Z',
  
}

const completedJob: StarmapJob = {
  ...sampleJob,
  id: 'demo-2',
  title: 'Employee Onboarding Excellence Program',
  status: 'completed',
  stage1_complete: true,
  stage2_complete: true,
  stage3_complete: true,
  dynamic_complete: true,
  final_report: sampleJob.preliminary_report,
  report_job_progress: 100,
  completed_at: '2024-01-20T16:00:00Z'
}

export default function CardComparison() {
  const [showOld, setShowOld] = useState(true)
  const [showNew, setShowNew] = useState(true)

  return (
    <div className="min-h-screen bg-[rgb(var(--bg))] text-white p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-heading font-bold mb-2">Starmap Card Design Comparison</h1>
        <p className="text-white/60 mb-8">Compare the original and enhanced card designs side by side</p>

        {/* Controls */}
        <div className="flex gap-4 mb-8">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={showOld}
              onChange={(e) => setShowOld(e.target.checked)}
              className="rounded"
            />
            <span>Show Original Design</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={showNew}
              onChange={(e) => setShowNew(e.target.checked)}
              className="rounded"
            />
            <span>Show Enhanced Design</span>
          </label>
        </div>

        {/* Comparison Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Original Design */}
          {showOld && (
            <div>
              <h2 className="text-xl font-semibold mb-4 text-white/80">Original Design</h2>
              <div className="space-y-6">
                <StarmapJobCard
                  job={sampleJob}
                  onView={() => console.log('View')}
                  onResume={() => console.log('Resume')}
                  onDelete={() => console.log('Delete')}
                  deleting={false}
                />
                <StarmapJobCard
                  job={completedJob}
                  onView={() => console.log('View')}
                  onResume={() => console.log('Resume')}
                  onDelete={() => console.log('Delete')}
                  deleting={false}
                />
              </div>
            </div>
          )}

          {/* Enhanced Design */}
          {showNew && (
            <div>
              <h2 className="text-xl font-semibold mb-4 text-white/80">Enhanced Design</h2>
              <div className="space-y-6">
                <EnhancedStarmapCard
                  job={sampleJob}
                  onView={() => console.log('View')}
                  onResume={() => console.log('Resume')}
                  onDelete={() => console.log('Delete')}
                  deleting={false}
                />
                <EnhancedStarmapCard
                  job={completedJob}
                  onView={() => console.log('View')}
                  onResume={() => console.log('Resume')}
                  onDelete={() => console.log('Delete')}
                  deleting={false}
                />
              </div>
            </div>
          )}
        </div>

        {/* Feature Comparison Table */}
        <div className="mt-16">
          <h2 className="text-2xl font-semibold mb-6">Feature Comparison</h2>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b border-white/20">
                  <th className="text-left py-3 px-4">Feature</th>
                  <th className="text-left py-3 px-4">Original</th>
                  <th className="text-left py-3 px-4">Enhanced</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-white/10">
                  <td className="py-3 px-4 font-medium">Timeline Visualization</td>
                  <td className="py-3 px-4 text-white/60">Basic list with duration bars</td>
                  <td className="py-3 px-4 text-green-400">Animated timeline with phase connections</td>
                </tr>
                <tr className="border-b border-white/10">
                  <td className="py-3 px-4 font-medium">Success Metrics</td>
                  <td className="py-3 px-4 text-white/60">Text-based with simple progress bars</td>
                  <td className="py-3 px-4 text-green-400">Progress bars with baseline/target indicators</td>
                </tr>
                <tr className="border-b border-white/10">
                  <td className="py-3 px-4 font-medium">Risk Analysis</td>
                  <td className="py-3 px-4 text-white/60">List with severity bars</td>
                  <td className="py-3 px-4 text-green-400">Color-coded severity with impact meters</td>
                </tr>
                <tr className="border-b border-white/10">
                  <td className="py-3 px-4 font-medium">Progress Indicator</td>
                  <td className="py-3 px-4 text-white/60">Small progress ring</td>
                  <td className="py-3 px-4 text-green-400">Large animated progress ring with gradient</td>
                </tr>
                <tr className="border-b border-white/10">
                  <td className="py-3 px-4 font-medium">Icons</td>
                  <td className="py-3 px-4 text-white/60">Basic SVG icons</td>
                  <td className="py-3 px-4 text-green-400">Material UI-style icons</td>
                </tr>
                <tr className="border-b border-white/10">
                  <td className="py-3 px-4 font-medium">Typography</td>
                  <td className="py-3 px-4 text-white/60">Default system fonts</td>
                  <td className="py-3 px-4 text-green-400">Quicksand headings + Lato body</td>
                </tr>
                <tr className="border-b border-white/10">
                  <td className="py-3 px-4 font-medium">Animations</td>
                  <td className="py-3 px-4 text-white/60">Basic transitions</td>
                  <td className="py-3 px-4 text-green-400">Smooth micro-interactions</td>
                </tr>
                <tr className="border-b border-white/10">
                  <td className="py-3 px-4 font-medium">Color Scheme</td>
                  <td className="py-3 px-4 text-white/60">Standard colors</td>
                  <td className="py-3 px-4 text-green-400">Brand-aligned gradients</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Key Improvements */}
        <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="glass-card rounded-xl p-6 border border-primary-400/30">
            <h3 className="font-heading font-semibold text-lg mb-3">🎯 Data Visualization</h3>
            <p className="text-white/70 text-sm">
              Enhanced with proper infographics including animated timelines, progress gauges, and risk heat maps that provide instant visual understanding.
            </p>
          </div>
          <div className="glass-card rounded-xl p-6 border border-primary-400/30">
            <h3 className="font-heading font-semibold text-lg mb-3">🎨 Brand Alignment</h3>
            <p className="text-white/70 text-sm">
              Consistent use of brand colors (primary teal/cyan, secondary indigo), Quicksand and Lato typography, and Material UI-inspired icons.
            </p>
          </div>
          <div className="glass-card rounded-xl p-6 border border-primary-400/30">
            <h3 className="font-heading font-semibold text-lg mb-3">✨ User Experience</h3>
            <p className="text-white/70 text-sm">
              Improved information hierarchy, smooth animations, hover effects, and expandable sections for better interaction and engagement.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
