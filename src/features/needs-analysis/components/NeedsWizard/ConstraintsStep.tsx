import { useState } from 'react'
import { Globe, Clock, DollarSign } from 'lucide-react'

interface ConstraintsData {
  languages?: string[]
  timeline?: string
  budget?: number
}

interface ConstraintsStepProps {
  data?: ConstraintsData
  onChange: (data: ConstraintsData) => void
}

const LANGUAGE_OPTIONS = [
  { code: 'en', name: 'English' },
  { code: 'es', name: 'Spanish' },
  { code: 'fr', name: 'French' },
  { code: 'de', name: 'German' },
  { code: 'pt', name: 'Portuguese' },
  { code: 'zh', name: 'Chinese' },
  { code: 'ja', name: 'Japanese' },
  { code: 'ko', name: 'Korean' },
  { code: 'ar', name: 'Arabic' },
  { code: 'hi', name: 'Hindi' },
]

export function ConstraintsStep({ data, onChange }: ConstraintsStepProps) {
  const [formData, setFormData] = useState<ConstraintsData>({
    languages: ['en'],
    timeline: '',
    budget: undefined,
    ...data,
  })

  const handleChange = (field: keyof ConstraintsData, value: any) => {
    const newData = { ...formData, [field]: value }
    setFormData(newData)
    onChange(newData)
  }

  const toggleLanguage = (langCode: string) => {
    const current = formData.languages || []
    const index = current.indexOf(langCode)
    
    let updated: string[]
    if (index > -1) {
      // Don't allow removing all languages
      if (current.length > 1) {
        updated = current.filter(l => l !== langCode)
      } else {
        return
      }
    } else {
      updated = [...current, langCode]
    }
    
    handleChange('languages', updated)
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">Project Constraints</h3>
        <p className="text-sm text-gray-600 mb-4">
          Define the limitations and requirements for this project
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          <Globe className="inline w-4 h-4 mr-1" />
          Content Languages
        </label>
        <p className="text-sm text-gray-600 mb-3">
          Select all languages the training content needs to support
        </p>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {LANGUAGE_OPTIONS.map(lang => (
            <label
              key={lang.code}
              className="flex items-center gap-2 cursor-pointer"
            >
              <input
                type="checkbox"
                checked={formData.languages?.includes(lang.code) || false}
                onChange={() => toggleLanguage(lang.code)}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700">{lang.name}</span>
            </label>
          ))}
        </div>
      </div>

      <div>
        <label htmlFor="timeline" className="block text-sm font-medium text-gray-700 mb-1">
          <Clock className="inline w-4 h-4 mr-1" />
          Project Timeline
        </label>
        <p className="text-sm text-gray-600 mb-2">
          When does the training need to be deployed?
        </p>
        <input
          type="date"
          id="timeline"
          value={formData.timeline || ''}
          onChange={(e) => handleChange('timeline', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          min={new Date().toISOString().split('T')[0]}
        />
      </div>

      <div>
        <label htmlFor="budget" className="block text-sm font-medium text-gray-700 mb-1">
          <DollarSign className="inline w-4 h-4 mr-1" />
          Budget Range
        </label>
        <p className="text-sm text-gray-600 mb-2">
          What's the approximate budget for this project?
        </p>
        <div className="relative">
          <span className="absolute left-3 top-2 text-gray-500">$</span>
          <input
            type="number"
            id="budget"
            value={formData.budget || ''}
            onChange={(e) => handleChange('budget', e.target.value ? Number(e.target.value) : undefined)}
            className="w-full px-3 py-2 pl-8 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="50000"
            min="0"
            step="1000"
          />
        </div>
        <p className="mt-1 text-xs text-gray-500">
          This helps us recommend appropriate solutions within your constraints
        </p>
      </div>

      <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <h4 className="text-sm font-medium text-blue-900 mb-2">Constraints Summary</h4>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• Languages: {formData.languages?.length || 0} selected</li>
          <li>• Timeline: {formData.timeline ? new Date(formData.timeline).toLocaleDateString() : 'Not specified'}</li>
          <li>• Budget: {formData.budget ? `$${formData.budget.toLocaleString()}` : 'Not specified'}</li>
        </ul>
      </div>
    </div>
  )
}
