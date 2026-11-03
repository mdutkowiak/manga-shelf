// Wspólne (serwer + klient) typy, wartości domyślne i walidacja ustawień wyglądu i funkcji.
// Bez importów serwerowych, żeby plik można było używać w komponentach klienckich.

export const THEMES = [
  {
    id: 'day',
    label: 'Dzień',
    description: 'Jasny, papierowy motyw z wysokim kontrastem. Domyślny wygląd MangaHub.pl.',
    swatches: ['#F6F5F2', '#FFFFFF', '#6D28D9', '#1B1B2F'],
  },
  {
    id: 'night',
    label: 'Nocna półka',
    description: 'Ciemny, fioletowy motyw z podwyższonym kontrastem.',
    swatches: ['#0B0E17', '#141826', '#6D28D9', '#C4B5FD'],
  },
  {
    id: 'shelf',
    label: 'Regał',
    description: 'Neutralna szarość i bursztynowy akcent, okładki na pierwszym planie.',
    swatches: ['#111214', '#1A1C1F', '#B8560B', '#F5B83D'],
  },
] as const

export type ThemeId = (typeof THEMES)[number]['id']
export const THEME_IDS = THEMES.map((t) => t.id) as ThemeId[]

export const DENSITIES = [
  { id: 'comfortable', label: 'Wygodna', description: 'Duże okładki i większe odstępy.' },
  { id: 'compact', label: 'Gęsta', description: 'Więcej okładek na ekranie.' },
] as const
export type Density = (typeof DENSITIES)[number]['id']

export const TEXT_SIZES = [
  { id: 'normal', label: 'Standardowy', description: 'Domyślny rozmiar tekstu.' },
  { id: 'large', label: 'Powiększony', description: 'Większy tekst, najmniejsze napisy mają co najmniej 12 px.' },
] as const
export type TextSize = (typeof TEXT_SIZES)[number]['id']

export const FEATURE_KEYS = ['chat', 'gamification', 'rankings', 'deals', 'community', 'calendar'] as const
export type FeatureKey = (typeof FEATURE_KEYS)[number]

export const FEATURE_LABELS: Record<FeatureKey, { label: string; description: string }> = {
  chat: { label: 'Czat', description: 'Okno czatu między użytkownikami.' },
  gamification: { label: 'Gamifikacja', description: 'Poziomy, XP, odznaki i osiągnięcia.' },
  rankings: { label: 'Rankingi społeczności', description: 'Top mangi i liderzy kolekcji na stronie głównej.' },
  deals: { label: 'Promocje', description: 'Strona z cenami i promocjami w sklepach.' },
  community: { label: 'Społeczność', description: 'Znajomi, profile publiczne i wyszukiwanie użytkowników.' },
  calendar: { label: 'Kalendarz premier', description: 'Strona z harmonogramem premier.' },
}

export type AnnouncementLevel = 'info' | 'warning' | 'critical'

export interface Announcement {
  enabled: boolean
  text: string
  level: AnnouncementLevel
}

export interface SiteSettings {
  defaultTheme: ThemeId
  enabledThemes: ThemeId[]
  allowUserTheme: boolean
  defaultDensity: Density
  allowUserDensity: boolean
  defaultTextSize: TextSize
  allowUserTextSize: boolean
  features: Record<FeatureKey, boolean>
  registrationOpen: boolean
  announcement: Announcement
}

export interface UserUiPrefs {
  theme?: ThemeId
  density?: Density
  textSize?: TextSize
}

/** Efektywne ustawienia po połączeniu wartości domyślnych admina z wyborem użytkownika. */
export interface ResolvedUi {
  theme: ThemeId
  density: Density
  textSize: TextSize
  features: Record<FeatureKey, boolean>
  announcement: Announcement
  /** Co użytkownik może samodzielnie zmieniać (wg ustawień admina). */
  permissions: {
    theme: boolean
    density: boolean
    textSize: boolean
    availableThemes: ThemeId[]
  }
}

export const DEFAULT_SITE_SETTINGS: SiteSettings = {
  defaultTheme: 'day',
  enabledThemes: ['day', 'night', 'shelf'],
  allowUserTheme: true,
  defaultDensity: 'comfortable',
  allowUserDensity: true,
  defaultTextSize: 'normal',
  allowUserTextSize: true,
  features: { chat: true, gamification: true, rankings: true, deals: true, community: true, calendar: true },
  registrationOpen: true,
  announcement: { enabled: false, text: '', level: 'info' },
}

export const UI_COOKIE = 'mangowo_ui'
/** Ciasteczko sesyjne z kluczem zamkniętego ogłoszenia (żeby serwer nie renderował go ponownie). */
export const ANNOUNCEMENT_COOKIE = 'mangowo_ann'

/** Klucz ogłoszenia zależny od jego tekstu: zmiana treści pokazuje ogłoszenie znowu. */
export function announcementKey(text: string): string {
  let hash = 0
  for (let i = 0; i < text.length; i++) hash = (hash * 31 + text.charCodeAt(i)) | 0
  return String(hash)
}

const isOneOf = <T extends string>(list: readonly T[], v: unknown): v is T =>
  typeof v === 'string' && (list as readonly string[]).includes(v)

/** Czyści dowolny obiekt do poprawnych preferencji użytkownika (nieznane i błędne pola są pomijane). */
export function sanitizeUserPrefs(input: unknown): UserUiPrefs {
  if (!input || typeof input !== 'object') return {}
  const o = input as Record<string, unknown>
  const out: UserUiPrefs = {}
  if (isOneOf(THEME_IDS, o.theme)) out.theme = o.theme
  if (isOneOf(DENSITIES.map((d) => d.id), o.density)) out.density = o.density as Density
  if (isOneOf(TEXT_SIZES.map((t) => t.id), o.textSize)) out.textSize = o.textSize as TextSize
  return out
}

/** Czyści dowolny obiekt do kompletnych ustawień witryny, brakujące pola dostają wartości domyślne. */
export function sanitizeSiteSettings(input: unknown): SiteSettings {
  const d = DEFAULT_SITE_SETTINGS
  const o = (input && typeof input === 'object' ? input : {}) as Record<string, unknown>
  const bool = (v: unknown, fallback: boolean) => (typeof v === 'boolean' ? v : fallback)

  let enabledThemes = Array.isArray(o.enabledThemes) ? o.enabledThemes.filter((t): t is ThemeId => isOneOf(THEME_IDS, t)) : d.enabledThemes
  if (enabledThemes.length === 0) enabledThemes = d.enabledThemes
  const defaultTheme = isOneOf(THEME_IDS, o.defaultTheme) && enabledThemes.includes(o.defaultTheme) ? o.defaultTheme : enabledThemes[0]

  const rawFeatures = (o.features && typeof o.features === 'object' ? o.features : {}) as Record<string, unknown>
  const features = { ...d.features }
  for (const key of FEATURE_KEYS) features[key] = bool(rawFeatures[key], d.features[key])

  const rawAnn = (o.announcement && typeof o.announcement === 'object' ? o.announcement : {}) as Record<string, unknown>
  const announcement: Announcement = {
    enabled: bool(rawAnn.enabled, false),
    text: typeof rawAnn.text === 'string' ? rawAnn.text.slice(0, 300) : '',
    level: isOneOf(['info', 'warning', 'critical'] as const, rawAnn.level) ? rawAnn.level : 'info',
  }
  if (!announcement.text.trim()) announcement.enabled = false

  return {
    defaultTheme,
    enabledThemes,
    allowUserTheme: bool(o.allowUserTheme, d.allowUserTheme),
    defaultDensity: isOneOf(DENSITIES.map((x) => x.id), o.defaultDensity) ? (o.defaultDensity as Density) : d.defaultDensity,
    allowUserDensity: bool(o.allowUserDensity, d.allowUserDensity),
    defaultTextSize: isOneOf(TEXT_SIZES.map((x) => x.id), o.defaultTextSize) ? (o.defaultTextSize as TextSize) : d.defaultTextSize,
    allowUserTextSize: bool(o.allowUserTextSize, d.allowUserTextSize),
    features,
    registrationOpen: bool(o.registrationOpen, d.registrationOpen),
    announcement,
  }
}

/** Łączy ustawienia admina z wyborem użytkownika; wybór użytkownika działa tylko tam, gdzie admin na to pozwala. */
export function resolveUi(site: SiteSettings, user: UserUiPrefs): ResolvedUi {
  const theme =
    site.allowUserTheme && user.theme && site.enabledThemes.includes(user.theme) ? user.theme : site.defaultTheme
  return {
    theme,
    density: site.allowUserDensity && user.density ? user.density : site.defaultDensity,
    textSize: site.allowUserTextSize && user.textSize ? user.textSize : site.defaultTextSize,
    features: site.features,
    announcement: site.announcement,
    permissions: {
      theme: site.allowUserTheme && site.enabledThemes.length > 1,
      density: site.allowUserDensity,
      textSize: site.allowUserTextSize,
      availableThemes: site.enabledThemes,
    },
  }
}
