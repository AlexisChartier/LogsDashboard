import type { InputHTMLAttributes } from 'react'

export const FIELD_CLASS =
  'h-9 w-full rounded-md border border-hairline bg-panel-2 px-3 text-sm text-ink outline-none transition placeholder:text-ink-subtle focus:border-accent focus:ring-2 focus:ring-accent/20'

export type TextInputProps = InputHTMLAttributes<HTMLInputElement>

export function TextInput({ className, ...props }: TextInputProps) {
  return <input className={`${FIELD_CLASS} ${className ?? ''}`} {...props} />
}
