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
  mangaId?: string
  anilistId?: number | null
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

import { normalizeTitleKey, areSameSeries, registerDynamicAlias, getCanonicalPolishTitle } from '@/lib/title-utils'

const MANGA_OVERRIDES_KEY = 'mangowo_admin_manga_overrides_v1'
const GLOBAL_OVERRIDES_KEY = 'mangowo_global_overrides_v1'
const CUSTOM_RELEASES_KEY = 'mangowo_admin_custom_releases_v1'
const DELETED_RELEASES_KEY = 'mangowo_admin_deleted_release_ids_v1'
const EDITED_RELEASES_KEY = 'mangowo_admin_edited_releases_v1'

let globalOverridesCache: Record<string, AdminMangaOverride> | null = null

/**
 * Calculate quality score for an override record. Higher score means richer, more trustworthy data.
 */
function getOverrideQualityScore(ov: AdminMangaOverride | null | undefined): number {
  if (!ov || typeof ov !== 'object') return -1
  let score = 0
  if (ov.polishTitle && ov.polishTitle.trim().length > 0 && ov.polishTitle.trim() !== ov.title.trim()) {
    score += 40
  }
  if (ov.customCoverUrl && !ov.customCoverUrl.includes('placeholder')) {
    score += 20
  }
  if (Array.isArray(ov.volumes) && ov.volumes.length > 0) {
    const customVolCount = ov.volumes.filter((v) => v.customCoverUrl && !v.customCoverUrl.includes('placeholder')).length
    score += customVolCount * 10
    score += ov.volumes.length
  }
  if (ov.totalVolumes && ov.totalVolumes > 0) {
    score += 5
  }
  if (ov.publisher && ov.publisher !== 'Inne') {
    score += 5
  }
  return score
}

/**
 * Merges server overrides (globalOv) and local overrides (localOv) authoritatively.
 * PostgreSQL database (globalOv) is the Single Source of Truth (SSOT).
 * Local overrides can complement server data, but empty/stale local fields can never erase non-empty server fields.
 */
function mergeOverridesAuthoritative(
  globalOv: Record<string, AdminMangaOverride>,
  localOv: Record<string, AdminMangaOverride>
): Record<string, AdminMangaOverride> {
  const result: Record<string, AdminMangaOverride> = { ...globalOv }

  for (const [key, localItem] of Object.entries(localOv)) {
    if (!localItem || typeof localItem !== 'object') continue

    const globalItem = result[key]
    if (!globalItem) {
      result[key] = localItem
      continue
    }

    // Merge volumes: prefer custom covers from either, server takes priority on collision
    const volMap = new Map<number, AdminVolumeOverride>()
    if (globalItem.volumes) {
      globalItem.volumes.forEach((v) => volMap.set(v.volumeNumber, { ...v }))
    }
    if (localItem.volumes) {
      localItem.volumes.forEach((v) => {
        const existing = volMap.get(v.volumeNumber)
        if (!existing) {
          volMap.set(v.volumeNumber, { ...v })
        } else if (!existing.customCoverUrl && v.customCoverUrl) {
          volMap.set(v.volumeNumber, { ...existing, customCoverUrl: v.customCoverUrl, pricePLN: v.pricePLN || existing.pricePLN })
        }
      })
    }

    const mergedVolumes = Array.from(volMap.values()).sort((a, b) => a.volumeNumber - b.volumeNumber)

    // Polish title: never allow empty string from local to overwrite non-empty global or canonical title
    const effectivePolishTitle =
      (globalItem.polishTitle && globalItem.polishTitle.trim().length > 0 && globalItem.polishTitle !== globalItem.title)
        ? globalItem.polishTitle
        : (localItem.polishTitle && localItem.polishTitle.trim().length > 0 && localItem.polishTitle !== localItem.title)
        ? localItem.polishTitle
        : getCanonicalPolishTitle(globalItem.title || localItem.title) || globalItem.polishTitle || localItem.polishTitle || ''

    const merged: AdminMangaOverride = {
      ...globalItem,
      ...localItem,
      title: globalItem.title || localItem.title,
      polishTitle: effectivePolishTitle,
      publisher: (globalItem.publisher && globalItem.publisher !== 'Inne') ? globalItem.publisher : (localItem.publisher || globalItem.publisher),
      totalVolumes: globalItem.totalVolumes || localItem.totalVolumes || 1,
      totalVolumesJapan: globalItem.totalVolumesJapan !== undefined ? globalItem.totalVolumesJapan : localItem.totalVolumesJapan,
      customCoverUrl: globalItem.customCoverUrl || localItem.customCoverUrl || null,
      volumes: mergedVolumes.length > 0 ? mergedVolumes : (globalItem.volumes || localItem.volumes || []),
    }

    result[key] = merged
  }

  return result
}

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
        const indexed: Record<string, AdminMangaOverride> = { ...data.overrides }
        for (const item of Object.values(data.overrides) as AdminMangaOverride[]) {
          if (!item || !item.title) continue
          const canon = normalizeTitleKey(item.title)
          if (canon) {
            registerDynamicAlias(item.title, canon, item.polishTitle)
            if (item.polishTitle) {
              registerDynamicAlias(item.polishTitle, canon, item.polishTitle)
            }
          }
          if (item.id) indexed[item.id] = item
          if ((item as any).mangaId) indexed[(item as any).mangaId] = item
          const norm = normalizeTitleKey(item.title)
          if (norm) indexed[norm] = item
          if (item.polishTitle) {
            const normPol = normalizeTitleKey(item.polishTitle)
            if (normPol) indexed[normPol] = item
          }
        }
        globalOverridesCache = indexed
        localStorage.setItem(GLOBAL_OVERRIDES_KEY, JSON.stringify(indexed))
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

function cleanCorruptedOverrides(dict: Record<string, AdminMangaOverride>): { cleaned: Record<string, AdminMangaOverride>; changed: boolean } {
  let changed = false
  const res: Record<string, AdminMangaOverride> = {}
  for (const [k, v] of Object.entries(dict)) {
    if (!v || typeof v !== 'object') {
      changed = true
      continue
    }
    // Purge corrupted jujutsu-kaisen alias entries that belonged to other titles
    if (k === 'jujutsu-kaisen' || k.startsWith('jujutsu-kaisen--')) {
      const vNorm = normalizeTitleKey(v.title)
      if (vNorm && !vNorm.startsWith('jujutsu-kaisen')) {
        changed = true
        continue
      }
    }

    // Auto-heal known canonical titles with missing Polish titles
    const canonPolish = getCanonicalPolishTitle(v.title || k)
    if (canonPolish && (!v.polishTitle || v.polishTitle === v.title)) {
      v.polishTitle = canonPolish
      changed = true
    }

    // Ensure publisher is accurate
    const norm = normalizeTitleKey(v.title || k)
    if (norm === 'seihantai-na-kimi-to-boku' || norm === 'przeciwienstwa-sie-przyciagaja') {
      if (!v.publisher || v.publisher === 'Inne') {
        v.publisher = 'Waneko'
        changed = true
      }
      if (!v.polishTitle || v.polishTitle !== 'Przeciwieństwa się przyciągają') {
        v.polishTitle = 'Przeciwieństwa się przyciągają'
        changed = true
      }
    }

    res[k] = v
  }
  return { cleaned: res, changed }
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
        const check = cleanCorruptedOverrides(globalOv)
        if (check.changed) {
          globalOv = check.cleaned
          localStorage.setItem(GLOBAL_OVERRIDES_KEY, JSON.stringify(globalOv))
        }
        globalOverridesCache = globalOv
      }
    }

    const rawLocal = localStorage.getItem(MANGA_OVERRIDES_KEY)
    let localOv: Record<string, AdminMangaOverride> = rawLocal ? JSON.parse(rawLocal) : {}
    const localCheck = cleanCorruptedOverrides(localOv)
    if (localCheck.changed) {
      localOv = localCheck.cleaned
      localStorage.setItem(MANGA_OVERRIDES_KEY, JSON.stringify(localOv))
    }

    return mergeOverridesAuthoritative(globalOv, localOv)
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
  const existing = all[mangaId] || (override.id ? all[override.id] : null) || {
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

  // Index under all variations so lookup NEVER misses
  all[mangaId] = updated
  if (updated.id) all[updated.id] = updated
  if ((updated as any).mangaId) all[(updated as any).mangaId] = updated

  const normTitle = normalizeTitleKey(updated.title)
  if (normTitle) {
    all[normTitle] = updated
    registerDynamicAlias(updated.title, normTitle)
  }

  if (updated.polishTitle) {
    const normPolish = normalizeTitleKey(updated.polishTitle)
    if (normPolish) {
      all[normPolish] = updated
    }
    if (normTitle) {
      registerDynamicAlias(updated.polishTitle, normTitle)
    }
  }

  if (/^\d+$/.test(mangaId)) all[mangaId] = updated
  if (updated.id && /^\d+$/.test(updated.id)) all[updated.id] = updated

  localStorage.setItem(MANGA_OVERRIDES_KEY, JSON.stringify(all))

  // Update in-memory cache immediately
  if (!globalOverridesCache) globalOverridesCache = {}
  Object.assign(globalOverridesCache, all)

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
        { id: ov.id, mangaId: (ov as any).mangaId || ov.id, title: ov.title, polishTitle: ov.polishTitle }
      )
    ) {
      const matchedVol = ov.volumes?.find((v) => v.volumeNumber === volNum)
      if (matchedVol?.customCoverUrl) return matchedVol.customCoverUrl
      if (volNum === 1 && (ov.customCoverUrl || ov.coverUrl)) return ov.customCoverUrl || ov.coverUrl || ''
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

  // For volNum === 1, fallbackUrl is acceptable as series main cover
  if (volNum === 1 && fallbackUrl && fallbackUrl.trim() && !fallbackUrl.includes('placeholder') && !fallbackUrl.includes('mangadex.org')) {
    return fallbackUrl
  }

  // Known series AniList CDN covers for volume 1 only
  if (volNum === 1) {
    if (normKey === 'bleach') return 'https://s4.anilist.co/file/anilistcdn/media/manga/cover/large/bx30012-7Uo49q0iX6qX.jpg'
    if (normKey === 'attack-on-titan') return 'https://s4.anilist.co/file/anilistcdn/media/manga/cover/large/bx30001-f5W10d48s5kL.jpg'
    if (normKey === 'one-piece') return 'https://s4.anilist.co/file/anilistcdn/media/manga/cover/large/bx30013-1O9ILH89zgG4.jpg'
    if (normKey === 'jujutsu-kaisen') return 'https://s4.anilist.co/file/anilistcdn/media/manga/cover/large/bx101517-H3eeGGewnUjD.jpg'
    if (normKey === 'chainsaw-man') return 'https://s4.anilist.co/file/anilistcdn/media/manga/cover/large/bx105778-9MhW0K0bUf7n.jpg'
    if (normKey === 'frieren') return 'https://s4.anilist.co/file/anilistcdn/media/manga/cover/large/bx118586-kXQeHhyoN36P.jpg'
    if (normKey === 'oshi-no-ko') return 'https://s4.anilist.co/file/anilistcdn/media/manga/cover/large/bx117195-gqgT4RskmK0E.jpg'
  }

  return fallbackUrl || ''
}
