import type { CollectionSeriesItem, CollectionVolumeItem } from '@/components/manga/series-collection-detail-modal'
import { getAdminMangaOverrides, getEffectiveVolumeCover } from '@/lib/admin-store'
export type { CollectionSeriesItem, CollectionVolumeItem }

const STORAGE_KEY = 'mangowo_collection_v3'

// Initial default series: completely empty so new accounts start at 0
export const defaultCollectionSeries: CollectionSeriesItem[] = []

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
  const japanVols = override?.totalVolumesJapan !== undefined ? override.totalVolumesJapan : series.totalVolumesJapan
  const adminVols = series.volumes

  if (override) {
    if (override.totalVolumes && override.totalVolumes > 0) {
      totalVols = override.totalVolumes
    }
    if (override.customCoverUrl) {
      seriesCover = override.customCoverUrl
    }
  }

  // Adjust volumes array length up to maximum between Poland count and Japan count
  const maxVols = Math.max(1, totalVols, japanVols || 0)
  const currentVolCount = adminVols.length
  let updatedVolumes: CollectionVolumeItem[] = [...adminVols]

  if (maxVols > currentVolCount) {
    // Generate missing volumes up to maxVols
    for (let i = currentVolCount + 1; i <= maxVols; i++) {
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
  } else if (maxVols < currentVolCount) {
    updatedVolumes = updatedVolumes.slice(0, maxVols)
  }

  // Apply volume cover overrides from admin/user
  const overrideMap = override?.volumes && override.volumes.length > 0
    ? new Map(override.volumes.map((v) => [v.volumeNumber, v]))
    : null

  updatedVolumes = updatedVolumes.map((vol) => {
    const ovVol = overrideMap?.get(vol.volumeNumber)
    const custom = ovVol?.customCoverUrl !== undefined ? ovVol.customCoverUrl : vol.customCoverUrl
    const effCover = getEffectiveVolumeCover(series.title, vol.volumeNumber, custom || vol.coverUrl || seriesCover)
    const isOwnedOrRead = vol.status === 'OWNED' || vol.status === 'READ'
    return {
      ...vol,
      customCoverUrl: custom || null,
      coverUrl: effCover,
      purchasePrice: isOwnedOrRead ? (vol.purchasePrice ?? null) : null,
    }
  })

  return {
    ...series,
    polishTitle: override?.polishTitle || series.polishTitle || null,
    totalVolumes: totalVols,
    totalVolumesJapan: japanVols,
    coverUrl: getEffectiveVolumeCover(series.title, 1, seriesCover),
    volumes: updatedVolumes,
  }
}

// Get saved collection from localStorage (auto-deduplicated & synced with admin overrides)
export function getSavedCollection(): CollectionSeriesItem[] {
  if (typeof window === 'undefined') return []
  try {
    // Clean up old legacy mock storages if present
    if (localStorage.getItem('mangowo_collection_v2') || localStorage.getItem('mangowo_collection_v1')) {
      localStorage.removeItem('mangowo_collection_v2')
      localStorage.removeItem('mangowo_collection_v1')
    }
    const raw = localStorage.getItem(STORAGE_KEY)
    let list: CollectionSeriesItem[] = []
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
  return []
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

    // Only use MangaDex cover for volume if it doesn't already have a valid custom or high-res cover
    const updatedVolumes = series.volumes.map((v) => {
      if (v.customCoverUrl || (v.coverUrl && !v.coverUrl.includes('placeholder') && !v.coverUrl.includes('mangadex.org'))) {
        return v
      }
      const volumeSpecificCover = coverMap[v.volumeNumber]
      if (volumeSpecificCover) {
        return {
          ...v,
          coverUrl: volumeSpecificCover,
        }
      }
      return v
    })

    // Only update main cover if it doesn't exist or is a placeholder
    const mainSeriesCover =
      series.coverUrl && !series.coverUrl.includes('placeholder')
        ? series.coverUrl
        : coverMap[1] || Object.values(coverMap)[0] || series.coverUrl

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
  polishTitle?: string | null
  publisher: string
  coverUrl: string
  totalVolumes?: number
  totalVolumesJapan?: number | null
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
      s.title.toLowerCase() === seriesInfo.title.toLowerCase() ||
      (s.polishTitle && seriesInfo.polishTitle && s.polishTitle.toLowerCase() === seriesInfo.polishTitle.toLowerCase())
  )

  let updatedList: CollectionSeriesItem[] = []

  if (existingIndex >= 0) {
    // Update existing series instead of creating duplicate
    updatedList = [...current]
    const target = { ...updatedList[existingIndex] }

    if (seriesInfo.polishTitle) {
      target.polishTitle = seriesInfo.polishTitle
    }
    if (seriesInfo.totalVolumes && seriesInfo.totalVolumes > 0) {
      target.totalVolumes = seriesInfo.totalVolumes
    }
    if (seriesInfo.totalVolumesJapan !== undefined) {
      target.totalVolumesJapan = seriesInfo.totalVolumesJapan
    }

    const maxVols = Math.max(
      target.totalVolumes || 1,
      target.totalVolumesJapan || 0,
      target.volumes.length,
      ...seriesInfo.selectedVolumes
    )

    const existingMap = new Map(target.volumes.map((v) => [v.volumeNumber, v]))
    const newVolumes: CollectionVolumeItem[] = []

    for (let i = 1; i <= maxVols; i++) {
      const ex = existingMap.get(i)
      const isNewlySelected = seriesInfo.selectedVolumes.includes(i)
      const customP = seriesInfo.volumePrices[i] !== undefined
        ? seriesInfo.volumePrices[i]
        : seriesInfo.defaultPrice

      if (ex) {
        if (isNewlySelected) {
          newVolumes.push({
            ...ex,
            status: 'OWNED',
            purchasePrice: customP ?? ex.purchasePrice ?? 34.99,
          })
        } else {
          // If not owned, ensure purchasePrice is null
          const isOwned = ex.status === 'OWNED' || ex.status === 'READ'
          newVolumes.push({
            ...ex,
            purchasePrice: isOwned ? ex.purchasePrice : null,
          })
        }
      } else {
        newVolumes.push({
          volumeNumber: i,
          coverUrl: getEffectiveVolumeCover(target.title, i, target.coverUrl),
          customCoverUrl: null,
          status: isNewlySelected ? ('OWNED' as const) : ('NONE' as const),
          purchasePrice: isNewlySelected ? (customP ?? 34.99) : null,
          userRating: null,
        })
      }
    }

    target.volumes = newVolumes
    updatedList[existingIndex] = target
  } else {
    // Create new series with null userSeriesRating
    const userPolandVols = seriesInfo.totalVolumes && seriesInfo.totalVolumes > 0 ? seriesInfo.totalVolumes : 1
    const japanVols = seriesInfo.totalVolumesJapan !== undefined ? seriesInfo.totalVolumesJapan : null
    const maxVols = Math.max(userPolandVols, japanVols || 0, ...seriesInfo.selectedVolumes)

    const newVolumes: CollectionVolumeItem[] = Array.from({ length: maxVols }, (_, i) => {
      const volNum = i + 1
      const isSelected = seriesInfo.selectedVolumes.includes(volNum)
      const customP = seriesInfo.volumePrices[volNum] !== undefined
        ? seriesInfo.volumePrices[volNum]
        : seriesInfo.defaultPrice

      return {
        volumeNumber: volNum,
        coverUrl: getEffectiveVolumeCover(seriesInfo.title, volNum, seriesInfo.coverUrl),
        status: isSelected ? ('OWNED' as const) : ('NONE' as const),
        purchasePrice: isSelected ? customP : null,
      }
    })

    const newSeries: CollectionSeriesItem = {
      id: `user-added-${Date.now()}`,
      mangaId: seriesInfo.mangaId,
      title: seriesInfo.title,
      polishTitle: seriesInfo.polishTitle || null,
      publisher: seriesInfo.publisher || 'Waneko',
      coverUrl: seriesInfo.coverUrl,
      totalVolumes: userPolandVols,
      totalVolumesJapan: japanVols,
      volumes: newVolumes,
      userSeriesRating: null,
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
      userSeriesRating: null,
    }

    saveCollectionToStorage([newSeries, ...collection])
  }

  return resultStatus
}

