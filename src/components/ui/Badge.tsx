import type { ReactNode } from 'react'

export interface BadgeProps {
  children: ReactNode
  className?: string
}

export function Badge({ children, className }: BadgeProps) {
  return (
    <span
      className={`inline-flex justify-center rounded border border-transparent px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider ring-1 ring-inset ${className ?? ''}`}
    >
      {children}
    </span>
  )
}
