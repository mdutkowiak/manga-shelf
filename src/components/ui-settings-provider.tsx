'use client'

import { createContext, useContext } from 'react'
import { DEFAULT_SITE_SETTINGS, resolveUi, type FeatureKey, type ResolvedUi } from '@/lib/ui-settings'

const defaultUi = resolveUi(DEFAULT_SITE_SETTINGS, {})
const UiSettingsContext = createContext<ResolvedUi>(defaultUi)

const DismissedAnnouncementContext = createContext<string | null>(null)

export function UiSettingsProvider({
  value,
  dismissedAnnouncement = null,
  children,
}: {
  value: ResolvedUi
  /** Klucz zamkniętego ogłoszenia z ciasteczka, odczytany po stronie serwera (bez migotania po odświeżeniu). */
  dismissedAnnouncement?: string | null
  children: React.ReactNode
}) {
  return (
    <UiSettingsContext.Provider value={value}>
      <DismissedAnnouncementContext.Provider value={dismissedAnnouncement}>{children}</DismissedAnnouncementContext.Provider>
    </UiSettingsContext.Provider>
  )
}

export function useDismissedAnnouncement(): string | null {
  return useContext(DismissedAnnouncementContext)
}

export function useUiSettings(): ResolvedUi {
  return useContext(UiSettingsContext)
}

/** Czy funkcja jest włączona przez admina. */
export function useFeature(key: FeatureKey): boolean {
  return useContext(UiSettingsContext).features[key]
}
