import { useState } from 'react'
import { motion } from 'framer-motion'
import { DynamicQuestionInput } from './DynamicQuestionInput'
import type { DynamicQuestion } from './types'

// Demo questions showcasing all the enhanced UI components
const demoQuestions: DynamicQuestion[] = [
  {
    id: 'multi_select_demo',
    type: 'multi_select',
    text: 'What are your primary learning objectives?',
    help: 'Select all that apply. You can choose multiple options.',
    required: true,
    options: [
      { value: 'technical_skills', label: 'Technical Skills Development' },
      { value: 'leadership', label: 'Leadership & Management' },
      { value: 'communication', label: 'Communication & Presentation' },
      { value: 'innovation', label: 'Innovation & Creative Thinking' },
      { value: 'data_analysis', label: 'Data Analysis & Insights' },
      { value: 'project_management', label: 'Project Management' }
    ],
    validation: { max: 4 }
  },
  {
    id: 'single_select_demo',
    type: 'single_select',
    text: 'What is your preferred learning format?',
    help: 'Choose the format that works best for you',
    required: true,
    options: [
      { value: 'self_paced', label: 'Self-Paced Online', description: 'Learn at your own speed with recorded content' },
      { value: 'live_virtual', label: 'Live Virtual Sessions', description: 'Real-time interaction with instructors' },
      { value: 'hybrid', label: 'Hybrid Model', description: 'Mix of online and in-person' },
      { value: 'in_person', label: 'In-Person Workshop', description: 'Traditional classroom experience' }
    ]
  },
  {
    id: 'boolean_demo',
    type: 'boolean',
    text: 'Do you have prior experience in this domain?',
    help: 'This helps us customize the content level',
    required: true
  },
  {
    id: 'toggle_demo',
    type: 'toggle',
    text: 'Enable email notifications?',
    help: 'Get updates about your learning progress',
    metadata: {
      toggleLabels: { on: 'Enabled', off: 'Disabled' }
    }
  },
  {
    id: 'slider_demo',
    type: 'slider',
    text: 'How many hours per week can you dedicate to learning?',
    help: 'Move the slider to indicate your availability',
    validation: { min: 0, max: 20, step: 1 },
    default: 5
  },
  {
    id: 'text_demo',
    type: 'text',
    text: 'What is your current role?',
    placeholder: 'e.g., Senior Software Engineer',
    required: true
  },
  {
    id: 'email_demo',
    type: 'email',
    text: 'Work email address',
    placeholder: 'you@company.com',
    required: true
  },
  {
    id: 'url_demo',
    type: 'url',
    text: 'LinkedIn profile (optional)',
    placeholder: 'https://linkedin.com/in/yourprofile'
  },
  {
    id: 'number_demo',
    type: 'number',
    text: 'Team size',
    placeholder: 'Number of team members',
    validation: { min: 1, max: 1000 }
  },
  {
    id: 'date_demo',
    type: 'date',
    text: 'Preferred start date',
    help: 'When would you like to begin?',
    required: true
  },
  {
    id: 'textarea_demo',
    type: 'textarea',
    text: 'Tell us about your learning goals',
    placeholder: 'Share your objectives and what you hope to achieve...',
    help: 'Be as specific as possible to help us tailor the experience',
    validation: { maxLength: 500 }
  },
  {
    id: 'select_many_demo',
    type: 'single_select',
    text: 'Select your timezone',
    placeholder: 'Choose your timezone',
    options: [
      { value: 'pst', label: 'Pacific Time (PST)' },
      { value: 'mst', label: 'Mountain Time (MST)' },
      { value: 'cst', label: 'Central Time (CST)' },
      { value: 'est', label: 'Eastern Time (EST)' },
      { value: 'gmt', label: 'Greenwich Mean Time (GMT)' },
      { value: 'cet', label: 'Central European Time (CET)' },
      { value: 'ist', label: 'India Standard Time (IST)' },
      { value: 'jst', label: 'Japan Standard Time (JST)' },
      { value: 'aest', label: 'Australian Eastern Time (AEST)' }
    ]
  },
  {
    id: 'tags_demo',
    type: 'tags',
    text: 'What skills do you want to develop?',
    placeholder: 'Type a skill and press Enter',
    help: 'Add up to 5 relevant skills',
    validation: { maxTags: 5 },
    metadata: {
      suggestions: [
        'Python', 'JavaScript', 'React', 'Node.js', 'Machine Learning',
        'Data Science', 'UI/UX Design', 'Project Management', 'Leadership',
        'Communication', 'Problem Solving', 'Critical Thinking'
      ]
    }
  },
  {
    id: 'rating_demo',
    type: 'rating',
    text: 'How would you rate your current expertise level?',
    help: 'Be honest - this helps us tailor the content',
    validation: { max: 5 },
    metadata: {
      labels: ['Beginner', 'Novice', 'Intermediate', 'Advanced', 'Expert']
    }
  },
  {
    id: 'time_demo',
    type: 'time',
    text: 'What is your preferred session start time?',
    help: 'Select the best time for live sessions',
    default: '09:00',
    metadata: {
      timeStep: 30
    }
  },
  {
    id: 'color_demo',
    type: 'color',
    text: 'Choose a theme color for your learning dashboard',
    help: 'This will personalize your experience',
    default: '#3b82f6',
    metadata: {
      presetColors: [
        '#3b82f6', '#8b5cf6', '#ec4899', '#10b981', '#f59e0b',
        '#ef4444', '#6366f1', '#14b8a6', '#f97316', '#84cc16'
      ]
    }
  }
]

export function DemoPage() {
  const [answers, setAnswers] = useState<Record<string, any>>({})
  const [touched, setTouched] = useState<Record<string, boolean>>({})

  const handleChange = (questionId: string, value: any) => {
    setAnswers(prev => ({ ...prev, [questionId]: value }))
  }

  const handleBlur = (questionId: string) => {
    setTouched(prev => ({ ...prev, [questionId]: true }))
  }

  return (
    <div className="min-h-screen bg-gray-900 py-12">
      <div className="max-w-3xl mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <h1 className="text-4xl font-bold text-white mb-4">
            Enhanced Dynamic Questionnaire Demo
          </h1>
          <p className="text-lg text-white/60 mb-12">
            Experience our new premium UI components designed for seamless data collection
          </p>
        </motion.div>

        <div className="space-y-8">
          {demoQuestions.map((question, index) => (
            <motion.div
              key={question.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.4, delay: index * 0.1 }}
            >
              <DynamicQuestionInput
                question={question}
                value={answers[question.id]}
                onChange={(value) => handleChange(question.id, value)}
                touched={touched[question.id]}
                onBlur={() => handleBlur(question.id)}
              />
            </motion.div>
          ))}
        </div>

        <motion.div
          className="mt-16 p-6 bg-white/5 rounded-xl border border-white/10"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1 }}
        >
          <h2 className="text-xl font-semibold text-white mb-4">Current Answers</h2>
          <pre className="text-sm text-white/60 overflow-auto">
            {JSON.stringify(answers, null, 2)}
          </pre>
        </motion.div>
      </div>
    </div>
  )
}
