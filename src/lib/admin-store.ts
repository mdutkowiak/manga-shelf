'use client'

export interface AdminVolumeOverride {
  volumeNumber: number
  customCoverUrl?: string | null
  pricePLN?: number
  releaseDate?: string
  status?: string
}

export interface AdminMangaOverride {
  id: string
  title: string
  polishTitle?: string
  publisher?: string
  statusInPoland: 'ONGOING' | 'FINISHED' | 'CANCELLED' | 'HIATUS'
  totalVolumes: number
  totalVolumesJapan?: number | null
  customCoverUrl?: string | null
  coverUrl?: string | null
  defaultCover?: string | null
  volumes: AdminVolumeOverride[]
}

export interface AdminCustomRelease {
  id: string
  mangaId?: string
  seriesTitle: string
  volumeNumber: number
  releaseDate: string
  day?: string
  month?: string
  year?: number
  publisher: string
  pricePLN: number
  shopPrice?: number
  coverUrl: string
  shopUrl?: string
  shopLinks?: { name: string; url: string; price?: number; logo?: string }[]
  ignoreScraper?: boolean
  description?: string
}

import { normalizeTitleKey, areSameSeries } from '@/lib/title-utils'

const MANGA_OVERRIDES_KEY = 'mangowo_admin_manga_overrides_v1'
const GLOBAL_OVERRIDES_KEY = 'mangowo_global_overrides_v1'
const CUSTOM_RELEASES_KEY = 'mangowo_admin_custom_releases_v1'
const DELETED_RELEASES_KEY = 'mangowo_admin_deleted_release_ids_v1'
const EDITED_RELEASES_KEY = 'mangowo_admin_edited_releases_v1'

let globalOverridesCache: Record<string, AdminMangaOverride> | null = null

/**
 * Fetch global manga overrides from PostgreSQL (/api/manga/overrides)
 * and cache them locally in localStorage and in-memory cache.
 * Broadcasts updates to the whole app.
 */
export async function syncGlobalOverridesFromServer(): Promise<Record<string, AdminMangaOverride>> {
  if (typeof window === 'undefined') return {}
  try {
    const res = await fetch('/api/manga/overrides', { cache: 'no-store' })
    if (res.ok) {
      const data = await res.json()
      if (data?.success && data.overrides) {
        globalOverridesCache = data.overrides
        localStorage.setItem(GLOBAL_OVERRIDES_KEY, JSON.stringify(data.overrides))
        window.dispatchEvent(new Event('mangowo_admin_updated'))
        window.dispatchEvent(new Event('mangowo_collection_updated'))
        return getAdminMangaOverrides()
      }
    }
  } catch (err) {
    console.warn('syncGlobalOverridesFromServer error:', err)
  }
  return getAdminMangaOverrides()
}

/**
 * Get all manga overrides (combining global server overrides with local admin overrides)
 */
export function getAdminMangaOverrides(): Record<string, AdminMangaOverride> {
  if (typeof window === 'undefined') return {}
  try {
    let globalOv: Record<string, AdminMangaOverride> = {}
    if (globalOverridesCache) {
      globalOv = globalOverridesCache
    } else {
      const rawGlobal = localStorage.getItem(GLOBAL_OVERRIDES_KEY)
      if (rawGlobal) {
        globalOv = JSON.parse(rawGlobal)
        globalOverridesCache = globalOv
      }
    }

    const rawLocal = localStorage.getItem(MANGA_OVERRIDES_KEY)
    const localOv: Record<string, AdminMangaOverride> = rawLocal ? JSON.parse(rawLocal) : {}

    return { ...globalOv, ...localOv }
  } catch {
    return {}
  }
}

/**
 * Save or update a manga override by mangaId or normalized title
 */
export function saveAdminMangaOverride(mangaId: string, override: Partial<AdminMangaOverride>): Record<string, AdminMangaOverride> {
  if (typeof window === 'undefined') return {}
  const all = getAdminMangaOverrides()
  const existing = all[mangaId] || {
    id: mangaId,
    title: override.title || 'Manga',
    polishTitle: override.polishTitle || '',
    publisher: override.publisher || 'Waneko',
    statusInPoland: 'ONGOING',
    totalVolumes: 20,
    totalVolumesJapan: override.totalVolumesJapan ?? null,
    customCoverUrl: null,
    volumes: [],
  }

  const updated: AdminMangaOverride = {
    ...existing,
    ...override,
    volumes: override.volumes || existing.volumes || [],
  }

  all[mangaId] = updated
  localStorage.setItem(MANGA_OVERRIDES_KEY, JSON.stringify(all))

  // Update in-memory cache immediately
  if (!globalOverridesCache) globalOverridesCache = {}
  globalOverridesCache[mangaId] = updated

  // Broadcast update to all pages
  window.dispatchEvent(new Event('mangowo_admin_updated'))
  window.dispatchEvent(new Event('mangowo_collection_updated'))

  return all
}

/**
 * Delete a manga override
 */
export function deleteAdminMangaOverride(mangaId: string) {
  if (typeof window === 'undefined') return
  const all = getAdminMangaOverrides()
  delete all[mangaId]
  localStorage.setItem(MANGA_OVERRIDES_KEY, JSON.stringify(all))

  if (globalOverridesCache) {
    delete globalOverridesCache[mangaId]
  }

  try {
    const rawGlobal = localStorage.getItem(GLOBAL_OVERRIDES_KEY)
    if (rawGlobal) {
      const parsed = JSON.parse(rawGlobal)
      delete parsed[mangaId]
      localStorage.setItem(GLOBAL_OVERRIDES_KEY, JSON.stringify(parsed))
    }
  } catch {}

  window.dispatchEvent(new Event('mangowo_admin_updated'))
  window.dispatchEvent(new Event('mangowo_collection_updated'))
}

/**
 * Default initial custom releases for Admin (empty in production)
 */
export const defaultAdminCustomReleases: AdminCustomRelease[] = []

/**
 * Get all custom releases added manually by Admin
 */
export function getAdminCustomReleases(): AdminCustomRelease[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(CUSTOM_RELEASES_KEY)
    if (raw !== null) {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed)) {
        // Automatically purge any legacy mock item 'adm-custom-oshi-16'
        const filtered = parsed.filter((r) => r && r.id !== 'adm-custom-oshi-16')
        if (filtered.length !== parsed.length) {
          localStorage.setItem(CUSTOM_RELEASES_KEY, JSON.stringify(filtered))
        }
        return filtered
      }
    }
  } catch {}
  return []
}

/**
 * Save custom releases list
 */
export function saveAdminCustomReleases(releases: AdminCustomRelease[]) {
  if (typeof window === 'undefined') return
  localStorage.setItem(CUSTOM_RELEASES_KEY, JSON.stringify(releases))

  window.dispatchEvent(new Event('mangowo_admin_updated'))
  window.dispatchEvent(new Event('mangowo_collection_updated'))
}

/**
 * Get IDs of scraped releases deleted by Admin
 */
export function getAdminDeletedReleaseIds(): string[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(DELETED_RELEASES_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

/**
 * Add a release ID to deleted list
 */
export function addAdminDeletedReleaseId(id: string) {
  if (typeof window === 'undefined') return
  const deleted = getAdminDeletedReleaseIds()
  if (!deleted.includes(id)) {
    deleted.push(id)
    localStorage.setItem(DELETED_RELEASES_KEY, JSON.stringify(deleted))
    window.dispatchEvent(new Event('mangowo_admin_updated'))
    window.dispatchEvent(new Event('mangowo_collection_updated'))
  }
}

/**
 * Completely delete an admin release (from custom releases, edited releases, and mark as deleted)
 */
export function deleteAdminRelease(id: string) {
  if (typeof window === 'undefined') return

  // 1. Remove from custom releases
  const custom = getAdminCustomReleases()
  const filteredCustom = custom.filter((r) => r.id !== id)
  localStorage.setItem(CUSTOM_RELEASES_KEY, JSON.stringify(filteredCustom))

  // 2. Add to deleted IDs blacklist
  addAdminDeletedReleaseId(id)

  // 3. Remove from edited releases
  const edited = getAdminEditedReleases()
  if (edited[id]) {
    delete edited[id]
    localStorage.setItem(EDITED_RELEASES_KEY, JSON.stringify(edited))
  }

  window.dispatchEvent(new Event('mangowo_admin_updated'))
  window.dispatchEvent(new Event('mangowo_collection_updated'))
}

/**
 * Get edited releases mapping
 */
export function getAdminEditedReleases(): Record<string, AdminCustomRelease> {
  if (typeof window === 'undefined') return {}
  try {
    const raw = localStorage.getItem(EDITED_RELEASES_KEY)
    return raw ? JSON.parse(raw) : {}
  } catch {
    return {}
  }
}

/**
 * Save an edited scraped release
 */
export function saveAdminEditedRelease(id: string, updated: AdminCustomRelease) {
  if (typeof window === 'undefined') return
  const edited = getAdminEditedReleases()
  edited[id] = updated
  localStorage.setItem(EDITED_RELEASES_KEY, JSON.stringify(edited))

  window.dispatchEvent(new Event('mangowo_admin_updated'))
  window.dispatchEvent(new Event('mangowo_collection_updated'))
}

/**
 * Helper to resolve the effective cover image for any volume anywhere on the site
 */
export function getEffectiveVolumeCover(seriesTitle: string, volNum: number, fallbackUrl?: string): string {
  const normKey = normalizeTitleKey(seriesTitle)

  // 1. Check admin manga overrides first
  const overrides = getAdminMangaOverrides()
  for (const ov of Object.values(overrides)) {
    if (
      areSameSeries(
        { title: seriesTitle },
        { id: ov.id, title: ov.title, polishTitle: ov.polishTitle }
      )
    ) {
      const matchedVol = ov.volumes?.find((v) => v.volumeNumber === volNum)
      if (matchedVol?.customCoverUrl) return matchedVol.customCoverUrl
      if (volNum === 1 && ov.customCoverUrl) return ov.customCoverUrl
      if (ov.customCoverUrl && (!ov.volumes || ov.volumes.length === 0)) return ov.customCoverUrl
    }
  }

  // 2. Check admin edited scraped releases
  const editedReleases = getAdminEditedReleases()
  for (const eId of Object.keys(editedReleases)) {
    const ed = editedReleases[eId]
    if (ed && areSameSeries({ title: seriesTitle }, { title: ed.seriesTitle }) && ed.volumeNumber === volNum) {
      if (ed.coverUrl && ed.coverUrl.trim()) return ed.coverUrl
    }
  }

  // 3. Check admin custom releases for this series volume
  const customReleases = getAdminCustomReleases()
  const matchedRel = customReleases.find(
    (r) => areSameSeries({ title: seriesTitle }, { title: r.seriesTitle }) && r.volumeNumber === volNum
  )
  if (matchedRel?.coverUrl && matchedRel.coverUrl.trim()) return matchedRel.coverUrl

  if (fallbackUrl && fallbackUrl.trim() && !fallbackUrl.includes('placeholder') && !fallbackUrl.includes('mangadex.org')) {
    return fallbackUrl
  }

  // Known series AniList CDN covers
  if (normKey === 'bleach') {
    return 'https://s4.anilist.co/file/anilistcdn/media/manga/cover/large/bx30012-7Uo49q0iX6qX.jpg'
  }
  if (normKey === 'attack-on-titan') {
    return 'https://s4.anilist.co/file/anilistcdn/media/manga/cover/large/bx30001-f5W10d48s5kL.jpg'
  }
  if (normKey === 'one-piece') {
    return 'https://s4.anilist.co/file/anilistcdn/media/manga/cover/large/bx30013-1O9ILH89zgG4.jpg'
  }
  if (normKey === 'jujutsu-kaisen') {
    return 'https://s4.anilist.co/file/anilistcdn/media/manga/cover/large/bx101517-H3eeGGewnUjD.jpg'
  }
  if (normKey === 'chainsaw-man') {
    return 'https://s4.anilist.co/file/anilistcdn/media/manga/cover/large/bx105778-9MhW0K0bUf7n.jpg'
  }
  if (normKey === 'frieren') {
    return 'https://s4.anilist.co/file/anilistcdn/media/manga/cover/large/bx118586-kXQeHhyoN36P.jpg'
  }
  if (normKey === 'oshi-no-ko') {
    return 'https://s4.anilist.co/file/anilistcdn/media/manga/cover/large/bx117195-gqgT4RskmK0E.jpg'
  }

  return fallbackUrl || ''
}
