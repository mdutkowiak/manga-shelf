'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Palette } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { DensityPicker, TextSizePicker, ThemePicker } from '@/components/appearance-options'
import { useUiSettings } from '@/components/ui-settings-provider'
import { toastError, toastSuccess } from '@/lib/toast'

export default function AppearancePage() {
  const router = useRouter()
  const ui = useUiSettings()
  const [theme, setTheme] = useState(ui.theme)
  const [density, setDensity] = useState(ui.density)
  const [textSize, setTextSize] = useState(ui.textSize)
  const [saving, setSaving] = useState(false)

  const nothingToChange = !ui.permissions.theme && !ui.permissions.density && !ui.permissions.textSize

  async function save() {
    setSaving(true)
    try {
      const res = await fetch('/api/ui-preferences', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ theme, density, textSize }),
      })
      if (!res.ok) throw new Error()
      toastSuccess('Zapisano wygląd')
      router.refresh()
    } catch {
      toastError('Nie udało się zapisać wyglądu', 'Spróbuj ponownie za chwilę.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div className="space-y-3">
        <Link
          href="/profile"
          className="inline-flex min-h-[44px] items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Wróć do profilu
        </Link>
        <h1 className="flex items-center gap-3 text-3xl font-extrabold tracking-tight">
          <Palette className="h-7 w-7 text-primary" aria-hidden="true" />
          Wygląd
        </h1>
        <p className="text-muted-foreground">
          Wybierz motyw, gęstość okładek i rozmiar tekstu. Ustawienia zapamiętamy na tym koncie.
        </p>
      </div>

      {nothingToChange && (
        <p role="status" className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-4 text-sm text-amber-100">
          Administrator ustawił wygląd serwisu dla wszystkich użytkowników, więc nie można go tu zmienić.
        </p>
      )}

      <section aria-labelledby="sec-theme" className="space-y-3">
        <h2 id="sec-theme" className="text-lg font-bold">
          Motyw
        </h2>
        <ThemePicker
          value={theme}
          onChange={setTheme}
          available={ui.permissions.availableThemes}
          disabled={!ui.permissions.theme}
        />
      </section>

      <section aria-labelledby="sec-density" className="space-y-3">
        <h2 id="sec-density" className="text-lg font-bold">
          Gęstość okładek
        </h2>
        <DensityPicker value={density} onChange={setDensity} disabled={!ui.permissions.density} />
      </section>

      <section aria-labelledby="sec-text" className="space-y-3">
        <h2 id="sec-text" className="text-lg font-bold">
          Rozmiar tekstu
        </h2>
        <TextSizePicker value={textSize} onChange={setTextSize} disabled={!ui.permissions.textSize} />
      </section>

      <Button onClick={save} disabled={saving || nothingToChange} className="min-h-[44px] px-6">
        {saving ? 'Zapisywanie…' : 'Zapisz wygląd'}
      </Button>
    </div>
  )
}
