import type { ButtonHTMLAttributes, ReactNode } from 'react'

type IconButtonProps = {
  ariaLabel: string
  title?: string
  variant?: 'ghost' | 'primary' | 'danger'
  size?: 'sm' | 'md'
  className?: string
  children: ReactNode
} & Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'className' | 'children' | 'aria-label'>

export function IconButton({
  ariaLabel,
  title,
  variant = 'ghost',
  size = 'md',
  className = '',
  children,
  ...rest
}: IconButtonProps) {
  const variantClass = variant ? ` icon-btn-${variant}` : ''
  const sizeClass = size === 'sm' ? ' icon-btn-sm' : ''
  return (
    <button
      type="button"
      aria-label={ariaLabel}
      title={title || ariaLabel}
      className={`icon-btn${variantClass}${sizeClass} ${className}`.trim()}
      {...rest}
    >
      {children}
    </button>
  )
}


