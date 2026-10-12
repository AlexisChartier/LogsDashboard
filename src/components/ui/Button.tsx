import type { ButtonHTMLAttributes } from 'react'

export type ButtonVariant = 'primary' | 'ghost' | 'danger' | 'success'
export type ButtonSize = 'sm' | 'md' | 'icon'

const BASE =
  'inline-flex items-center justify-center gap-1.5 rounded-md transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-not-allowed disabled:opacity-40 disabled:pointer-events-none'

const VARIANTS: Record<ButtonVariant, string> = {
  primary: 'bg-accent text-accent-contrast hover:opacity-90',
  ghost: 'border border-hairline bg-panel text-ink-muted hover:bg-panel-2 hover:text-ink',
  danger: 'bg-red-600 text-white hover:opacity-90',
  success: 'bg-emerald-600 text-white hover:bg-emerald-500',
}

const SIZES: Record<ButtonSize, string> = {
  sm: 'h-7 px-2.5 text-[11px] font-semibold',
  md: 'h-9 px-3 text-xs font-medium',
  icon: 'h-7 w-7 p-0',
}

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
}

export function Button({
  variant = 'ghost',
  size = 'md',
  className,
  type = 'button',
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={`${BASE} ${VARIANTS[variant]} ${SIZES[size]} ${className ?? ''}`}
      {...props}
    />
  )
}
