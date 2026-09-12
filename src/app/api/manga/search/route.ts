import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { searchManga, cleanDescription } from '@/lib/anilist'

export interface UnifiedMangaSearchResult {
  id: string
  anilistId: number | null
  dbId?: string | null
  title: string
  polishTitle?: string | null
  romajiTitle?: string | null
  nativeTitle?: string | null
  primaryTitle: string
  secondaryTitle?: string | null
  coverUrl: string
  publisher: string
  totalVolumes: number
  totalVolumesJapan?: number | null
  totalVolumesPoland?: number | null
  description?: string | null
  isLocal: boolean
}

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get('q')?.trim() || ''

  if (!q || q.length < 2) {
    return NextResponse.json({ mangas: [] })
  }

  try {
    // 1. Search local PostgreSQL database
    let localMangas: any[] = []
    try {
      localMangas = await prisma.manga.findMany({
        where: {
          OR: [
            { polishTitle: { contains: q, mode: 'insensitive' } },
            { title: { contains: q, mode: 'insensitive' } },
            { nativeTitle: { contains: q, mode: 'insensitive' } },
          ],
        },
        include: {
          publisher: true,
          volumes: {
            orderBy: { volumeNumber: 'asc' },
            take: 1,
          },
          _count: { select: { volumes: true } },
        },
        take: 10,
      })
    } catch (dbErr) {
      console.warn('Local manga DB search warning:', dbErr)
    }

    // 2. Search AniList API
    let anilistMedia: any[] = []
    try {
      const anilistRes = await searchManga(q, 1, 8)
      anilistMedia = anilistRes?.data?.Page?.media || []
    } catch (aniErr) {
      console.warn('AniList search warning:', aniErr)
    }

    const results: UnifiedMangaSearchResult[] = []
    const seenAnilistIds = new Set<number>()
    const seenTitles = new Set<string>()

    // Add local DB results first
    for (const m of localMangas) {
      if (m.anilistId) seenAnilistIds.add(m.anilistId)
      seenTitles.add(m.title.toLowerCase().trim())
      if (m.polishTitle) seenTitles.add(m.polishTitle.toLowerCase().trim())

      const primary = m.polishTitle || m.title
      const secondary = m.polishTitle && m.polishTitle !== m.title ? m.title : null
      const bestCover = m.customCoverUrl || m.defaultCover || m.volumes?.[0]?.coverImage || ''

      results.push({
        id: m.anilistId ? String(m.anilistId) : m.id,
        dbId: m.id,
        anilistId: m.anilistId ?? null,
        title: m.title,
        polishTitle: m.polishTitle ?? null,
        romajiTitle: m.title,
        nativeTitle: m.nativeTitle ?? null,
        primaryTitle: primary,
        secondaryTitle: secondary,
        coverUrl: bestCover,
        publisher: m.publisher?.name || 'Waneko',
        totalVolumes: m.totalVolumesPoland || m._count?.volumes || 1,
        totalVolumesJapan: m.totalVolumesJapan ?? null,
        totalVolumesPoland: m.totalVolumesPoland ?? null,
        description: m.description ? cleanDescription(m.description) : null,
        isLocal: true,
      })
    }

    // Add AniList results
    for (const media of anilistMedia) {
      if (seenAnilistIds.has(media.id)) continue

      const romaji = media.title?.romaji || ''
      const english = media.title?.english || ''
      const native = media.title?.native || ''

      if (
        (romaji && seenTitles.has(romaji.toLowerCase().trim())) ||
        (english && seenTitles.has(english.toLowerCase().trim()))
      ) {
        continue
      }

      seenAnilistIds.add(media.id)

      const primary = english || romaji || 'Manga'
      const secondary = english && romaji && english !== romaji ? romaji : null
      const cover = media.coverImage?.extraLarge || media.coverImage?.large || ''

      results.push({
        id: String(media.id),
        anilistId: media.id,
        dbId: null,
        title: romaji || english || 'Manga',
        polishTitle: null,
        romajiTitle: romaji || null,
        nativeTitle: native || null,
        primaryTitle: primary,
        secondaryTitle: secondary,
        coverUrl: cover,
        publisher: 'Waneko',
        totalVolumes: media.volumes && media.volumes > 0 ? media.volumes : 1,
        totalVolumesJapan: media.volumes ?? null,
        totalVolumesPoland: null,
        description: media.description ? cleanDescription(media.description) : null,
        isLocal: false,
      })
    }

    return NextResponse.json({ mangas: results })
  } catch (error) {
    console.error('GET /api/manga/search error:', error)
    return NextResponse.json({ mangas: [], error: 'Błąd wyszukiwania' }, { status: 500 })
  }
}
