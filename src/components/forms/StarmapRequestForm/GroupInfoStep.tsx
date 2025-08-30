import { useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import { FormField } from './FormField'
import { ChipInput } from './ChipInput'
import type { GroupInfo, ValidationError } from './types'
import { getFieldError } from './validation'
import { GROUP_TYPE_OPTIONS, INDUSTRY_OPTIONS, GROUP_SIZE_OPTIONS } from './types'
import { EnhancedTextInput, EnhancedTextarea, EnhancedSelect } from '@/components/forms/DynamicQuestionnaire/components'

interface GroupInfoStepProps {
  data: Partial<GroupInfo>
  onChange: (field: keyof GroupInfo, value: any) => void
  errors: ValidationError[]
}

export function GroupInfoStep({ data, onChange, errors }: GroupInfoStepProps) {
  const firstFieldRef = useRef<HTMLInputElement>(null)
  const firstErrorFieldRef = useRef<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>(null)
  const didFocusRef = useRef(false)

  // Auto-focus only once on mount to avoid stealing focus while typing
  useEffect(() => {
    if (didFocusRef.current) return
    didFocusRef.current = true
    const timer = setTimeout(() => {
      if (errors.length > 0 && firstErrorFieldRef.current) {
        firstErrorFieldRef.current.focus()
        firstErrorFieldRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' })
      } else if (firstFieldRef.current) {
        firstFieldRef.current.focus()
      }
    }, 100)
    return () => clearTimeout(timer)
  }, [])
  // Generate quarters for timeline
  const generateQuarters = () => {
    const quarters = []
    const currentDate = new Date()
    const currentYear = currentDate.getFullYear()
    const currentQuarter = Math.floor(currentDate.getMonth() / 3) + 1

    for (let i = 0; i < 8; i++) {
      const quarterOffset = currentQuarter + i
      const year = currentYear + Math.floor((quarterOffset - 1) / 4)
      const quarter = ((quarterOffset - 1) % 4) + 1
      quarters.push({
        value: `${year}-Q${quarter}`,
        label: `Q${quarter} ${year}`
      })
    }
    return quarters
  }

  const timelineOptions = generateQuarters()

  return (
    <div className="space-y-6">
      {/* Removed duplicate header - it's now in the main form */}
      
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ 
          delay: 0 * 0.08,
          duration: 0.4,
          ease: [0.4, 0, 0.2, 1]
        }}
      >
        <FormField
          label="Group Name"
          required
          error={getFieldError(errors, 'groupName')}
        >
          <EnhancedTextInput
            type="text"
            value={data.groupName || ''}
            onChange={(v) => onChange('groupName', v as string)}
            placeholder="Engineering Team"
          />
        </FormField>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ 
          delay: 1 * 0.08,
          duration: 0.4,
          ease: [0.4, 0, 0.2, 1]
        }}
      >
        <FormField
          label="Group Type"
          required
          error={getFieldError(errors, 'groupType')}
        >
        <EnhancedSelect
          options={GROUP_TYPE_OPTIONS}
          value={data.groupType || ''}
          onChange={(v) => onChange('groupType', v)}
          placeholder="Select a type..."
        />
        </FormField>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ 
          delay: 2 * 0.08,
          duration: 0.4,
          ease: [0.4, 0, 0.2, 1]
        }}
      >
        <FormField
          label="Industry / Discipline"
          required
          error={getFieldError(errors, 'industry')}
        >
        <EnhancedSelect
          options={INDUSTRY_OPTIONS}
          value={data.industry || ''}
          onChange={(v) => onChange('industry', v)}
          placeholder="Select an industry..."
        />
        </FormField>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ 
          delay: 3 * 0.08,
          duration: 0.4,
          ease: [0.4, 0, 0.2, 1]
        }}
      >
        <FormField
          label="Group Size"
          required
          error={getFieldError(errors, 'size')}
        >
        <EnhancedSelect
          options={GROUP_SIZE_OPTIONS}
          value={data.size || ''}
          onChange={(v) => onChange('size', v)}
          placeholder="Select size..."
        />
        </FormField>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ 
          delay: 4 * 0.08,
          duration: 0.4,
          ease: [0.4, 0, 0.2, 1]
        }}
      >
        <FormField
          label="Primary Stakeholders"
          required
          helpText="Press Enter or comma to add stakeholders"
          error={getFieldError(errors, 'primaryStakeholders')}
        >
        <ChipInput
          id="field-primary-stakeholders"
          value={data.primaryStakeholders || []}
          onChange={(value) => onChange('primaryStakeholders', value)}
          placeholder="e.g., VP Engineering, Product Manager..."
        />
        </FormField>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ 
          delay: 5 * 0.08,
          duration: 0.4,
          ease: [0.4, 0, 0.2, 1]
        }}
      >
        <FormField
          label="Desired Outcomes & Success Criteria"
          required
          helpText={
            <span className="flex items-center justify-between">
              <span>What does success look like?</span>
              <span className={`text-xs ${(data.desiredOutcomes?.length || 0) > 900 ? 'text-amber-400' : 'text-white/50'}`}>
                {data.desiredOutcomes?.length || 0}/1000
              </span>
            </span>
          }
          error={getFieldError(errors, 'desiredOutcomes')}
        >
        <EnhancedTextarea
          value={data.desiredOutcomes || ''}
          onChange={(v) => onChange('desiredOutcomes', v)}
          maxLength={1000}
          placeholder="We want to improve cross-team collaboration, identify dependencies early, and ensure all stakeholders have visibility into our progress..."
        />
        </FormField>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ 
          delay: 6 * 0.08,
          duration: 0.4,
          ease: [0.4, 0, 0.2, 1]
        }}
      >
        <FormField
          label="Timeline Target"
          helpText="When would you like to have the Starmap ready?"
          error={getFieldError(errors, 'timelineTarget')}
        >
        <EnhancedSelect
          options={[{ value: 'asap', label: 'As soon as possible' }, ...timelineOptions]}
          value={data.timelineTarget || ''}
          onChange={(v) => onChange('timelineTarget', v)}
          placeholder="Select a timeline..."
        />
        </FormField>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ 
          delay: 7 * 0.08,
          duration: 0.4,
          ease: [0.4, 0, 0.2, 1]
        }}
      >
        <FormField
          label="Constraints or Additional Notes"
          helpText="Any specific requirements, constraints, or context we should know?"
          error={getFieldError(errors, 'constraints')}
        >
        <EnhancedTextarea
          value={data.constraints || ''}
          onChange={(v) => onChange('constraints', v)}
          placeholder="Optional - share any specific requirements or constraints..."
        />
        </FormField>
      </motion.div>
    </div>
  )
}
