'use client'

import { SessionProvider } from 'next-auth/react'

interface SafeSessionProviderProps {
  children: React.ReactNode
}

export function SafeSessionProvider({ children }: SafeSessionProviderProps) {
  return <SessionProvider>{children}</SessionProvider>
}
