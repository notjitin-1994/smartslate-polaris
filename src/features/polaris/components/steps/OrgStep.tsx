import RenderField from '@/polaris/needs-analysis/RenderField'
import type { NAResponseMap, NAField } from '@/polaris/needs-analysis/types'
import { NA_STATIC_FIELDS } from '@/polaris/needs-analysis/static'

const ORG_FIELD_IDS = new Set([
  'org_name',
  'industry',
  'employee_count',
  'systems',
  'success_metrics',
])

function getOrgFields(all: NAField[]): NAField[] {
  return all.filter(f => ORG_FIELD_IDS.has(f.id))
}

interface OrgStepProps {
  value: NAResponseMap
  onChange: (map: NAResponseMap) => void
  onNext?: () => void
  onBack?: () => void
}

export default function OrgStep({ value, onChange, onNext, onBack }: OrgStepProps) {
  const handleChange = (id: string, v: any) => {
    onChange({ ...value, [id]: v })
  }

  const fields = getOrgFields(NA_STATIC_FIELDS)
  const canNext = fields.every(f => {
    const val = value[f.id]
    if (f.required && f.type === 'multi_select') return Array.isArray(val) && val.length > 0
    if (f.required) return val !== undefined && val !== null && val !== ''
    return true
  })

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">Organization context</h2>
        <p className="text-white/70 mt-1">High-signal basics to shape recommendations. Keep it concise; you can refine later.</p>
      </div>

      <div>
        {fields.map((f) => (
          <RenderField key={f.id} field={f} value={value[f.id]} onChange={handleChange} />
        ))}
      </div>

      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={onBack}
          className="px-4 py-2 rounded-lg border border-white/15 text-white/80 hover:bg-white/10"
        >
          Back
        </button>
        <button
          type="button"
          onClick={onNext}
          disabled={!canNext}
          className={`px-4 py-2 rounded-lg border ${canNext ? 'border-primary-400 text-primary-200 hover:bg-primary-400/10' : 'opacity-40 cursor-not-allowed border-white/15 text-white/60'}`}
        >
          Continue
        </button>
      </div>
    </div>
  )
}


