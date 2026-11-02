import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import {
  DEFAULT_SITE_SETTINGS,
  UI_COOKIE,
  resolveUi,
  sanitizeSiteSettings,
  sanitizeUserPrefs,
  type FeatureKey,
  type ResolvedUi,
  type SiteSettings,
  type UserUiPrefs,
} from '@/lib/ui-settings'

const SITE_SETTINGS_KEY = 'site'
const CACHE_TTL_MS = 15_000

let cache: { value: SiteSettings; at: number } | null = null

/** Ustawienia witryny z bazy (z krótką pamięcią podręczną). Przy awarii bazy zwraca wartości domyślne. */
export async function getSiteSettings(): Promise<SiteSettings> {
  if (cache && Date.now() - cache.at < CACHE_TTL_MS) return cache.value
  let value = DEFAULT_SITE_SETTINGS
  try {
    const row = await prisma.siteSetting.findUnique({ where: { key: SITE_SETTINGS_KEY } })
    value = sanitizeSiteSettings(row?.value)
  } catch (error) {
    console.error('[SITE_SETTINGS] Nie udało się odczytać ustawień, używam domyślnych:', error)
  }
  cache = { value, at: Date.now() }
  return value
}

export async function saveSiteSettings(input: unknown, updatedById: string): Promise<SiteSettings> {
  const value = sanitizeSiteSettings(input)
  const json = JSON.parse(JSON.stringify(value))
  await prisma.siteSetting.upsert({
    where: { key: SITE_SETTINGS_KEY },
    update: { value: json, updatedById },
    create: { key: SITE_SETTINGS_KEY, value: json, updatedById },
  })
  cache = { value, at: Date.now() }
  return value
}

export async function getUserPrefsFromDb(userId: string): Promise<UserUiPrefs> {
  try {
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { uiPreferences: true } })
    return sanitizeUserPrefs(user?.uiPreferences)
  } catch {
    return {}
  }
}

export function parseUiCookie(raw: string | undefined): UserUiPrefs | null {
  if (!raw) return null
  try {
    return sanitizeUserPrefs(JSON.parse(decodeURIComponent(raw)))
  } catch {
    return null
  }
}

/** Efektywny wygląd dla bieżącego żądania: ciasteczko, a gdy go brak, preferencje zalogowanego użytkownika z bazy. */
export async function getResolvedUi(): Promise<ResolvedUi> {
  // cookies() najpierw: wymusza renderowanie dynamiczne, zanim zaczniemy czytać bazę (także podczas budowania)
  const jar = await cookies()
  const site = await getSiteSettings()
  let prefs = parseUiCookie(jar.get(UI_COOKIE)?.value)
  if (!prefs) {
    const session = await auth().catch(() => null)
    prefs = session?.user?.id ? await getUserPrefsFromDb(session.user.id) : {}
  }
  return resolveUi(site, prefs)
}

/** Guard dla route'ów API: zwraca odpowiedź 403, gdy funkcja jest wyłączona przez admina. */
export async function requireFeature(key: FeatureKey): Promise<NextResponse | null> {
  const site = await getSiteSettings()
  if (!site.features[key]) {
    return NextResponse.json({ error: 'Ta funkcja jest obecnie wyłączona' }, { status: 403 })
  }
  return null
}
