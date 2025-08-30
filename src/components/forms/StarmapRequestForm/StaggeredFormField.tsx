import { motion } from 'framer-motion'
import { FormField } from './FormField'
import type { ReactNode } from 'react'

interface StaggeredFormFieldProps {
  label: string
  error?: string
  required?: boolean
  helpText?: string | ReactNode
  children: ReactNode
  index: number
}

export function StaggeredFormField({ index, ...props }: StaggeredFormFieldProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.4,
        delay: index * 0.05,
        ease: [0.4, 0, 0.2, 1]
      }}
    >
      <FormField {...props} />
    </motion.div>
  )
}
