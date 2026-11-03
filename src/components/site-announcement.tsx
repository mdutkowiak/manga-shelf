'use client'

import { useState } from 'react'
import { AlertTriangle, Info, OctagonAlert, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { ANNOUNCEMENT_COOKIE, announcementKey } from '@/lib/ui-settings'
import { useDismissedAnnouncement, useUiSettings } from '@/components/ui-settings-provider'

const STYLES = {
  info: { icon: Info, box: 'border-cyan-500/40 bg-cyan-500/10 text-cyan-100', role: 'status' as const },
  warning: { icon: AlertTriangle, box: 'border-amber-500/50 bg-amber-500/10 text-amber-100', role: 'status' as const },
  critical: { icon: OctagonAlert, box: 'border-rose-500/50 bg-rose-500/10 text-rose-100', role: 'alert' as const },
}

/** Ogłoszenie ustawiane przez admina; użytkownik może je zamknąć do końca sesji przeglądarki (ciasteczko sesyjne, czytane przez serwer). */
export function SiteAnnouncement() {
  const { announcement } = useUiSettings()
  const dismissedKey = useDismissedAnnouncement()
  const key = announcementKey(announcement.text)
  const [justDismissed, setJustDismissed] = useState(false)

  if (!announcement.enabled || justDismissed || dismissedKey === key) return null
  const { icon: Icon, box, role } = STYLES[announcement.level]

  return (
    <div role={role} className={cn('relative border-b px-12 py-2.5 text-sm md:px-14', box)}>
      <div className="mx-auto flex max-w-4xl items-start justify-center gap-3 text-center sm:items-center">
        <Icon className="mt-0.5 h-5 w-5 shrink-0 sm:mt-0" aria-hidden="true" />
        <p className="leading-relaxed">{announcement.text}</p>
      </div>
      <button
        type="button"
        aria-label="Zamknij ogłoszenie"
        className="absolute right-1 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-md hover:bg-white/10 md:right-3"
        onClick={() => {
          document.cookie = `${ANNOUNCEMENT_COOKIE}=${key}; path=/; SameSite=Lax`
          setJustDismissed(true)
        }}
      >
        <X className="h-4 w-4" aria-hidden="true" />
      </button>
    </div>
  )
}
