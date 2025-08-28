import { useEffect, useState } from 'react'
import { Calendar } from 'lucide-react'

interface BusinessContextData {
  title: string
  businessGoal: string
  successMetrics: Record<string, any>
  deadline?: string
  budgetCap?: number
}

interface BusinessContextStepProps {
  data?: BusinessContextData
  onChange: (data: BusinessContextData) => void
}

export function BusinessContextStep({ data, onChange }: BusinessContextStepProps) {
  const [formData, setFormData] = useState<BusinessContextData>({
    title: '',
    businessGoal: '',
    successMetrics: {},
    deadline: undefined,
    budgetCap: undefined,
    ...data,
  })

  const [metrics, setMetrics] = useState<Array<{ key: string; value: string }>>([
    { key: '', value: '' },
  ])

  useEffect(() => {
    // Initialize metrics from successMetrics object
    if (data?.successMetrics && Object.keys(data.successMetrics).length > 0) {
      setMetrics(
        Object.entries(data.successMetrics).map(([key, value]) => ({
          key,
          value: String(value),
        }))
      )
    }
  }, [data])

  const handleChange = (field: keyof BusinessContextData, value: any) => {
    const newData = { ...formData, [field]: value }
    setFormData(newData)
    onChange(newData)
  }

  const handleMetricChange = (index: number, field: 'key' | 'value', value: string) => {
    const newMetrics = [...metrics]
    newMetrics[index][field] = value
    setMetrics(newMetrics)

    // Convert to object for storage
    const metricsObject = newMetrics.reduce((acc, metric) => {
      if (metric.key && metric.value) {
        acc[metric.key] = metric.value
      }
      return acc
    }, {} as Record<string, string>)

    handleChange('successMetrics', metricsObject)
  }

  const addMetric = () => {
    setMetrics([...metrics, { key: '', value: '' }])
  }

  const removeMetric = (index: number) => {
    const newMetrics = metrics.filter((_, i) => i !== index)
    setMetrics(newMetrics)
  }

  return (
    <div className="space-y-6">
      <div>
        <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
          Project Title <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          id="title"
          value={formData.title}
          onChange={(e) => handleChange('title', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="e.g., Customer Service Training Program"
          required
        />
      </div>

      <div>
        <label htmlFor="businessGoal" className="block text-sm font-medium text-gray-700 mb-1">
          Business Goal
        </label>
        <textarea
          id="businessGoal"
          value={formData.businessGoal}
          onChange={(e) => handleChange('businessGoal', e.target.value)}
          rows={3}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="What business problem are you trying to solve?"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Success Metrics
        </label>
        <p className="text-sm text-gray-600 mb-3">
          Define measurable outcomes that will indicate success
        </p>
        {metrics.map((metric, index) => (
          <div key={index} className="flex gap-2 mb-2">
            <input
              type="text"
              value={metric.key}
              onChange={(e) => handleMetricChange(index, 'key', e.target.value)}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Metric name"
            />
            <input
              type="text"
              value={metric.value}
              onChange={(e) => handleMetricChange(index, 'value', e.target.value)}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Target value"
            />
            {metrics.length > 1 && (
              <button
                onClick={() => removeMetric(index)}
                className="px-3 py-2 text-red-600 hover:bg-red-50 rounded-md"
              >
                Remove
              </button>
            )}
          </div>
        ))}
        <button
          onClick={addMetric}
          className="mt-2 text-sm text-blue-600 hover:text-blue-800"
        >
          + Add another metric
        </button>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="deadline" className="block text-sm font-medium text-gray-700 mb-1">
            Target Deadline
          </label>
          <div className="relative">
            <input
              type="date"
              id="deadline"
              value={formData.deadline || ''}
              onChange={(e) => handleChange('deadline', e.target.value)}
              className="w-full px-3 py-2 pl-10 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <Calendar className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
          </div>
        </div>

        <div>
          <label htmlFor="budgetCap" className="block text-sm font-medium text-gray-700 mb-1">
            Budget Cap
          </label>
          <div className="relative">
            <span className="absolute left-3 top-2 text-gray-500">$</span>
            <input
              type="number"
              id="budgetCap"
              value={formData.budgetCap || ''}
              onChange={(e) => handleChange('budgetCap', e.target.value ? Number(e.target.value) : undefined)}
              className="w-full px-3 py-2 pl-8 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="0"
              min="0"
            />
          </div>
        </div>
      </div>
    </div>
  )
}
