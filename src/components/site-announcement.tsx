'use client'

import { useEffect, useState } from 'react'
import { AlertTriangle, Info, OctagonAlert, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useUiSettings } from '@/components/ui-settings-provider'

const STYLES = {
  info: { icon: Info, box: 'border-cyan-500/40 bg-cyan-500/10 text-cyan-100', role: 'status' as const },
  warning: { icon: AlertTriangle, box: 'border-amber-500/50 bg-amber-500/10 text-amber-100', role: 'status' as const },
  critical: { icon: OctagonAlert, box: 'border-rose-500/50 bg-rose-500/10 text-rose-100', role: 'alert' as const },
}

function storageKey(text: string) {
  let hash = 0
  for (let i = 0; i < text.length; i++) hash = (hash * 31 + text.charCodeAt(i)) | 0
  return `mangowo_announcement_${hash}`
}

/** Ogłoszenie ustawiane przez admina; użytkownik może je zamknąć do końca sesji przeglądarki. */
export function SiteAnnouncement() {
  const { announcement } = useUiSettings()
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    if (!announcement.enabled) return
    try {
      setDismissed(sessionStorage.getItem(storageKey(announcement.text)) === '1')
    } catch {}
  }, [announcement.enabled, announcement.text])

  if (!announcement.enabled || dismissed) return null
  const { icon: Icon, box, role } = STYLES[announcement.level]

  return (
    <div role={role} className={cn('flex items-start gap-3 border-b px-4 py-3 text-sm', box)}>
      <Icon className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
      <p className="flex-1 leading-relaxed">{announcement.text}</p>
      <button
        type="button"
        aria-label="Zamknij ogłoszenie"
        className="-m-2 rounded-md p-2 hover:bg-white/10"
        onClick={() => {
          try {
            sessionStorage.setItem(storageKey(announcement.text), '1')
          } catch {}
          setDismissed(true)
        }}
      >
        <X className="h-4 w-4" aria-hidden="true" />
      </button>
    </div>
  )
}
