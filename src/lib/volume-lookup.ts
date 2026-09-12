/**
 * Volume lookup service for Japanese volume counts
 * Combines AniList (for official completed/known series) and MangaDex Aggregate (for ongoing/releasing manga)
 */

interface JapanVolumeLookupResult {
  volumes: number | null
  source: 'anilist' | 'mangadex' | null
  status?: string | null
  error?: string
}

export async function fetchJapanVolumes(
  title: string,
  anilistId?: number | null,
  fallbackTitle?: string
): Promise<JapanVolumeLookupResult> {
  // 1. Try AniList by ID if available
  if (anilistId) {
    try {
      const q = `query ($id: Int) { Media(id: $id, type: MANGA) { volumes status } }`
      const res = await fetch('https://graphql.anilist.co', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: q, variables: { id: anilistId } }),
        next: { revalidate: 3600 },
      })
      if (res.ok) {
        const data = await res.json()
        const media = data?.data?.Media
        if (media?.volumes && media.volumes > 0) {
          return { volumes: media.volumes, source: 'anilist', status: media.status }
        }
      }
    } catch (err) {
      console.warn('AniList ID lookup warning:', err)
    }
  }

  // 2. Try AniList by title
  const titlesToTry = [title, fallbackTitle].filter(Boolean) as string[]
  for (const t of titlesToTry) {
    try {
      const q = `query ($search: String) { Page(page: 1, perPage: 1) { media(search: $search, type: MANGA) { id volumes status } } }`
      const res = await fetch('https://graphql.anilist.co', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: q, variables: { search: t } }),
        next: { revalidate: 3600 },
      })
      if (res.ok) {
        const data = await res.json()
        const media = data?.data?.Page?.media?.[0]
        if (media?.volumes && media.volumes > 0) {
          return { volumes: media.volumes, source: 'anilist', status: media.status }
        }
      }
    } catch (err) {
      console.warn(`AniList title lookup warning for "${t}":`, err)
    }
  }

  // 3. Fallback to MangaDex aggregate for ongoing/releasing manga
  for (const t of titlesToTry) {
    try {
      const cleanTitle = t.replace(/[^\p{L}\p{N}\s]/gu, ' ').trim()
      if (!cleanTitle) continue

      const mdSearchRes = await fetch(
        `https://api.mangadex.org/manga?title=${encodeURIComponent(cleanTitle)}&limit=1`,
        { headers: { 'User-Agent': 'MangaShelfApp/1.0' } }
      )
      if (mdSearchRes.ok) {
        const mdSearchData = await mdSearchRes.json()
        const mangaId = mdSearchData?.data?.[0]?.id
        if (mangaId) {
          const aggRes = await fetch(`https://api.mangadex.org/manga/${mangaId}/aggregate`, {
            headers: { 'User-Agent': 'MangaShelfApp/1.0' },
          })
          if (aggRes.ok) {
            const aggData = await aggRes.json()
            const volKeys = Object.keys(aggData?.volumes || {})
              .filter((k) => k !== 'none' && !isNaN(parseInt(k, 10)))
              .map(Number)
            if (volKeys.length > 0) {
              const maxVol = Math.max(...volKeys)
              return { volumes: maxVol, source: 'mangadex', status: 'RELEASING' }
            }
          }
        }
      }
    } catch (err) {
      console.warn(`MangaDex aggregate warning for "${t}":`, err)
    }
  }

  return { volumes: null, source: null }
}
