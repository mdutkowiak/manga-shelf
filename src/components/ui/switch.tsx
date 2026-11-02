'use client'

import { cn } from '@/lib/utils'

interface SwitchProps {
  checked: boolean
  onCheckedChange: (checked: boolean) => void
  label: string
  description?: string
  disabled?: boolean
  id?: string
}

/** Dostępny przełącznik (role="switch") z etykietą i opcjonalnym opisem. */
export function Switch({ checked, onCheckedChange, label, description, disabled, id }: SwitchProps) {
  const labelId = `${id ?? label}-label`
  return (
    <div className="flex items-start justify-between gap-4 py-2">
      <div className="min-w-0">
        <p id={labelId} className="text-sm font-semibold text-foreground">
          {label}
        </p>
        {description && <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>}
      </div>
      <button
        type="button"
        role="switch"
        id={id}
        aria-checked={checked}
        aria-labelledby={labelId}
        disabled={disabled}
        onClick={() => onCheckedChange(!checked)}
        className={cn(
          'relative inline-flex h-7 w-12 shrink-0 items-center rounded-full border transition-colors disabled:cursor-not-allowed disabled:opacity-50',
          checked ? 'border-primary bg-primary' : 'border-[var(--control-border)] bg-white/10'
        )}
      >
        <span
          aria-hidden="true"
          className={cn(
            'inline-block h-5 w-5 rounded-full shadow transition-transform',
            checked ? 'translate-x-6 bg-[var(--primary-foreground)]' : 'translate-x-1 bg-white'
          )}
        />
      </button>
    </div>
  )
}
