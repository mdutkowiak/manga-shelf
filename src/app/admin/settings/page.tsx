'use client'

import { useEffect, useState } from 'react'
import { Loader2, Save } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { DensityPicker, TextSizePicker } from '@/components/appearance-options'
import { toastError, toastSuccess } from '@/lib/toast'
import {
  DEFAULT_SITE_SETTINGS,
  FEATURE_KEYS,
  FEATURE_LABELS,
  THEMES,
  type AnnouncementLevel,
  type SiteSettings,
  type ThemeId,
} from '@/lib/ui-settings'

function Section({
  title,
  description,
  children,
}: {
  title: string
  description?: string
  children: React.ReactNode
}) {
  return (
    <section className="space-y-4 rounded-2xl border border-white/10 bg-surface-2 p-5 md:p-6">
      <div>
        <h2 className="text-lg font-bold">{title}</h2>
        {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
      </div>
      {children}
    </section>
  )
}

interface RepairReport {
  applied: boolean
  foreignCoverImages: number
  foreignCustomCovers: number
  placeholderPrices: number
  seriesAffected: number
  sampleSeries: string[]
}

export default function AdminSettingsPage() {
  const [repair, setRepair] = useState<RepairReport | null>(null)
  const [repairing, setRepairing] = useState(false)

  const runRepair = async (apply: boolean) => {
    setRepairing(true)
    try {
      const res = await fetch('/api/admin/repair-covers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apply }),
      })
      if (!res.ok) throw new Error()
      setRepair(await res.json())
      if (apply) toastSuccess('Dane naprawione')
    } catch {
      toastError('Nie udało się sprawdzić ani naprawić danych')
    } finally {
      setRepairing(false)
    }
  }

  const [settings, setSettings] = useState<SiteSettings>(DEFAULT_SITE_SETTINGS)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetch('/api/admin/settings')
      .then((res) => (res.ok ? res.json() : Promise.reject()))
      .then((data) => setSettings(data.settings))
      .catch(() => toastError('Nie udało się wczytać ustawień'))
      .finally(() => setLoading(false))
  }, [])

  const update = (patch: Partial<SiteSettings>) => setSettings((s) => ({ ...s, ...patch }))

  function toggleTheme(id: ThemeId, enabled: boolean) {
    const next = enabled ? [...settings.enabledThemes, id] : settings.enabledThemes.filter((t) => t !== id)
    if (next.length === 0) return
    update({
      enabledThemes: next,
      defaultTheme: next.includes(settings.defaultTheme) ? settings.defaultTheme : next[0],
    })
  }

  async function save() {
    setSaving(true)
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ settings }),
      })
      if (!res.ok) throw new Error()
      const data = await res.json()
      setSettings(data.settings)
      toastSuccess('Ustawienia zapisane', 'Zmiany są widoczne po odświeżeniu stron.')
    } catch {
      toastError('Nie udało się zapisać ustawień', 'Spróbuj ponownie za chwilę.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" aria-label="Wczytywanie ustawień" />
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6 pb-24">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight">Ustawienia serwisu</h1>
        <p className="mt-1 text-muted-foreground">
          Wygląd, dostępne funkcje, rejestracja i ogłoszenie dla wszystkich użytkowników.
        </p>
      </div>

      <Section
        title="Motyw"
        description="Zaznacz motywy dostępne dla użytkowników i wybierz domyślny. Gdy wyłączysz wybór przez użytkowników, wszyscy zobaczą motyw domyślny."
      >
        <div className="grid gap-3 sm:grid-cols-2">
          {THEMES.map((t) => {
            const enabled = settings.enabledThemes.includes(t.id)
            const isDefault = settings.defaultTheme === t.id
            return (
              <div key={t.id} className="space-y-3 rounded-xl border border-[var(--control-border)] bg-surface-1 p-4">
                <span aria-hidden="true" className="flex h-10 overflow-hidden rounded-lg border border-white/15">
                  {t.swatches.map((c) => (
                    <span key={c} className="flex-1" style={{ background: c }} />
                  ))}
                </span>
                <div>
                  <p className="font-bold">{t.label}</p>
                  <p className="text-sm text-muted-foreground">{t.description}</p>
                </div>
                <Switch
                  id={`theme-${t.id}`}
                  label="Dostępny dla użytkowników"
                  checked={enabled}
                  onCheckedChange={(v) => toggleTheme(t.id, v)}
                />
                <label className="flex min-h-[44px] cursor-pointer items-center gap-3 text-sm font-semibold">
                  <input
                    type="radio"
                    name="defaultTheme"
                    className="h-5 w-5 accent-[var(--primary)]"
                    checked={isDefault}
                    disabled={!enabled}
                    onChange={() => update({ defaultTheme: t.id })}
                  />
                  Motyw domyślny
                </label>
              </div>
            )
          })}
        </div>
        <Switch
          id="allow-theme"
          label="Pozwól użytkownikom wybierać motyw"
          checked={settings.allowUserTheme}
          onCheckedChange={(v) => update({ allowUserTheme: v })}
        />
      </Section>

      <Section title="Gęstość i rozmiar tekstu" description="Wartości domyślne dla nowych i niezalogowanych użytkowników.">
        <div className="space-y-2">
          <h3 className="text-sm font-bold">Gęstość okładek</h3>
          <DensityPicker value={settings.defaultDensity} onChange={(v) => update({ defaultDensity: v })} />
          <Switch
            id="allow-density"
            label="Pozwól użytkownikom zmieniać gęstość"
            checked={settings.allowUserDensity}
            onCheckedChange={(v) => update({ allowUserDensity: v })}
          />
        </div>
        <div className="space-y-2">
          <h3 className="text-sm font-bold">Rozmiar tekstu</h3>
          <TextSizePicker value={settings.defaultTextSize} onChange={(v) => update({ defaultTextSize: v })} />
          <Switch
            id="allow-text"
            label="Pozwól użytkownikom zmieniać rozmiar tekstu"
            checked={settings.allowUserTextSize}
            onCheckedChange={(v) => update({ allowUserTextSize: v })}
          />
        </div>
      </Section>

      <Section
        title="Funkcje"
        description="Wyłączona funkcja znika z nawigacji, a jej strony i API przestają działać dla wszystkich."
      >
        <div className="divide-y divide-white/10">
          {FEATURE_KEYS.map((key) => (
            <Switch
              key={key}
              id={`feature-${key}`}
              label={FEATURE_LABELS[key].label}
              description={FEATURE_LABELS[key].description}
              checked={settings.features[key]}
              onCheckedChange={(v) => update({ features: { ...settings.features, [key]: v } })}
            />
          ))}
        </div>
      </Section>

      <Section
        title="Naprawa okładek i cen"
        description="Wspólne rekordy tomów zawierały japońskie okładki i ceny zastępcze 34,99 zapisane z kolekcji użytkowników. Najpierw sprawdź, co zostanie zmienione, potem zastosuj. Warto zrobić kopię bazy przed zastosowaniem."
      >
        <div className="flex flex-wrap gap-3">
          <Button type="button" variant="outline" disabled={repairing} onClick={() => runRepair(false)}>
            {repairing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Sprawdź
          </Button>
          <Button
            type="button"
            disabled={repairing || !repair || repair.applied || repair.seriesAffected === 0}
            onClick={() => runRepair(true)}
          >
            Zastosuj naprawę
          </Button>
        </div>
        {repair && (
          <div className="rounded-lg border border-white/10 bg-surface-1 p-4 text-sm" role="status">
            <p className="font-semibold">{repair.applied ? 'Naprawiono:' : 'Do naprawy:'}</p>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li>okładki tomów z AniList/MangaDex: {repair.foreignCoverImages + repair.foreignCustomCovers}</li>
              <li>ceny zastępcze 34,99 bez źródła: {repair.placeholderPrices}</li>
              <li>dotyczy serii: {repair.seriesAffected}</li>
            </ul>
            {repair.sampleSeries.length > 0 && (
              <p className="mt-2 text-muted-foreground">Np.: {repair.sampleSeries.join(', ')}</p>
            )}
          </div>
        )}
      </Section>

      <Section
        title="Przyklejanie do góry"
        description="Przyklejony element zostaje widoczny podczas przewijania, ale zasłania część treści. Wyłączony przewija się razem ze stroną."
      >
        <div className="divide-y divide-white/10">
          <Switch
            id="sticky-nav"
            label="Przyklej pasek nawigacji"
            checked={settings.stickyNav}
            onCheckedChange={(v) => update({ stickyNav: v })}
          />
          <Switch
            id="sticky-announcement"
            label="Przyklej ogłoszenie"
            checked={settings.stickyAnnouncement}
            onCheckedChange={(v) => update({ stickyAnnouncement: v })}
          />
        </div>
      </Section>

      <Section title="Rejestracja">
        <Switch
          id="registration"
          label="Pozwól na zakładanie nowych kont"
          description="Po wyłączeniu formularz rejestracji odrzuci nowe konta. Istniejący użytkownicy logują się normalnie."
          checked={settings.registrationOpen}
          onCheckedChange={(v) => update({ registrationOpen: v })}
        />
      </Section>

      <Section
        title="Ogłoszenie"
        description="Pasek na górze każdej strony, który użytkownik może zamknąć. Maksymalnie 300 znaków."
      >
        <Switch
          id="announcement"
          label="Pokaż ogłoszenie"
          checked={settings.announcement.enabled}
          onCheckedChange={(v) => update({ announcement: { ...settings.announcement, enabled: v } })}
        />
        <div className="grid gap-4 sm:grid-cols-[14rem_1fr]">
          <div className="space-y-1.5">
            <label htmlFor="ann-level" className="text-sm font-semibold">
              Rodzaj
            </label>
            <select
              id="ann-level"
              value={settings.announcement.level}
              onChange={(e) =>
                update({ announcement: { ...settings.announcement, level: e.target.value as AnnouncementLevel } })
              }
              className="h-11 w-full rounded-lg border border-[var(--control-border)] bg-surface-1 px-3 text-sm"
            >
              <option value="info">Informacja</option>
              <option value="warning">Ostrzeżenie</option>
              <option value="critical">Pilne</option>
            </select>
          </div>
          <div className="space-y-1.5">
            <label htmlFor="ann-text" className="text-sm font-semibold">
              Treść
            </label>
            <textarea
              id="ann-text"
              rows={3}
              maxLength={300}
              value={settings.announcement.text}
              onChange={(e) => update({ announcement: { ...settings.announcement, text: e.target.value } })}
              className="w-full rounded-lg border border-[var(--control-border)] bg-surface-1 p-3 text-sm"
              placeholder="Np. Dziś o 22:00 planowana przerwa techniczna."
            />
            <p className="text-right text-xs text-muted-foreground">{settings.announcement.text.length}/300</p>
          </div>
        </div>
      </Section>

      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-surface-1/95 p-3 backdrop-blur">
        <div className="mx-auto flex max-w-4xl justify-end">
          <Button onClick={save} disabled={saving} className="min-h-[44px] gap-2 px-6">
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            ) : (
              <Save className="h-4 w-4" aria-hidden="true" />
            )}
            Zapisz ustawienia
          </Button>
        </div>
      </div>
    </div>
  )
}
