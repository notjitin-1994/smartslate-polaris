import { useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import { FormField } from './FormField'
import type { RequestorInfo, ValidationError } from './types'
import { getFieldError } from './validation'
import { EnhancedTextInput, EnhancedTextarea, SingleSelectCards } from '@/components/forms/DynamicQuestionnaire/components'

interface RequestorInfoStepProps {
  data: Partial<RequestorInfo>
  onChange: (field: keyof RequestorInfo, value: any) => void
  errors: ValidationError[]
}

export function RequestorInfoStep({ data, onChange, errors }: RequestorInfoStepProps) {
  const firstFieldRef = useRef<HTMLInputElement>(null)
  const firstErrorFieldRef = useRef<HTMLInputElement>(null)
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
          label="Full Name"
          required
          error={getFieldError(errors, 'fullName')}
        >
          <EnhancedTextInput
            type="text"
            value={data.fullName || ''}
            onChange={(v) => onChange('fullName', v as string)}
            placeholder="Jane Smith"
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
          label="Work Email"
          required
          error={getFieldError(errors, 'workEmail')}
        >
          <EnhancedTextInput
            type="email"
            value={data.workEmail || ''}
            onChange={(v) => onChange('workEmail', v as string)}
            placeholder="jane@company.com"
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
          label="Role / Title"
          helpText="Optional - helps us understand your perspective"
          error={getFieldError(errors, 'role')}
        >
          <EnhancedTextInput
            type="text"
            value={data.role || ''}
            onChange={(v) => onChange('role', v as string)}
            placeholder="Product Manager"
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
          label="Phone Number"
          helpText="Optional - Format: +1 (555) 123-4567 or any international format"
          error={getFieldError(errors, 'phone')}
        >
          <EnhancedTextInput
            type="text"
            value={data.phone || ''}
            onChange={(v) => {
              const value = String(v)
              if (/^[\d\s+\-().]*$/.test(value)) {
                onChange('phone', value)
              }
            }}
            placeholder="+1 (555) 123-4567"
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
          label="Preferred Contact Method"
          required
          error={getFieldError(errors, 'preferredContact')}
        >
          <SingleSelectCards
            options={[
              { value: 'email', label: 'Email' },
              { value: 'phone', label: 'Phone' },
              { value: 'other', label: 'Other' },
            ]}
            value={data.preferredContact || ''}
            onChange={(v) => onChange('preferredContact', v)}
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
          label="Context & Goals"
          required
          helpText={`Describe what you're hoping to achieve with this Starmap (${data.context?.length || 0}/600 characters)`}
          error={getFieldError(errors, 'context')}
        >
          <EnhancedTextarea
            value={data.context || ''}
            onChange={(v) => onChange('context', v)}
            maxLength={600}
            placeholder="We're looking to create a Starmap for our engineering team to better visualize our Q1 roadmap and identify dependencies across different workstreams..."
          />
        </FormField>
      </motion.div>
    </div>
  )
}
