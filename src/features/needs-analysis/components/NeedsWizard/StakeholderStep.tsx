import { useState } from 'react'
import { UserPlus, Trash2 } from 'lucide-react'
import type { NeedsStakeholder } from '../../types'

interface StakeholderStepProps {
  stakeholders: Partial<NeedsStakeholder>[]
  onChange: (stakeholders: Partial<NeedsStakeholder>[]) => void
}

export function StakeholderStep({ stakeholders, onChange }: StakeholderStepProps) {
  const [localStakeholders, setLocalStakeholders] = useState<Partial<NeedsStakeholder>[]>(
    stakeholders.length > 0 ? stakeholders : [{ name: '', role: '', email: '', is_approver: false }]
  )

  const handleStakeholderChange = (index: number, field: keyof NeedsStakeholder, value: any) => {
    const updated = [...localStakeholders]
    updated[index] = { ...updated[index], [field]: value }
    setLocalStakeholders(updated)
    onChange(updated)
  }

  const addStakeholder = () => {
    const newStakeholder: Partial<NeedsStakeholder> = {
      name: '',
      role: '',
      email: '',
      is_approver: false,
    }
    const updated = [...localStakeholders, newStakeholder]
    setLocalStakeholders(updated)
    onChange(updated)
  }

  const removeStakeholder = (index: number) => {
    const updated = localStakeholders.filter((_, i) => i !== index)
    setLocalStakeholders(updated)
    onChange(updated)
  }

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">Key Stakeholders</h3>
        <p className="text-sm text-gray-600 mb-4">
          Identify the people who need to be involved in this project
        </p>
      </div>

      <div className="space-y-4">
        {localStakeholders.map((stakeholder, index) => (
          <div key={index} className="p-4 border border-gray-200 rounded-lg">
            <div className="grid grid-cols-2 gap-4 mb-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={stakeholder.name || ''}
                  onChange={(e) => handleStakeholderChange(index, 'name', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="John Doe"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Role <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={stakeholder.role || ''}
                  onChange={(e) => handleStakeholderChange(index, 'role', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Project Sponsor"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  value={stakeholder.email || ''}
                  onChange={(e) => handleStakeholderChange(index, 'email', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="john.doe@company.com"
                />
              </div>

              <div className="flex items-end">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={stakeholder.is_approver || false}
                    onChange={(e) => handleStakeholderChange(index, 'is_approver', e.target.checked)}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <span className="text-sm font-medium text-gray-700">Can approve deliverables</span>
                </label>
              </div>
            </div>

            {localStakeholders.length > 1 && (
              <button
                onClick={() => removeStakeholder(index)}
                className="mt-3 flex items-center gap-1 text-sm text-red-600 hover:text-red-800"
              >
                <Trash2 className="w-4 h-4" />
                Remove stakeholder
              </button>
            )}
          </div>
        ))}
      </div>

      <button
        onClick={addStakeholder}
        className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-blue-600 border border-blue-600 rounded-md hover:bg-blue-50"
      >
        <UserPlus className="w-4 h-4" />
        Add another stakeholder
      </button>
    </div>
  )
}
