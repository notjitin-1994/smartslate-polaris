import RenderField from '@/polaris/needs-analysis/RenderField'
import { EXPERIENCE_LEVELS } from '@/polaris/needs-analysis/experience'
import type { NAResponseMap } from '@/polaris/needs-analysis/types'

interface WelcomeStepProps {
  value: NAResponseMap
  onChange: (map: NAResponseMap) => void
  onNext?: () => void
}

export default function WelcomeStep({ value, onChange, onNext }: WelcomeStepProps) {
  const handleChange = (id: string, v: any) => {
    onChange({ ...value, [id]: v })
  }

  const canNext = Boolean(value['exp_level'])

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">Welcome to Polaris</h2>
        <p className="text-white/70 mt-1">Tell us your comfort level. We will tailor the flow and the final starmap accordingly.</p>
      </div>

      <div>
        {EXPERIENCE_LEVELS.map((f) => (
          <RenderField key={f.id} field={f} value={value[f.id]} onChange={handleChange} />
        ))}
      </div>

      <div className="flex items-center justify-end gap-2">
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


