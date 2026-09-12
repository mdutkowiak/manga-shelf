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
  customCoverUrl?: string | null
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
  coverUrl: string
  shopUrl?: string
  ignoreScraper?: boolean
  description?: string
}

const MANGA_OVERRIDES_KEY = 'mangowo_admin_manga_overrides_v1'
const CUSTOM_RELEASES_KEY = 'mangowo_admin_custom_releases_v1'
const DELETED_RELEASES_KEY = 'mangowo_admin_deleted_release_ids_v1'
const EDITED_RELEASES_KEY = 'mangowo_admin_edited_releases_v1'

/**
 * Get all manga overrides saved by Admin
 */
export function getAdminMangaOverrides(): Record<string, AdminMangaOverride> {
  if (typeof window === 'undefined') return {}
  try {
    const raw = localStorage.getItem(MANGA_OVERRIDES_KEY)
    return raw ? JSON.parse(raw) : {}
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

  window.dispatchEvent(new Event('mangowo_admin_updated'))
  window.dispatchEvent(new Event('mangowo_collection_updated'))
}

/**
 * Default initial custom releases for Admin
 */
export const defaultAdminCustomReleases: AdminCustomRelease[] = [
  {
    id: 'adm-custom-oshi-16',
    mangaId: '117195',
    seriesTitle: 'Oshi no Ko',
    volumeNumber: 16,
    releaseDate: '2026-10-02',
    day: '2 Paź',
    month: 'Październik',
    year: 2026,
    publisher: 'Studio JG',
    pricePLN: 36.99,
    coverUrl: 'https://s4.anilist.co/file/anilistcdn/media/manga/cover/large/bx117195-2s5b3n4pZ9Ea.jpg',
    shopUrl: 'https://yatta.pl/manga/oshi-no-ko-16',
    ignoreScraper: true,
    description: 'Finałowy 16. tom bestsellerowej serii Oshi no Ko w wydaniu Studio JG z unikalną okładką.',
  },
]

/**
 * Get all custom releases added manually by Admin
 */
export function getAdminCustomReleases(): AdminCustomRelease[] {
  if (typeof window === 'undefined') return defaultAdminCustomReleases
  try {
    const raw = localStorage.getItem(CUSTOM_RELEASES_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed
      }
    }
  } catch {}
  return defaultAdminCustomReleases
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
  const normTitle = seriesTitle.toLowerCase().trim()

  // 1. Check admin manga overrides first
  const overrides = getAdminMangaOverrides()
  for (const mId of Object.keys(overrides)) {
    const ov = overrides[mId]
    if (ov.title.toLowerCase().trim() === normTitle || (ov.polishTitle && ov.polishTitle.toLowerCase().trim() === normTitle)) {
      const matchedVol = ov.volumes?.find((v) => v.volumeNumber === volNum)
      if (matchedVol?.customCoverUrl) return matchedVol.customCoverUrl
      if (ov.customCoverUrl) return ov.customCoverUrl
    }
  }

  // 2. Check admin edited scraped releases
  const editedReleases = getAdminEditedReleases()
  for (const eId of Object.keys(editedReleases)) {
    const ed = editedReleases[eId]
    if (ed && ed.seriesTitle.toLowerCase().trim() === normTitle && ed.volumeNumber === volNum) {
      if (ed.coverUrl && ed.coverUrl.trim()) return ed.coverUrl
    }
  }

  // 3. Check admin custom releases for this series volume
  const customReleases = getAdminCustomReleases()
  const matchedRel = customReleases.find(
    (r) => r.seriesTitle.toLowerCase().trim() === normTitle && r.volumeNumber === volNum
  )
  if (matchedRel?.coverUrl && matchedRel.coverUrl.trim()) return matchedRel.coverUrl

  if (fallbackUrl && fallbackUrl.trim() && !fallbackUrl.includes('placeholder') && !fallbackUrl.includes('mangadex.org')) {
    return fallbackUrl
  }

  // Known series AniList CDN covers
  if (normTitle.includes('bleach')) {
    return 'https://s4.anilist.co/file/anilistcdn/media/manga/cover/large/bx30012-7Uo49q0iX6qX.jpg'
  }
  if (normTitle.includes('titan') || normTitle.includes('shingeki')) {
    return 'https://s4.anilist.co/file/anilistcdn/media/manga/cover/large/bx30001-f5W10d48s5kL.jpg'
  }
  if (normTitle.includes('one piece')) {
    return 'https://s4.anilist.co/file/anilistcdn/media/manga/cover/large/bx30013-1O9ILH89zgG4.jpg'
  }
  if (normTitle.includes('jujutsu')) {
    return 'https://s4.anilist.co/file/anilistcdn/media/manga/cover/large/bx101517-H3eeGGewnUjD.jpg'
  }
  if (normTitle.includes('chainsaw')) {
    return 'https://s4.anilist.co/file/anilistcdn/media/manga/cover/large/bx105778-9MhW0K0bUf7n.jpg'
  }
  if (normTitle.includes('frieren')) {
    return 'https://s4.anilist.co/file/anilistcdn/media/manga/cover/large/bx118586-kXQeHhyoN36P.jpg'
  }

  return 'https://s4.anilist.co/file/anilistcdn/media/manga/cover/large/bx30012-7Uo49q0iX6qX.jpg'
}
