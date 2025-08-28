import type { ButtonHTMLAttributes, ReactNode, MouseEvent } from 'react'
import { useRef } from 'react'

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
  onClick,
  ...rest
}: IconButtonProps & { onClick?: ButtonHTMLAttributes<HTMLButtonElement>['onClick'] }) {
  const btnRef = useRef<HTMLButtonElement | null>(null)
  function createRipple(e: MouseEvent<HTMLButtonElement>) {
    const el = btnRef.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    const size = Math.max(rect.width, rect.height) * 1.2
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    const span = document.createElement('span')
    span.className = 'ripple-ink'
    span.style.width = `${size}px`
    span.style.height = `${size}px`
    span.style.left = `${x}px`
    span.style.top = `${y}px`
    el.appendChild(span)
    window.setTimeout(() => { try { span.remove() } catch {} }, 700)
  }
  const isPlain = variant === 'plain'
  const baseClass = isPlain ? 'icon-btn-plain' : 'icon-btn'
  const variantClass = !isPlain && variant ? ` icon-btn-${variant}` : ''
  const sizeClass = !isPlain && size === 'sm' ? ' icon-btn-sm' : ''
  return (
    <button
      ref={btnRef}
      type="button"
      aria-label={ariaLabel}
      title={title || ariaLabel}
      className={`${baseClass}${variantClass}${sizeClass} ${className}`.trim()}
      onClick={(e) => { try { createRipple(e) } catch {} ; onClick?.(e) }}
      {...rest}
    >
      {children}
    </button>
  )
}


