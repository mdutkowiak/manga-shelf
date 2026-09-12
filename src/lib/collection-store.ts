import type { CollectionSeriesItem, CollectionVolumeItem } from '@/components/manga/series-collection-detail-modal'
import { getAdminMangaOverrides, getEffectiveVolumeCover } from '@/lib/admin-store'
export type { CollectionSeriesItem, CollectionVolumeItem }

const STORAGE_KEY = 'mangowo_collection_v2'

// Initial default series with verified working covers & no-referrer bypass
export const defaultCollectionSeries: CollectionSeriesItem[] = [
  {
    id: 's1',
    mangaId: '30012',
    title: 'Bleach',
    publisher: 'J.P.Fantastica',
    coverUrl: 'https://s4.anilist.co/file/anilistcdn/media/manga/cover/large/bx30012-7Uo49q0iX6qX.jpg',
    totalVolumes: 74,
    description: 'Niezwykłe przygody Ichigo Kurosaki w świecie Shinigami.',
    userSeriesRating: 9,
    volumes: Array.from({ length: 74 }, (_, i) => {
      const volNum = i + 1
      const isOwned = volNum <= 10
      const isRead = volNum <= 8
      return {
        volumeNumber: volNum,
        coverUrl: 'https://s4.anilist.co/file/anilistcdn/media/manga/cover/large/bx30012-7Uo49q0iX6qX.jpg',
        customCoverUrl: null,
        status: isRead ? 'READ' : isOwned ? 'OWNED' : 'NONE',
        purchasePrice: isOwned ? 34.99 : null,
        userRating: isRead ? 9 : null,
      }
    }),
  },
  {
    id: 's2',
    mangaId: '30001',
    title: 'Attack on Titan',
    publisher: 'Waneko',
    coverUrl: 'https://s4.anilist.co/file/anilistcdn/media/manga/cover/large/bx30001-f5W10d48s5kL.jpg',
    totalVolumes: 34,
    description: 'Eren Yeager i walka ludzkości z tytanami za murami.',
    userSeriesRating: 10,
    volumes: Array.from({ length: 34 }, (_, i) => {
      const volNum = i + 1
      const isOwned = volNum <= 15
      const isRead = volNum <= 12
      return {
        volumeNumber: volNum,
        coverUrl: 'https://s4.anilist.co/file/anilistcdn/media/manga/cover/large/bx30001-f5W10d48s5kL.jpg',
        customCoverUrl: null,
        status: isRead ? 'READ' : isOwned ? 'OWNED' : 'NONE',
        purchasePrice: isOwned ? 29.99 : null,
        userRating: isRead ? 10 : null,
      }
    }),
  },
  {
    id: 's3',
    mangaId: '30013',
    title: 'One Piece',
    publisher: 'Waneko',
    coverUrl: 'https://s4.anilist.co/file/anilistcdn/media/manga/cover/large/bx30013-1O9ILH89zgG4.jpg',
    totalVolumes: 108,
    description: 'Luffy i Słomiani w poszukiwaniu legendarnego skarbu One Piece.',
    userSeriesRating: 9,
    volumes: Array.from({ length: 108 }, (_, i) => {
      const volNum = i + 1
      const isOwned = volNum <= 20
      const isRead = volNum <= 18
      return {
        volumeNumber: volNum,
        coverUrl: 'https://uploads.mangadex.org/covers/a2c1d849-a169-4abf-9f4c-59b192f0779f/c6d05f33-14b3-46fb-9276-35b888ed45a5.512.jpg',
        customCoverUrl: null,
        status: isRead ? 'READ' : isOwned ? 'OWNED' : 'NONE',
        purchasePrice: isOwned ? 24.99 : null,
        userRating: isRead ? 9 : null,
      }
    }),
  },
  {
    id: 's4',
    mangaId: '117832',
    title: 'Chainsaw Man',
    publisher: 'Studio JG',
    coverUrl: 'https://uploads.mangadex.org/covers/a7774285-d604-4863-9560-b9f5e040f7b1/5c5c1653-559d-4c3e-8628-98e37452d3a3.512.jpg',
    totalVolumes: 16,
    description: 'Denji staje się Człowiekiem Piłą Łańcuchową i łowcą diabłów.',
    userSeriesRating: 8,
    volumes: Array.from({ length: 16 }, (_, i) => {
      const volNum = i + 1
      const isOwned = volNum <= 12
      const isRead = volNum <= 10
      return {
        volumeNumber: volNum,
        coverUrl: 'https://uploads.mangadex.org/covers/a7774285-d604-4863-9560-b9f5e040f7b1/5c5c1653-559d-4c3e-8628-98e37452d3a3.512.jpg',
        customCoverUrl: null,
        status: isRead ? 'READ' : isOwned ? 'OWNED' : 'NONE',
        purchasePrice: isOwned ? 34.99 : null,
        userRating: isRead ? 8 : null,
      }
    }),
  },
  {
    id: 's5',
    mangaId: '101517',
    title: 'Jujutsu Kaisen',
    publisher: 'Waneko',
    coverUrl: 'https://uploads.mangadex.org/covers/c52b704d-ee54-4f81-a67b-1d70e1762c2f/ec649c0d-c0eb-433b-a567-5d51829e504c.512.jpg',
    totalVolumes: 27,
    description: 'Yuji Itadori i walka z przekleństwami w Technikum Jujutsu.',
    userSeriesRating: 9,
    volumes: Array.from({ length: 27 }, (_, i) => {
      const volNum = i + 1
      const isOwned = volNum <= 8
      const isRead = volNum <= 6
      return {
        volumeNumber: volNum,
        coverUrl: 'https://uploads.mangadex.org/covers/c52b704d-ee54-4f81-a67b-1d70e1762c2f/ec649c0d-c0eb-433b-a567-5d51829e504c.512.jpg',
        customCoverUrl: null,
        status: isRead ? 'READ' : isOwned ? 'OWNED' : 'NONE',
        purchasePrice: isOwned ? 34.99 : null,
        userRating: isRead ? 9 : null,
      }
    }),
  },
]

// Normalize title helper to match English & Romaji titles (e.g. Shingeki no Kyojin vs Attack on Titan)
export function normalizeTitleKey(t: string): string {
  const lower = t.toLowerCase().trim()
  if (lower.includes('shingeki') || lower.includes('attack on titan')) return 'attack-on-titan'
  if (lower.includes('oshi no ko')) return 'oshi-no-ko'
  if (lower.includes('bleach')) return 'bleach'
  if (lower.includes('one piece')) return 'one-piece'
  if (lower.includes('chainsaw man')) return 'chainsaw-man'
  if (lower.includes('jujutsu kaisen')) return 'jujutsu-kaisen'
  return lower.replace(/[^a-z0-9]/g, '')
}

// Deduplicate collection array by title key or mangaId
export function deduplicateSeriesList(list: CollectionSeriesItem[]): CollectionSeriesItem[] {
  const seenKeys = new Set<string>()
  const result: CollectionSeriesItem[] = []

  for (const item of list) {
    const key = normalizeTitleKey(item.title) || item.mangaId
    if (!seenKeys.has(key)) {
      seenKeys.add(key)
      result.push(item)
    } else {
      // Merge volumes from duplicate into existing item
      const existing = result.find((s) => (normalizeTitleKey(s.title) || s.mangaId) === key)
      if (existing) {
        item.volumes.forEach((newV) => {
          const exVIndex = existing.volumes.findIndex((v) => v.volumeNumber === newV.volumeNumber)
          if (exVIndex >= 0) {
            if (newV.status !== 'NONE') {
              existing.volumes[exVIndex] = { ...existing.volumes[exVIndex], ...newV }
            }
          } else {
            existing.volumes.push(newV)
          }
        })
      }
    }
  }

  return result
}

// Sync admin overrides (total volumes, custom covers, volume counts) into series item
export function applyAdminOverridesToSeries(series: CollectionSeriesItem): CollectionSeriesItem {
  const overrides = getAdminMangaOverrides()
  const normTitle = series.title.toLowerCase().trim()

  const override =
    overrides[series.mangaId] ||
    Object.values(overrides).find(
      (ov) =>
        ov.title.toLowerCase().trim() === normTitle ||
        (ov.polishTitle && ov.polishTitle.toLowerCase().trim() === normTitle)
    )

  let totalVols = series.totalVolumes
  let seriesCover = series.coverUrl
  const adminVols = series.volumes

  if (override) {
    if (override.totalVolumes && override.totalVolumes > 0) {
      totalVols = override.totalVolumes
    }
    if (override.customCoverUrl) {
      seriesCover = override.customCoverUrl
    }
  }

  // Adjust volumes array length if totalVolumes changed
  const currentVolCount = adminVols.length
  let updatedVolumes: CollectionVolumeItem[] = [...adminVols]

  if (totalVols > currentVolCount) {
    // Generate missing volumes
    for (let i = currentVolCount + 1; i <= totalVols; i++) {
      const volCover = getEffectiveVolumeCover(series.title, i, seriesCover)
      updatedVolumes.push({
        volumeNumber: i,
        coverUrl: volCover,
        customCoverUrl: null,
        status: 'NONE',
        purchasePrice: null,
        userRating: null,
      })
    }
  } else if (totalVols < currentVolCount) {
    updatedVolumes = updatedVolumes.slice(0, totalVols)
  }

  // Apply volume cover overrides
  updatedVolumes = updatedVolumes.map((vol) => {
    const effCover = getEffectiveVolumeCover(series.title, vol.volumeNumber, vol.customCoverUrl || vol.coverUrl || seriesCover)
    return {
      ...vol,
      coverUrl: effCover,
    }
  })

  return {
    ...series,
    totalVolumes: totalVols,
    coverUrl: getEffectiveVolumeCover(series.title, 1, seriesCover),
    volumes: updatedVolumes,
  }
}

// Get saved collection from localStorage (auto-deduplicated & synced with admin overrides)
export function getSavedCollection(): CollectionSeriesItem[] {
  if (typeof window === 'undefined') return defaultCollectionSeries.map(applyAdminOverridesToSeries)
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    let list = defaultCollectionSeries
    if (raw) {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed) && parsed.length > 0) {
        list = parsed
      }
    }
    const deduplicated = deduplicateSeriesList(list)
    const withOverrides = deduplicated.map(applyAdminOverridesToSeries)
    return withOverrides
  } catch (err) {
    console.error('Error reading localStorage collection:', err)
  }
  return defaultCollectionSeries.map(applyAdminOverridesToSeries)
}

// Save collection to localStorage, notify listeners, and sync to database
export function saveCollectionToStorage(seriesList: CollectionSeriesItem[]) {
  if (typeof window === 'undefined') return
  try {
    const deduplicated = deduplicateSeriesList(seriesList)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(deduplicated))
    window.dispatchEvent(new Event('mangowo_collection_updated'))

    // Background sync with database if user is authenticated
    fetch('/api/collection', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ syncAll: deduplicated }),
    }).catch(() => {
      // Offline or unauthenticated - local state remains preserved
    })
  } catch (err) {
    console.error('Error saving to localStorage:', err)
  }
}

// Helper to remove a series from collection
export function removeSeriesFromCollection(seriesId: string) {
  const current = getSavedCollection()
  const target = current.find((s) => s.id === seriesId || s.mangaId === seriesId)
  const targetKey = target ? normalizeTitleKey(target.title) : null

  const updated = current.filter((s) => {
    if (s.id === seriesId || s.mangaId === seriesId) return false
    if (targetKey && normalizeTitleKey(s.title) === targetKey) return false
    return true
  })

  saveCollectionToStorage(updated)

  if (target) {
    fetch(`/api/collection?mangaId=${encodeURIComponent(target.mangaId || target.id)}`, {
      method: 'DELETE',
    }).catch(() => {})
  }

  return updated
}

// Automatically fetch series poster & volume covers from MangaDex / API
export async function autoEnhanceSeriesVolumeCovers(series: CollectionSeriesItem): Promise<CollectionSeriesItem> {
  try {
    const mdRes = await fetch(
      `https://api.mangadex.org/manga?title=${encodeURIComponent(series.title)}&limit=1`,
      { headers: { 'User-Agent': 'MangOwOApp/1.0' } }
    )
    if (!mdRes.ok) return series
    const mdData = await mdRes.json()
    const mangaId = mdData.data?.[0]?.id
    if (!mangaId) return series

    const coverRes = await fetch(
      `https://api.mangadex.org/cover?manga[]=${mangaId}&order[volume]=asc&limit=100`,
      { headers: { 'User-Agent': 'MangOwOApp/1.0' } }
    )
    if (!coverRes.ok) return series
    const coverData = await coverRes.json()
    const coverList: Array<{ attributes?: { volume?: string; fileName?: string } }> = coverData.data || []

    const coverMap: Record<number, string> = {}
    coverList.forEach((c) => {
      const vol = parseInt(c.attributes?.volume || '', 10)
      const fileName = c.attributes?.fileName
      if (!isNaN(vol) && fileName && !coverMap[vol]) {
        coverMap[vol] = `https://uploads.mangadex.org/covers/${mangaId}/${fileName}.512.jpg`
      }
    })

    if (Object.keys(coverMap).length === 0) return series

    // Main series cover is Volume 1 cover (Tom 1)
    const mainSeriesCover = coverMap[1] || Object.values(coverMap)[0] || series.coverUrl

    const updatedVolumes = series.volumes.map((v) => {
      const volumeSpecificCover = coverMap[v.volumeNumber]
      if (volumeSpecificCover) {
        return {
          ...v,
          coverUrl: volumeSpecificCover,
        }
      }
      return v
    })

    return {
      ...series,
      coverUrl: mainSeriesCover,
      volumes: updatedVolumes,
    }
  } catch (err) {
    console.warn('Auto enhance volume covers notice for:', series.title, err)
    return series
  }
}

// Automatically enhance ALL series in user's collection
export async function autoEnhanceAllCollectionSeries() {
  const current = getSavedCollection()
  let hasUpdates = false

  const updatedList = await Promise.all(
    current.map(async (series) => {
      const enhanced = await autoEnhanceSeriesVolumeCovers(series)
      if (
        enhanced.coverUrl !== series.coverUrl ||
        JSON.stringify(enhanced.volumes) !== JSON.stringify(series.volumes)
      ) {
        hasUpdates = true
        return enhanced
      }
      return series
    })
  )

  if (hasUpdates) {
    saveCollectionToStorage(updatedList)
  }
}

// Helper to add or update volumes of a series in collection without duplicates
export function addOrUpdateSeriesInCollection(seriesInfo: {
  mangaId: string
  title: string
  publisher: string
  coverUrl: string
  selectedVolumes: number[]
  volumePrices: Record<number, number>
  defaultPrice: number
}) {
  const current = getSavedCollection()
  const targetKey = normalizeTitleKey(seriesInfo.title)

  const existingIndex = current.findIndex(
    (s) =>
      s.mangaId === seriesInfo.mangaId ||
      normalizeTitleKey(s.title) === targetKey ||
      s.title.toLowerCase() === seriesInfo.title.toLowerCase()
  )

  let updatedList: CollectionSeriesItem[] = []

  if (existingIndex >= 0) {
    // Update existing series instead of creating duplicate
    updatedList = [...current]
    const target = { ...updatedList[existingIndex] }

    target.volumes = target.volumes.map((v) => {
      if (seriesInfo.selectedVolumes.includes(v.volumeNumber)) {
        const customP = seriesInfo.volumePrices[v.volumeNumber] ?? seriesInfo.defaultPrice
        return { ...v, status: 'OWNED' as const, purchasePrice: customP }
      }
      return v
    })

    updatedList[existingIndex] = target
  } else {
    // Add brand new series to collection
    const totalV = Math.max(20, ...seriesInfo.selectedVolumes)
    const newVolumes: CollectionVolumeItem[] = Array.from({ length: totalV }, (_, i) => {
      const volNum = i + 1
      const isSelected = seriesInfo.selectedVolumes.includes(volNum)
      const customP = seriesInfo.volumePrices[volNum] ?? seriesInfo.defaultPrice
      return {
        volumeNumber: volNum,
        coverUrl: seriesInfo.coverUrl,
        status: isSelected ? ('OWNED' as const) : ('NONE' as const),
        purchasePrice: isSelected ? customP : null,
      }
    })

    const newSeries: CollectionSeriesItem = {
      id: `user-added-${Date.now()}`,
      mangaId: seriesInfo.mangaId,
      title: seriesInfo.title,
      publisher: seriesInfo.publisher || 'Waneko',
      coverUrl: seriesInfo.coverUrl,
      totalVolumes: totalV,
      volumes: newVolumes,
      userSeriesRating: 9,
    }

    updatedList = [newSeries, ...current]

    // Background auto-fetch volume & series covers for newly added series
    autoEnhanceSeriesVolumeCovers(newSeries).then((enhanced) => {
      const latestList = getSavedCollection()
      const idx = latestList.findIndex((s) => s.id === enhanced.id)
      if (idx >= 0) {
        latestList[idx] = enhanced
        saveCollectionToStorage(latestList)
      }
    })
  }

  saveCollectionToStorage(updatedList)
  return updatedList
}

/**
 * Toggles a volume's status (OWNED, WISHLIST, NONE) directly from anywhere in the app
 * (e.g. 1-click on release card in calendar or upcoming widget)
 */
export function quickToggleVolumeStatus(
  mangaId: string,
  seriesTitle: string,
  volumeNumber: number,
  targetStatus: 'OWNED' | 'WISHLIST',
  publisher?: string,
  coverUrl?: string,
  pricePLN?: number
): 'OWNED' | 'WISHLIST' | 'NONE' {
  const collection = getSavedCollection()
  const targetKey = normalizeTitleKey(seriesTitle)

  const seriesIndex = collection.findIndex((s) => s.mangaId === mangaId || normalizeTitleKey(s.title) === targetKey)
  let resultStatus: 'OWNED' | 'WISHLIST' | 'NONE' = targetStatus

  if (seriesIndex >= 0) {
    const updatedCollection = [...collection]
    const series = { ...updatedCollection[seriesIndex] }
    let vols = [...series.volumes]

    // If volume number exceeds total volumes, expand
    if (volumeNumber > series.totalVolumes || !vols.some((v) => v.volumeNumber === volumeNumber)) {
      const maxVol = Math.max(series.totalVolumes, volumeNumber)
      series.totalVolumes = maxVol
      while (vols.length < maxVol) {
        const nextVolNum = vols.length + 1
        vols.push({
          volumeNumber: nextVolNum,
          coverUrl: getEffectiveVolumeCover(series.title, nextVolNum, series.coverUrl),
          customCoverUrl: null,
          status: 'NONE',
          purchasePrice: null,
          userRating: null,
        })
      }
    }

    vols = vols.map((v) => {
      if (v.volumeNumber === volumeNumber) {
        if (v.status === targetStatus) {
          resultStatus = 'NONE'
          return { ...v, status: 'NONE' as const, purchasePrice: null }
        } else {
          resultStatus = targetStatus
          return {
            ...v,
            status: targetStatus,
            purchasePrice: targetStatus === 'OWNED' ? pricePLN || 34.99 : null,
          }
        }
      }
      return v
    })

    series.volumes = vols
    updatedCollection[seriesIndex] = series
    saveCollectionToStorage(updatedCollection)
  } else {
    // Create new series
    const totalV = Math.max(volumeNumber, 15)
    const newVolumes: CollectionVolumeItem[] = Array.from({ length: totalV }, (_, i) => {
      const volNum = i + 1
      const isTarget = volNum === volumeNumber
      return {
        volumeNumber: volNum,
        coverUrl: coverUrl || 'https://s4.anilist.co/file/anilistcdn/media/manga/cover/large/bx117195-2s5b3n4pZ9Ea.jpg',
        status: isTarget ? targetStatus : ('NONE' as const),
        purchasePrice: isTarget && targetStatus === 'OWNED' ? pricePLN || 34.99 : null,
      }
    })

    const newSeries: CollectionSeriesItem = {
      id: `user-quick-${Date.now()}`,
      mangaId,
      title: seriesTitle,
      publisher: publisher || 'Waneko',
      coverUrl: coverUrl || 'https://s4.anilist.co/file/anilistcdn/media/manga/cover/large/bx117195-2s5b3n4pZ9Ea.jpg',
      totalVolumes: totalV,
      volumes: newVolumes,
      userSeriesRating: 8,
    }

    saveCollectionToStorage([newSeries, ...collection])
  }

  return resultStatus
}

