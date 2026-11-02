'use client'

import Link from 'next/link'
import { PowerOff } from 'lucide-react'
import { FEATURE_LABELS, type FeatureKey } from '@/lib/ui-settings'
import { useFeature } from '@/components/ui-settings-provider'

/** Pokazuje komunikat zamiast treści, gdy admin wyłączył daną funkcję. */
export function FeatureGate({ feature, children }: { feature: FeatureKey; children: React.ReactNode }) {
  const enabled = useFeature(feature)
  if (enabled) return <>{children}</>

  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-4 py-24 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-white/15 bg-white/5">
        <PowerOff className="h-7 w-7 text-muted-foreground" aria-hidden="true" />
      </div>
      <h1 className="text-xl font-bold">Funkcja jest chwilowo wyłączona</h1>
      <p className="text-muted-foreground">
        Administrator wyłączył moduł „{FEATURE_LABELS[feature].label}”. Spróbuj ponownie później.
      </p>
      <Link href="/collection" className="rounded-lg bg-primary px-5 py-3 font-bold text-primary-foreground">
        Wróć do półki
      </Link>
    </div>
  )
}
