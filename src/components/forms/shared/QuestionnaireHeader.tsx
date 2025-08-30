import { motion, AnimatePresence } from 'framer-motion'
import type { ReactNode, ReactElement } from 'react'

interface QuestionnaireHeaderProps {
  icon: ReactElement
  title: string
  subtitle: string
  children?: ReactNode // For the progress indicator
  useSharedContainer?: boolean // If true, header assumes parent provides container
  embedded?: boolean // If true, render without full-width header chrome
  flat?: boolean // If true, do not render inner glass card (parent wraps)
  showProgress?: boolean // Controls visibility/animation of the progress slot
  showDivider?: boolean // Renders a consistent brand divider below the header
}

export function QuestionnaireHeader({ 
  icon, 
  title, 
  subtitle, 
  children,
  useSharedContainer = false,
  embedded = false,
  flat = false,
  showProgress = true,
  showDivider = true,
}: QuestionnaireHeaderProps) {
  if (embedded) {
    return (
      <div className={`relative ${useSharedContainer ? '' : 'max-w-7xl mx-auto px-4'}`}>
        <div className={flat ? '' : 'glass-card rounded-2xl px-6 sm:px-8 py-6 sm:py-8 overflow-hidden relative'}>
          {!flat && (
            <div aria-hidden="true" className="pointer-events-none absolute -inset-x-6 -top-10 h-24 bg-gradient-to-b from-primary-400/10 to-transparent blur-2xl" />
          )}
          <motion.div 
            className="mb-6"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <h1 className="text-2xl md:text-4xl font-bold tracking-tight">
                  <span className="bg-gradient-to-r from-white via-white to-white/80 bg-clip-text text-transparent">
                    {title}
                  </span>
                </h1>
                <AnimatePresence mode="wait" initial={false}>
                  <motion.p
                    key={subtitle}
                    className="mt-2 text-sm md:text-base text-white/70 leading-relaxed max-w-3xl"
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    transition={{ duration: 0.25, ease: 'easeOut' }}
                  >
                    {subtitle}
                  </motion.p>
                </AnimatePresence>
              </div>
              <motion.div 
                className="relative shrink-0"
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.4 }}
              >
                <div className="absolute -inset-3 bg-gradient-to-br from-primary-500/20 to-primary-600/20 blur-xl rounded-2xl" aria-hidden="true" />
                <div className="relative flex items-center justify-center w-9 h-9 sm:w-11 sm:h-11 rounded-xl bg-white/5 ring-1 ring-white/10 shadow-inner">
                  <div className="text-primary-400 w-[1.25rem] h-[1.25rem] sm:w-[1.5rem] sm:h-[1.5rem]">
                    {icon}
                  </div>
                </div>
              </motion.div>
            </div>
          </motion.div>
          <AnimatePresence initial={false} mode="wait">
            {showProgress && children ? (
              <motion.div
                key="progress-slot"
                className="mt-6"
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.25, ease: 'easeOut' }}
              >
                {children}
              </motion.div>
            ) : null}
          </AnimatePresence>

          {showDivider && (
            <div className="mt-6 mb-2 px-1 sm:px-2">
              <div className="h-0.5 bg-gradient-to-r from-primary-400/0 via-primary-400/60 to-primary-400/0 rounded-full" />
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <header role="banner" className="relative bg-[rgb(var(--bg))] border-b border-white/5">
      <div className={`relative z-10 ${useSharedContainer ? 'py-8 md:py-10' : 'max-w-7xl mx-auto px-4 py-8 md:py-10'}`}>
        <div className="glass-card rounded-2xl px-6 sm:px-8 py-6 sm:py-8 overflow-hidden relative">
          <div aria-hidden="true" className="pointer-events-none absolute -inset-x-6 -top-10 h-24 bg-gradient-to-b from-primary-400/10 to-transparent blur-2xl" />
          {/* Title and subtitle */}
          <motion.div 
            className="mb-6"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <h1 className="text-2xl md:text-4xl font-bold tracking-tight">
                  <span className="bg-gradient-to-r from-white via-white to-white/80 bg-clip-text text-transparent">
                    {title}
                  </span>
                </h1>
                <AnimatePresence mode="wait" initial={false}>
                  <motion.p
                    key={subtitle}
                    className="mt-2 text-sm md:text-base text-white/70 leading-relaxed max-w-3xl"
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    transition={{ duration: 0.25, ease: 'easeOut' }}
                  >
                    {subtitle}
                  </motion.p>
                </AnimatePresence>
              </div>
              <motion.div 
                className="relative shrink-0"
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.4 }}
              >
                <div className="absolute -inset-3 bg-gradient-to-br from-primary-500/20 to-primary-600/20 blur-xl rounded-2xl" aria-hidden="true" />
                <div className="relative flex items-center justify-center w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-white/5 ring-1 ring-white/10 shadow-inner">
                  <div className="text-primary-400 w-[1.5rem] h-[1.5rem] sm:w-[1.75rem] sm:h-[1.75rem]">
                    {icon}
                  </div>
                </div>
              </motion.div>
            </div>
          </motion.div>

          {/* Progress indicator or other children */}
          <AnimatePresence initial={false} mode="wait">
            {showProgress && children ? (
              <motion.div
                key="progress-slot"
                className="mt-6"
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.25, ease: 'easeOut' }}
              >
                {children}
              </motion.div>
            ) : null}
          </AnimatePresence>

          {showDivider && (
            <div className="mt-6 mb-2 px-1 sm:px-2">
              <div className="h-0.5 bg-gradient-to-r from-primary-400/0 via-primary-400/60 to-primary-400/0 rounded-full" />
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
