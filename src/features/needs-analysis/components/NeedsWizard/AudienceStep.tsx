import { useState } from 'react'
import { Users, Trash2 } from 'lucide-react'
import type { NeedsAudience } from '../../types'

interface AudienceStepProps {
  audiences: Partial<NeedsAudience>[]
  onChange: (audiences: Partial<NeedsAudience>[]) => void
}

const COMMON_DEVICES = ['Desktop', 'Laptop', 'Tablet', 'Mobile', 'VR Headset']
const COMMON_ACCESSIBILITY = ['Screen Reader', 'Keyboard Only', 'High Contrast', 'Captions', 'Large Text']
const COMMON_LOCALES = ['en-US', 'es-ES', 'fr-FR', 'de-DE', 'zh-CN', 'ja-JP', 'pt-BR']

export function AudienceStep({ audiences, onChange }: AudienceStepProps) {
  const [localAudiences, setLocalAudiences] = useState<Partial<NeedsAudience>[]>(
    audiences.length > 0 ? audiences : [{ name: '', size: undefined, devices: [], accessibility_needs: [], locales: [] }]
  )

  const handleAudienceChange = (index: number, field: keyof NeedsAudience, value: any) => {
    const updated = [...localAudiences]
    updated[index] = { ...updated[index], [field]: value }
    setLocalAudiences(updated)
    onChange(updated)
  }

  const toggleArrayItem = (index: number, field: 'devices' | 'accessibility_needs' | 'locales', item: string) => {
    const updated = [...localAudiences]
    const current = updated[index][field] || []
    const itemIndex = current.indexOf(item)
    
    if (itemIndex > -1) {
      updated[index][field] = current.filter(i => i !== item)
    } else {
      updated[index][field] = [...current, item]
    }
    
    setLocalAudiences(updated)
    onChange(updated)
  }

  const addAudience = () => {
    const newAudience: Partial<NeedsAudience> = {
      name: '',
      size: undefined,
      devices: [],
      accessibility_needs: [],
      locales: [],
    }
    const updated = [...localAudiences, newAudience]
    setLocalAudiences(updated)
    onChange(updated)
  }

  const removeAudience = (index: number) => {
    const updated = localAudiences.filter((_, i) => i !== index)
    setLocalAudiences(updated)
    onChange(updated)
  }

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">Target Audiences</h3>
        <p className="text-sm text-gray-600 mb-4">
          Define the groups of learners who will use this training
        </p>
      </div>

      <div className="space-y-4">
        {localAudiences.map((audience, index) => (
          <div key={index} className="p-4 border border-gray-200 rounded-lg">
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Audience Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={audience.name || ''}
                  onChange={(e) => handleAudienceChange(index, 'name', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., New Customer Service Reps"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Approximate Size
                </label>
                <input
                  type="number"
                  value={audience.size || ''}
                  onChange={(e) => handleAudienceChange(index, 'size', e.target.value ? Number(e.target.value) : undefined)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="100"
                  min="1"
                />
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Devices Used
              </label>
              <div className="flex flex-wrap gap-2">
                {COMMON_DEVICES.map(device => (
                  <button
                    key={device}
                    onClick={() => toggleArrayItem(index, 'devices', device)}
                    className={`px-3 py-1 text-sm rounded-full border transition-colors ${
                      audience.devices?.includes(device)
                        ? 'bg-blue-100 text-blue-700 border-blue-300'
                        : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    {device}
                  </button>
                ))}
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Accessibility Needs
              </label>
              <div className="flex flex-wrap gap-2">
                {COMMON_ACCESSIBILITY.map(need => (
                  <button
                    key={need}
                    onClick={() => toggleArrayItem(index, 'accessibility_needs', need)}
                    className={`px-3 py-1 text-sm rounded-full border transition-colors ${
                      audience.accessibility_needs?.includes(need)
                        ? 'bg-blue-100 text-blue-700 border-blue-300'
                        : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    {need}
                  </button>
                ))}
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Languages/Locales
              </label>
              <div className="flex flex-wrap gap-2">
                {COMMON_LOCALES.map(locale => (
                  <button
                    key={locale}
                    onClick={() => toggleArrayItem(index, 'locales', locale)}
                    className={`px-3 py-1 text-sm rounded-full border transition-colors ${
                      audience.locales?.includes(locale)
                        ? 'bg-blue-100 text-blue-700 border-blue-300'
                        : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    {locale}
                  </button>
                ))}
              </div>
            </div>

            {localAudiences.length > 1 && (
              <button
                onClick={() => removeAudience(index)}
                className="mt-3 flex items-center gap-1 text-sm text-red-600 hover:text-red-800"
              >
                <Trash2 className="w-4 h-4" />
                Remove audience
              </button>
            )}
          </div>
        ))}
      </div>

      <button
        onClick={addAudience}
        className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-blue-600 border border-blue-600 rounded-md hover:bg-blue-50"
      >
        <Users className="w-4 h-4" />
        Add another audience
      </button>
    </div>
  )
}
