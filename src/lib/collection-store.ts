import type { CollectionSeriesItem, CollectionVolumeItem } from '@/components/manga/series-collection-detail-modal'
import { getAdminMangaOverrides, getEffectiveVolumeCover, syncGlobalOverridesFromServer } from '@/lib/admin-store'
import { normalizeTitleKey, areSameSeries } from '@/lib/title-utils'

export type { CollectionSeriesItem, CollectionVolumeItem }
export { normalizeTitleKey, areSameSeries, formatVolumeCount } from '@/lib/title-utils'

const STORAGE_KEY = 'mangowo_collection_v3'

// Initial default series: completely empty so new accounts start at 0
export const defaultCollectionSeries: CollectionSeriesItem[] = []

// Deduplicate collection array by checking areSameSeries
export function deduplicateSeriesList(list: CollectionSeriesItem[]): CollectionSeriesItem[] {
  if (!Array.isArray(list) || list.length <= 1) return list || []

  const result: CollectionSeriesItem[] = []

  for (const item of list) {
    if (!item) continue
    const existingIndex = result.findIndex((existing) => areSameSeries(existing, item))

    if (existingIndex === -1) {
      result.push({ ...item, volumes: [...(item.volumes || [])] })
    } else {
      const existing = result[existingIndex]

      // Merge metadata: prefer richer data
      const mergedTitle = (existing.title && !existing.title.startsWith('Manga ')) ? existing.title : (item.title || existing.title)
      const mergedPolishTitle = item.polishTitle || existing.polishTitle || null
      const mergedPublisher = (existing.publisher && existing.publisher !== 'Inne') ? existing.publisher : (item.publisher || existing.publisher)
      const mergedCustomCover = existing.customCoverUrl || item.customCoverUrl || null
      const mergedCover = mergedCustomCover || ((existing.coverUrl && !existing.coverUrl.includes('placeholder')) ? existing.coverUrl : (item.coverUrl || existing.coverUrl))
      const mergedStatusInPoland = item.statusInPoland || existing.statusInPoland || 'ONGOING'
      const mergedTotalVols = Math.max(existing.totalVolumes || 0, item.totalVolumes || 0)
      const mergedJapanVols = Math.max(existing.totalVolumesJapan || 0, item.totalVolumesJapan || 0) || null
      const mergedRating = existing.userSeriesRating ?? item.userSeriesRating ?? null
      const mergedMangaId = (!existing.mangaId.startsWith('user-') && !existing.mangaId.startsWith('rel-'))
        ? existing.mangaId
        : (item.mangaId || existing.mangaId)

      // Merge volumes map
      const volMap = new Map<number, CollectionVolumeItem>()
      existing.volumes.forEach((v) => volMap.set(v.volumeNumber, { ...v }))

      item.volumes.forEach((newV) => {
        const existingV = volMap.get(newV.volumeNumber)
        if (!existingV) {
          volMap.set(newV.volumeNumber, { ...newV })
        } else {
          const statusPriority: Record<string, number> = { READ: 5, OWNED: 4, ORDERED: 3, WISHLIST: 2, NONE: 1 }
          const curPrio = statusPriority[existingV.status] || 1
          const newPrio = statusPriority[newV.status] || 1

          const mergedStatus = newPrio > curPrio ? newV.status : existingV.status
          const mergedCoverUrl = (newV.customCoverUrl ? newV.customCoverUrl : null) ||
            (existingV.customCoverUrl ? existingV.customCoverUrl : null) ||
            (newV.coverUrl && !newV.coverUrl.includes('placeholder') ? newV.coverUrl : existingV.coverUrl)
          const mergedCustomCoverVol = newV.customCoverUrl || existingV.customCoverUrl || null
          const mergedPurchasePrice = existingV.purchasePrice ?? newV.purchasePrice ?? null
          const mergedUserRating = existingV.userRating ?? newV.userRating ?? null
          const mergedCoverPrice = existingV.coverPrice ?? newV.coverPrice ?? 34.99
          const mergedNotes = existingV.notes || newV.notes || null

          volMap.set(newV.volumeNumber, {
            ...existingV,
            status: mergedStatus,
            coverUrl: mergedCoverUrl,
            customCoverUrl: mergedCustomCoverVol,
            purchasePrice: mergedPurchasePrice,
            userRating: mergedUserRating,
            coverPrice: mergedCoverPrice,
            notes: mergedNotes,
          })
        }
      })

      const mergedVolumes = Array.from(volMap.values()).sort((a, b) => a.volumeNumber - b.volumeNumber)

      const overrides = getAdminMangaOverrides()
      const ov = overrides[existing.mangaId] || overrides[existing.id] || (existing.title ? overrides[normalizeTitleKey(existing.title)] : null)
      const targetVols = ov?.totalVolumes || (mergedStatusInPoland === 'FINISHED' ? (item.totalVolumes || existing.totalVolumes || 1) : Math.max(mergedTotalVols, mergedVolumes.length))

      let finalVolumes = mergedVolumes
      if (targetVols > 0 && targetVols < mergedVolumes.length) {
        const hasOwnedBeyond = mergedVolumes.slice(targetVols).some((v) => v.status === 'OWNED' || v.status === 'READ')
        if (!hasOwnedBeyond) {
          finalVolumes = mergedVolumes.slice(0, targetVols)
        }
      }

      result[existingIndex] = {
        id: existing.id,
        title: mergedTitle,
        polishTitle: mergedPolishTitle,
        publisher: mergedPublisher,
        coverUrl: mergedCover,
        customCoverUrl: mergedCustomCover,
        statusInPoland: mergedStatusInPoland,
        totalVolumes: targetVols,
        totalVolumesJapan: ov?.totalVolumesJapan !== undefined ? ov.totalVolumesJapan : mergedJapanVols,
        userSeriesRating: mergedRating,
        mangaId: mergedMangaId,
        volumes: finalVolumes,
      }
    }
  }

  return result
}

// Sync admin overrides (total volumes, custom covers, volume counts) into series item
export function applyAdminOverridesToSeries(series: CollectionSeriesItem): CollectionSeriesItem {
  const overrides = getAdminMangaOverrides()
  const seriesNorm = normalizeTitleKey(series.title)
  const polishNorm = series.polishTitle ? normalizeTitleKey(series.polishTitle) : ''

  const override =
    overrides[series.mangaId] ||
    overrides[series.id] ||
    (seriesNorm ? overrides[seriesNorm] : null) ||
    (polishNorm ? overrides[polishNorm] : null) ||
    Object.values(overrides).find((ov) =>
      areSameSeries(
        { id: series.id, mangaId: series.mangaId, title: series.title, polishTitle: series.polishTitle },
        { id: ov.id, mangaId: (ov as any).mangaId || ov.id, title: ov.title, polishTitle: ov.polishTitle }
      )
    )

  let totalVols = series.totalVolumes
  let japanVols = series.totalVolumesJapan
  let seriesCover = override?.customCoverUrl || override?.coverUrl || series.customCoverUrl || series.coverUrl
  const adminVols = series.volumes

  if (override) {
    if (override.totalVolumes && override.totalVolumes > 0) {
      totalVols = override.totalVolumes
    }
    japanVols = override.totalVolumesJapan !== undefined ? override.totalVolumesJapan : null
    if (override.customCoverUrl) {
      seriesCover = override.customCoverUrl
    }
  }

  // Adjust volumes array length:
  // When an admin override exists, admin settings take absolute precedence.
  // Never let stale or unverified counts inflate a single-volume or completed manga (e.g. Jujutsu Kaisen 0).
  const isFinished = (override?.statusInPoland || series.statusInPoland) === 'FINISHED'
  const maxVols = override
    ? (isFinished || !japanVols || japanVols <= totalVols
        ? totalVols
        : Math.max(totalVols, japanVols))
    : Math.max(1, totalVols, japanVols || 0)

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
    const custom = ovVol?.customCoverUrl || (vol.volumeNumber === 1 ? (override?.customCoverUrl || series.customCoverUrl) : null) || vol.customCoverUrl || null
    const effCover = custom || getEffectiveVolumeCover(series.title, vol.volumeNumber, vol.coverUrl || seriesCover)
    const isOwnedOrRead = vol.status === 'OWNED' || vol.status === 'READ'
    const effCoverPrice = ovVol?.pricePLN !== undefined ? ovVol.pricePLN : (vol.coverPrice ?? 34.99)
    return {
      ...vol,
      customCoverUrl: custom || null,
      coverUrl: effCover,
      coverPrice: effCoverPrice,
      purchasePrice: isOwnedOrRead ? (vol.purchasePrice ?? null) : null,
    }
  })

  const vol1 = updatedVolumes.find((v) => v.volumeNumber === 1)
  const vol1Cover = vol1?.customCoverUrl || vol1?.coverUrl || ''
  const customCover = override?.customCoverUrl || series.customCoverUrl || vol1?.customCoverUrl || null
  const finalSeriesCover = customCover || seriesCover || vol1Cover || getEffectiveVolumeCover(series.title, 1, '')

  return {
    ...series,
    polishTitle: override?.polishTitle || series.polishTitle || null,
    totalVolumes: totalVols,
    totalVolumesJapan: japanVols,
    statusInPoland: override?.statusInPoland || series.statusInPoland || 'ONGOING',
    customCoverUrl: customCover,
    coverUrl: finalSeriesCover,
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
    if (deduplicated.length < list.length) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(deduplicated))
    }
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
    })
      .then((res) => {
        if (!res.ok) {
          console.warn('Background collection sync returned non-ok status:', res.status)
        }
      })
      .catch((err) => {
        // Offline or network warning - local state remains preserved
        console.warn('Background collection sync network warning:', err)
      })
  } catch (err) {
    console.error('Error saving to localStorage:', err)
  }
}

/**
 * Bidirectional sync between localStorage and PostgreSQL database:
 * - If server has 0 series, but local has series: pushes local collection to server!
 * - If server has series, but local has additional series: merges both and pushes merged to server!
 * - If server has series and local is empty: updates local storage from server.
 */
export async function syncCollectionWithServer(): Promise<{ success: boolean; count: number; merged: CollectionSeriesItem[] }> {
  if (typeof window === 'undefined') {
    return { success: false, count: 0, merged: [] }
  }

  try {
    // 0. Ensure global covers & admin overrides are fetched from PostgreSQL first
    await syncGlobalOverridesFromServer().catch(() => {})

    const res = await fetch('/api/collection')
    if (!res.ok) {
      return { success: false, count: 0, merged: getSavedCollection() }
    }

    const data = await res.json()
    const serverSeries: CollectionSeriesItem[] = Array.isArray(data?.series) ? data.series : []
    const localSeries = getSavedCollection()

    // Scenario 1: Server has 0 items, local has items -> PUSH local to server immediately!
    if (serverSeries.length === 0 && localSeries.length > 0) {
      const pushRes = await fetch('/api/collection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ syncAll: localSeries }),
      })
      if (pushRes.ok) {
        return { success: true, count: localSeries.length, merged: localSeries }
      }
      return { success: false, count: localSeries.length, merged: localSeries }
    }

    // Scenario 2: Server has items, local is empty -> save server items locally
    if (serverSeries.length > 0 && localSeries.length === 0) {
      const deduplicated = deduplicateSeriesList(serverSeries)
      localStorage.setItem(STORAGE_KEY, JSON.stringify(deduplicated))
      window.dispatchEvent(new Event('mangowo_collection_updated'))
      return { success: true, count: deduplicated.length, merged: deduplicated }
    }

    // Scenario 3: Both have items -> merge both collections
    if (serverSeries.length > 0 && localSeries.length > 0) {
      const mergedList = deduplicateSeriesList([...serverSeries, ...localSeries])
      const deduplicated = deduplicateSeriesList(mergedList)
      localStorage.setItem(STORAGE_KEY, JSON.stringify(deduplicated))
      window.dispatchEvent(new Event('mangowo_collection_updated'))

      // Also push merged to server to ensure server has any local additions
      fetch('/api/collection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ syncAll: deduplicated }),
      }).catch(() => {})

      return { success: true, count: deduplicated.length, merged: deduplicated }
    }

    return { success: true, count: 0, merged: [] }
  } catch (err) {
    console.error('syncCollectionWithServer error:', err)
    return { success: false, count: 0, merged: getSavedCollection() }
  }
}

// Helper to remove a series from collection
export function removeSeriesFromCollection(seriesId: string) {
  const current = getSavedCollection()
  const target = current.find((s) => s.id === seriesId || s.mangaId === seriesId || areSameSeries(s, { id: seriesId, mangaId: seriesId }))

  const updated = current.filter((s) => {
    if (s.id === seriesId || s.mangaId === seriesId) return false
    if (target && areSameSeries(s, target)) return false
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

    // Check if an admin override or custom cover exists for this series
    const overrides = getAdminMangaOverrides()
    const seriesNorm = normalizeTitleKey(series.title)
    const ov =
      overrides[series.mangaId] ||
      overrides[series.id] ||
      (seriesNorm ? overrides[seriesNorm] : null) ||
      Object.values(overrides).find((o) =>
        areSameSeries(
          { id: series.id, mangaId: series.mangaId, title: series.title, polishTitle: series.polishTitle },
          { id: o.id, mangaId: (o as any).mangaId || o.id, title: o.title, polishTitle: o.polishTitle }
        )
      )
    const hasAdminCover = Boolean(ov?.customCoverUrl || series.customCoverUrl)

    // Apply admin custom covers and only use MangaDex cover if missing
    const updatedVolumes = series.volumes.map((v) => {
      const ovVol = ov?.volumes?.find((ovV) => ovV.volumeNumber === v.volumeNumber)
      if (ovVol?.customCoverUrl) {
        return {
          ...v,
          customCoverUrl: ovVol.customCoverUrl,
          coverUrl: ovVol.customCoverUrl,
        }
      }
      if (v.customCoverUrl) {
        return v
      }
      if (v.volumeNumber === 1 && (ov?.customCoverUrl || series.customCoverUrl)) {
        const c = ov?.customCoverUrl || series.customCoverUrl!
        return {
          ...v,
          customCoverUrl: c,
          coverUrl: c,
        }
      }
      if (v.coverUrl && !v.coverUrl.includes('placeholder') && !v.coverUrl.includes('mangadex.org')) {
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

    // Only update main cover if it doesn't exist, is a placeholder, and NOT overridden by admin
    const mainSeriesCover = ov?.customCoverUrl || series.customCoverUrl || (hasAdminCover ? series.coverUrl : (series.coverUrl && !series.coverUrl.includes('placeholder') ? series.coverUrl : coverMap[1] || Object.values(coverMap)[0] || series.coverUrl))

    return {
      ...series,
      customCoverUrl: ov?.customCoverUrl || series.customCoverUrl || null,
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
  const existingIndex = current.findIndex((s) => areSameSeries(s, seriesInfo))

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

    const maxSelected = seriesInfo.selectedVolumes.length > 0 ? Math.max(...seriesInfo.selectedVolumes) : 0
    const explicitTotal = (seriesInfo.totalVolumes && seriesInfo.totalVolumes > 0) ? seriesInfo.totalVolumes : (target.totalVolumes || 1)
    const maxVols = Math.max(
      explicitTotal,
      seriesInfo.totalVolumesJapan || target.totalVolumesJapan || 0,
      maxSelected
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
  const seriesIndex = collection.findIndex((s) => areSameSeries(s, { mangaId, title: seriesTitle }))
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
    const totalV = volumeNumber > 0 ? volumeNumber : 1
    const newVolumes: CollectionVolumeItem[] = Array.from({ length: totalV }, (_, i) => {
      const volNum = i + 1
      const isTarget = volNum === volumeNumber
      return {
        volumeNumber: volNum,
        coverUrl: coverUrl || '',
        status: isTarget ? targetStatus : ('NONE' as const),
        purchasePrice: isTarget && targetStatus === 'OWNED' ? pricePLN || 34.99 : null,
      }
    })

    const newSeries: CollectionSeriesItem = {
      id: `user-quick-${Date.now()}`,
      mangaId,
      title: seriesTitle,
      publisher: publisher || 'Inne',
      coverUrl: coverUrl || '',
      totalVolumes: totalV,
      volumes: newVolumes,
      userSeriesRating: null,
    }

    saveCollectionToStorage([newSeries, ...collection])
  }

  return resultStatus
}

