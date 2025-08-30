import { motion } from 'framer-motion'
import { DynamicFormField } from './DynamicFormField'
import { 
  MultiSelectCards, 
  SingleSelectCards, 
  EnhancedSelect,
  EnhancedSlider,
  EnhancedTextInput,
  EnhancedTextarea,
  TagInput,
  ToggleSwitch,
  StarRating,
  TimePicker,
  ColorPicker
} from './components'
import type { DynamicQuestionInputProps } from './types'

export function DynamicQuestionInput({ 
  question, 
  value, 
  onChange, 
  touched, 
  onBlur 
}: DynamicQuestionInputProps) {
  const showError = touched && question.required && !value
  const errorMessage = showError ? 'This field is required' : 
                      (touched && question.validation?.message) || undefined
  
  // Support both API formats
  const label = question.text || question.label || ''
  const helpText = question.help || question.helperText
  const defaultValue = question.default ?? question.defaultValue
  
  const renderInput = () => {
    switch (question.type) {
      case 'text':
      case 'email':
      case 'url':
      case 'number':
      case 'date':
        return (
          <EnhancedTextInput
            type={question.type}
            value={value || ''}
            onChange={onChange}
            onBlur={onBlur}
            placeholder={question.placeholder}
            min={question.validation?.min}
            max={question.validation?.max}
          />
        )
      
      case 'textarea':
        return (
          <EnhancedTextarea
            value={value || ''}
            onChange={onChange}
            onBlur={onBlur}
            placeholder={question.placeholder}
            maxLength={question.validation?.maxLength}
          />
        )
      
      case 'single_select':
        // If there are many options, use dropdown, otherwise use cards
        if (question.options && question.options.length > 6) {
          return (
            <EnhancedSelect
              options={question.options || []}
              value={value || ''}
              onChange={onChange}
              onBlur={onBlur}
              placeholder={question.placeholder}
            />
          )
        }
        return (
          <SingleSelectCards
            options={question.options || []}
            value={value || ''}
            onChange={onChange}
            onBlur={onBlur}
          />
        )
      
      case 'multi_select':
        return (
          <MultiSelectCards
            options={question.options || []}
            value={Array.isArray(value) ? value : []}
            onChange={onChange}
            onBlur={onBlur}
            maxSelections={question.validation?.max}
          />
        )
      
      case 'boolean':
        // Use toggle switch for boolean questions
        return (
          <ToggleSwitch
            value={value === true || value === 'true'}
            onChange={onChange}
            onBlur={onBlur}
            labels={question.metadata?.toggleLabels}
          />
        )
      
      case 'toggle':
        // Explicit toggle type
        return (
          <ToggleSwitch
            value={value === true || value === 'true'}
            onChange={onChange}
            onBlur={onBlur}
            labels={question.metadata?.toggleLabels}
          />
        )
      
      case 'slider':
        const min = question.validation?.min || 0
        const max = question.validation?.max || 100
        const step = question.validation?.step || 1
        
        return (
          <EnhancedSlider
            min={min}
            max={max}
            step={step}
            value={value || min}
            onChange={onChange}
            onBlur={onBlur}
            showSteps={max - min <= 10}
          />
        )
      
      case 'tags':
        return (
          <TagInput
            value={Array.isArray(value) ? value : []}
            onChange={onChange}
            onBlur={onBlur}
            placeholder={question.placeholder}
            maxTags={question.validation?.maxTags}
            suggestions={question.metadata?.suggestions}
          />
        )
      
      case 'rating':
        return (
          <StarRating
            value={value || 0}
            onChange={onChange}
            onBlur={onBlur}
            max={question.validation?.max || 5}
            labels={question.metadata?.labels}
          />
        )
      
      case 'time':
        return (
          <TimePicker
            value={value || '00:00'}
            onChange={onChange}
            onBlur={onBlur}
            min={question.validation?.min as string}
            max={question.validation?.max as string}
            step={question.metadata?.timeStep}
          />
        )
      
      case 'color':
        return (
          <ColorPicker
            value={value || '#3b82f6'}
            onChange={onChange}
            onBlur={onBlur}
            presetColors={question.metadata?.presetColors}
            allowCustom={question.metadata?.allowCustomColor !== false}
          />
        )
      
      default:
        // Fallback for any unexpected types
        return (
          <EnhancedTextInput
            type="text"
            value={value || ''}
            onChange={onChange}
            onBlur={onBlur}
            placeholder={question.placeholder}
          />
        )
    }
  }
  
  return (
    <DynamicFormField
      label={label}
      required={question.required}
      helpText={helpText}
      error={errorMessage}
    >
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.2 }}
      >
        {renderInput()}
      </motion.div>
    </DynamicFormField>
  )
}