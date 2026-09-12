'use client'

import { WifiOff } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function OfflinePage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4 text-center">
      <WifiOff className="mb-4 h-16 w-16 text-muted-foreground" />
      <h1 className="mb-2 text-2xl font-bold">Brak połączenia</h1>
      <p className="mb-6 text-muted-foreground">
        Sprawdź połączenie z internetem i spróbuj ponownie.
      </p>
      <Button onClick={() => window.location.reload()}>Ponów próbę</Button>
    </div>
  )
}
