import { forwardRef } from 'react'
import { clsx } from 'clsx'

type TextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement>

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea({ className, ...props }, ref) {
  return (
    <textarea
      ref={ref}
      className={clsx('w-full bg-transparent border border-white/15 rounded-lg px-3 py-2 text-white placeholder-white/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent', className)}
      {...props}
    />
  )
})

export default Textarea


