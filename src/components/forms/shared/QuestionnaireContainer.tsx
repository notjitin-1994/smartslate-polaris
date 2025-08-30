import { motion } from 'framer-motion'
import type { ReactNode } from 'react'

interface QuestionnaireContainerProps {
  children: ReactNode
  className?: string
}

export function QuestionnaireContainer({ 
  children,
  className = ""
}: QuestionnaireContainerProps) {
  return (
    <motion.div
      className={`bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6 sm:p-8 shadow-xl hover:shadow-2xl hover:border-white/15 transition-all duration-300 ${className}`}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      {children}
    </motion.div>
  )
}
