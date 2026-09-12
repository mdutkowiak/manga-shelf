'use client'

import { useEffect, useState } from 'react'
import { Download, X } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[]
  readonly userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>
  prompt(): Promise<void>
}

export function PWAInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [showInstall, setShowInstall] = useState(false)

  useEffect(() => {
    const handler = (e: Event) => {
      const isDismissed = localStorage.getItem('pwa-install-dismissed')
      if (isDismissed) return

      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
      setShowInstall(true)
    }

    window.addEventListener('beforeinstallprompt', handler)

    return () => {
      window.removeEventListener('beforeinstallprompt', handler)
    }
  }, [])

  const handleInstall = async () => {
    if (!deferredPrompt) return

    try {
      await deferredPrompt.prompt()
      const choice = await deferredPrompt.userChoice

      if (choice.outcome === 'accepted') {
        setShowInstall(false)
      }
    } catch (err) {
      console.error('PWA install prompt error:', err)
    } finally {
      setDeferredPrompt(null)
    }
  }

  const handleDismiss = () => {
    setShowInstall(false)
    localStorage.setItem('pwa-install-dismissed', 'true')
  }

  if (!showInstall) return null

  return (
    <div className="fixed bottom-20 left-4 right-4 z-50 md:bottom-auto md:left-auto md:right-4 md:top-4">
      <div className="flex items-center gap-3 rounded-lg border bg-background p-4 shadow-lg">
        <Download className="h-5 w-5 flex-shrink-0" />
        <div className="flex-1">
          <p className="text-sm font-medium">Zainstaluj aplikację</p>
          <p className="text-xs text-muted-foreground">Dodaj MangOwO do ekranu głównego</p>
        </div>
        <Button size="sm" onClick={handleInstall}>
          Instaluj
        </Button>
        <Button size="sm" variant="ghost" onClick={handleDismiss}>
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}
