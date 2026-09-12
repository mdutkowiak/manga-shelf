'use client'

import { SessionProvider as NextAuthSessionProvider } from 'next-auth/react'
import { useEffect, useState } from 'react'

interface SafeSessionProviderProps {
  children: React.ReactNode
}

export function SafeSessionProvider({ children }: SafeSessionProviderProps) {
  const [hasError, setHasError] = useState(false)

  useEffect(() => {
    const handleError = (event: ErrorEvent) => {
      if (event.message?.includes('auth') || event.message?.includes('fetch')) {
        setHasError(true)
      }
    }

    window.addEventListener('error', handleError)
    return () => window.removeEventListener('error', handleError)
  }, [])

  if (hasError) {
    return <>{children}</>
  }

  return (
    <NextAuthSessionProvider>{children}</NextAuthSessionProvider>
  )
}
