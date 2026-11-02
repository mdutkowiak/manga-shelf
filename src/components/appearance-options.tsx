'use client'

import { Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import { DENSITIES, TEXT_SIZES, THEMES, type Density, type TextSize, type ThemeId } from '@/lib/ui-settings'

interface OptionCardProps {
  selected: boolean
  disabled?: boolean
  onSelect: () => void
  title: string
  description: string
  children?: React.ReactNode
}

function OptionCard({ selected, disabled, onSelect, title, description, children }: OptionCardProps) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      disabled={disabled}
      onClick={onSelect}
      className={cn(
        'relative flex min-h-[44px] flex-col gap-2 rounded-xl border p-4 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-50',
        selected ? 'border-primary bg-primary/10' : 'border-[var(--control-border)] bg-surface-2 hover:bg-white/5'
      )}
    >
      {children}
      <span className="flex items-center gap-2 text-sm font-bold text-foreground">
        {title}
        {selected && <Check className="h-4 w-4 text-primary" aria-hidden="true" />}
      </span>
      <span className="text-sm text-muted-foreground">{description}</span>
    </button>
  )
}

export function ThemePicker({
  value,
  onChange,
  available,
  disabled,
}: {
  value: ThemeId
  onChange: (id: ThemeId) => void
  available: ThemeId[]
  disabled?: boolean
}) {
  return (
    <div role="radiogroup" aria-label="Motyw" className="grid gap-3 sm:grid-cols-2">
      {THEMES.filter((t) => available.includes(t.id)).map((t) => (
        <OptionCard
          key={t.id}
          selected={value === t.id}
          disabled={disabled}
          onSelect={() => onChange(t.id)}
          title={t.label}
          description={t.description}
        >
          <span aria-hidden="true" className="flex h-10 overflow-hidden rounded-lg border border-white/15">
            {t.swatches.map((c) => (
              <span key={c} className="flex-1" style={{ background: c }} />
            ))}
          </span>
        </OptionCard>
      ))}
    </div>
  )
}

export function DensityPicker({
  value,
  onChange,
  disabled,
}: {
  value: Density
  onChange: (id: Density) => void
  disabled?: boolean
}) {
  return (
    <div role="radiogroup" aria-label="Gęstość okładek" className="grid gap-3 sm:grid-cols-2">
      {DENSITIES.map((d) => (
        <OptionCard
          key={d.id}
          selected={value === d.id}
          disabled={disabled}
          onSelect={() => onChange(d.id)}
          title={d.label}
          description={d.description}
        />
      ))}
    </div>
  )
}

export function TextSizePicker({
  value,
  onChange,
  disabled,
}: {
  value: TextSize
  onChange: (id: TextSize) => void
  disabled?: boolean
}) {
  return (
    <div role="radiogroup" aria-label="Rozmiar tekstu" className="grid gap-3 sm:grid-cols-2">
      {TEXT_SIZES.map((t) => (
        <OptionCard
          key={t.id}
          selected={value === t.id}
          disabled={disabled}
          onSelect={() => onChange(t.id)}
          title={t.label}
          description={t.description}
        />
      ))}
    </div>
  )
}
