'use client'

import { createContext, useContext } from 'react'
import { DEFAULT_SITE_SETTINGS, resolveUi, type FeatureKey, type ResolvedUi } from '@/lib/ui-settings'

const defaultUi = resolveUi(DEFAULT_SITE_SETTINGS, {})
const UiSettingsContext = createContext<ResolvedUi>(defaultUi)

export function UiSettingsProvider({ value, children }: { value: ResolvedUi; children: React.ReactNode }) {
  return <UiSettingsContext.Provider value={value}>{children}</UiSettingsContext.Provider>
}

export function useUiSettings(): ResolvedUi {
  return useContext(UiSettingsContext)
}

/** Czy funkcja jest włączona przez admina. */
export function useFeature(key: FeatureKey): boolean {
  return useContext(UiSettingsContext).features[key]
}
