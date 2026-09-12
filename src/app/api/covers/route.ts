import { NextRequest, NextResponse } from 'next/server'
import { saveCoverLocally, saveCustomUploadedCover } from '@/lib/cover-storage'
import { searchManga } from '@/lib/anilist'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { base64Data, remoteUrl, publisher, title, volumeNumber } = body

    if (base64Data) {
      const localUrl = await saveCustomUploadedCover(base64Data, title || 'custom', volumeNumber || 1)
      return NextResponse.json({ success: true, localUrl })
    }

    if (remoteUrl) {
      const localUrl = await saveCoverLocally(remoteUrl, publisher, title, volumeNumber || 1)
      return NextResponse.json({ success: true, localUrl })
    }

    return NextResponse.json({ error: 'Brak danych obrazka' }, { status: 400 })
  } catch (error) {
    console.error('POST /api/covers error:', error)
    return NextResponse.json({ error: 'Błąd podczas zapisywania okładki' }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const url = searchParams.get('url')
  const title = searchParams.get('title') || ''
  const volumeStr = searchParams.get('volume')
  const volumeNum = volumeStr ? parseInt(volumeStr, 10) : null

  // 1. If url parameter is supplied, act as a server-side image proxy
  if (url) {
    try {
      const decodedUrl = decodeURIComponent(url)

      const res = await fetch(decodedUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
        },
      })

      if (!res.ok) {
        throw new Error(`Failed to fetch image from CDN: ${res.status}`)
      }

      const contentType = res.headers.get('content-type') || 'image/jpeg'
      const imageBuffer = await res.arrayBuffer()

      return new NextResponse(imageBuffer, {
        headers: {
          'Content-Type': contentType,
          'Cache-Control': 'public, max-age=604800, immutable',
        },
      })
    } catch (err) {
      console.error('Image proxy error for URL:', url, err)
      const fallbackSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="300" height="450" viewBox="0 0 300 450">
        <rect width="300" height="450" fill="#0E1424"/>
        <rect x="20" y="20" width="260" height="410" rx="12" fill="#151C30" stroke="#3B82F6" stroke-width="2" stroke-dasharray="4"/>
        <text x="150" y="210" fill="#38BDF8" font-family="sans-serif" font-size="16" font-weight="bold" text-anchor="middle">MangOwO Cover</text>
        <text x="150" y="240" fill="#94A3B8" font-family="sans-serif" font-size="12" text-anchor="middle">Polskie Wydanie</text>
      </svg>`
      return new NextResponse(fallbackSvg, {
        headers: { 'Content-Type': 'image/svg+xml' },
      })
    }
  }

  // 2. Volume-Specific Cover Search Engine (MangaDex + AniList)
  try {
    const alternativeCovers: string[] = []

    if (title) {
      // 2A. Search AniList first for pristine official high-res covers
      try {
        const anilistResults = await searchManga(title, 1, 5)
        const mediaList = anilistResults.data?.Page?.media || []
        mediaList.forEach((manga) => {
          if (manga.coverImage?.extraLarge && !alternativeCovers.includes(manga.coverImage.extraLarge)) {
            alternativeCovers.push(manga.coverImage.extraLarge)
          }
          if (manga.coverImage?.large && !alternativeCovers.includes(manga.coverImage.large)) {
            alternativeCovers.push(manga.coverImage.large)
          }
          if (manga.bannerImage && !alternativeCovers.includes(manga.bannerImage)) {
            alternativeCovers.push(manga.bannerImage)
          }
        })
      } catch (aniErr) {
        console.warn('AniList covers search notice:', aniErr)
      }

      // 2B. Search MangaDex for Volume-Specific Covers (Volume 1, 2, 3...)
      try {
        const mdRes = await fetch(
          `https://api.mangadex.org/manga?title=${encodeURIComponent(title)}&limit=1`,
          { headers: { 'User-Agent': 'MangOwOApp/1.0' } }
        )
        const mdData = await mdRes.json()
        const mangaId = mdData.data?.[0]?.id

        if (mangaId) {
          const coverRes = await fetch(
            `https://api.mangadex.org/cover?manga[]=${mangaId}&order[volume]=asc&limit=100`,
            { headers: { 'User-Agent': 'MangOwOApp/1.0' } }
          )
          const coverData = await coverRes.json()
          const coverList: Array<{ attributes?: { volume?: string; fileName?: string } }> = coverData.data || []

          // Filter for requested volume number first
          let matchingCovers = coverList
          if (volumeNum !== null) {
            matchingCovers = coverList.filter((c) => {
              const v = c.attributes?.volume
              return v === String(volumeNum) || v === `${volumeNum}`
            })
            // If exact volume has no covers on MangaDex, include adjacent volumes (e.g. volume 1..5)
            if (matchingCovers.length === 0) {
              matchingCovers = coverList.slice(0, 10)
            }
          }

          matchingCovers.forEach((c) => {
            const fileName = c.attributes?.fileName
            if (fileName) {
              const fullUrl = `https://uploads.mangadex.org/covers/${mangaId}/${fileName}.512.jpg`
              if (!alternativeCovers.includes(fullUrl)) {
                alternativeCovers.push(fullUrl)
              }
            }
          })
        }
      } catch (mdErr) {
        console.warn('MangaDex volume covers search notice:', mdErr)
      }
    }

    return NextResponse.json({
      success: true,
      title,
      volume: volumeNum,
      covers: alternativeCovers,
    })
  } catch (error) {
    console.error('GET /api/covers error:', error)
    return NextResponse.json({ error: 'Błąd pobierania wariantów okładek' }, { status: 500 })
  }
}
