import type { ReactNode } from 'react'
import { cloneElement, isValidElement, useId } from 'react'
import { Info } from 'lucide-react'

interface DynamicFormFieldProps {
  label: string
  error?: string
  required?: boolean
  helpText?: string | ReactNode
  children: ReactNode
}

export function DynamicFormField({ label, error, required, helpText, children }: DynamicFormFieldProps) {
  const fieldId = useId()
  const errorId = `${fieldId}-error`
  const helpId = `${fieldId}-help`
  
  // Clone child element to add proper ID and ARIA attributes
  const childWithProps = isValidElement(children) ? cloneElement(children as any, {
    id: children.props.id || fieldId,
    'aria-describedby': [
      error ? errorId : null,
      helpText && !error ? helpId : null
    ].filter(Boolean).join(' ') || undefined,
    'aria-invalid': error ? 'true' : undefined,
    'aria-required': required ? 'true' : undefined
  }) : children

  return (
    <div className="space-y-2 group">
      <label 
        htmlFor={isValidElement(children) && children.props.id ? children.props.id : fieldId}
        className="block text-sm text-white/80 font-medium text-left transition-colors group-hover:text-white"
      >
        {label}
        {required && <span className="text-red-400 ml-1" aria-label="required">*</span>}
      </label>
      
      <div className="relative">
        {childWithProps}
      </div>

      {helpText && !error && (
        <div className="flex items-start gap-2 text-xs text-white/60 mt-1.5">
          <Info className="w-3 h-3 mt-0.5 flex-shrink-0 text-white/40" />
          <span>{helpText}</span>
        </div>
      )}

      {error && (
        <p 
          id={errorId} 
          className="text-xs text-red-400 mt-1.5 text-left flex items-center gap-1 motion-safe:animate-fade-in-up"
          role="alert"
          aria-live="polite"
        >
          <svg className="h-3 w-3 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          {error}
        </p>
      )}
    </div>
  )
}

