import type { ButtonHTMLAttributes, ReactNode } from 'react'

type IconButtonProps = {
  ariaLabel: string
  title?: string
  variant?: 'ghost' | 'primary' | 'danger' | 'plain'
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
  const isPlain = variant === 'plain'
  const baseClass = isPlain ? 'icon-btn-plain' : 'icon-btn'
  const variantClass = !isPlain && variant ? ` icon-btn-${variant}` : ''
  const sizeClass = !isPlain && size === 'sm' ? ' icon-btn-sm' : ''
  return (
    <button
      type="button"
      aria-label={ariaLabel}
      title={title || ariaLabel}
      className={`${baseClass}${variantClass}${sizeClass} ${className}`.trim()}
      {...rest}
    >
      {children}
    </button>
  )
}


