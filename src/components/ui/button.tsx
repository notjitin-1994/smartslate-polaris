import { forwardRef } from 'react'
import { clsx } from 'clsx'

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'ghost'
  size?: 'sm' | 'md' | 'lg'
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button({
  className,
  variant = 'primary',
  size = 'md',
  ...props
}, ref) {
  const base = 'inline-flex items-center justify-center rounded-lg font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent active:scale-95 disabled:opacity-60 disabled:pointer-events-none'
  const variantClass = variant === 'primary'
    ? 'bg-secondary-500 hover:bg-secondary-600 text-white'
    : variant === 'secondary'
      ? 'border border-white/20 text-white hover:bg-white/10'
      : 'text-white/80 hover:bg-white/5'
  const sizeClass = size === 'sm' ? 'h-8 px-3 text-sm' : size === 'lg' ? 'h-12 px-5 text-base' : 'h-10 px-4 text-sm'
  return (
    <button ref={ref} className={clsx(base, variantClass, sizeClass, className)} {...props} />
  )
})

export default Button


