import { ChevronDown } from 'lucide-react'
import type { ChangeEvent } from 'react'
import { FIELD_CLASS } from './TextInput'

export interface SelectOption {
  value: string
  label: string
}

export interface SelectProps {
  id?: string
  value: string
  onChange: (event: ChangeEvent<HTMLSelectElement>) => void
  options: SelectOption[]
  className?: string
}

export function Select({ id, value, onChange, options, className }: SelectProps) {
  return (
    <div className={`relative ${className ?? ''}`}>
      <select
        id={id}
        value={value}
        onChange={onChange}
        className={`${FIELD_CLASS} appearance-none pr-8`}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <ChevronDown
        className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-subtle"
        aria-hidden
      />
    </div>
  )
}
