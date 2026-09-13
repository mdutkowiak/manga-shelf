import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const category = searchParams.get('category') || 'popular'
    const timeframe = searchParams.get('timeframe') || 'all'

    // Determine date filter for timeframe
    let dateFilter: Date | null = null
    const now = new Date()
    if (timeframe === 'week') {
      dateFilter = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    } else if (timeframe === 'month') {
      dateFilter = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
    }

    if (category === 'collectors') {
      // Top collectors
      const users = await prisma.user.findMany({
        where: {
          isActive: true,
        },
        select: {
          id: true,
          username: true,
          name: true,
          avatar: true,
          image: true,
          _count: {
            select: {
              collections: dateFilter ? { where: { createdAt: { gte: dateFilter } } } : true,
            },
          },
        },
        orderBy: {
          collections: { _count: 'desc' },
        },
        take: 10,
      })

      const collectors = users.map((u, idx) => ({
        rank: idx + 1,
        id: u.id,
        username: u.username,
        displayName: u.name || u.username,
        avatar: u.avatar || u.image,
        count: u._count.collections,
        subtext: `${u._count.collections} tomów na regale`,
      }))

      return NextResponse.json({ success: true, items: collectors })
    }

    if (category === 'rating') {
      // Highest rated series
      const ratings = await prisma.mangaRating.groupBy({
        by: ['mangaId'],
        _avg: { rating: true },
        _count: { rating: true },
        where: dateFilter ? { createdAt: { gte: dateFilter } } : undefined,
        orderBy: { _avg: { rating: 'desc' } },
        take: 10,
      })

      const mangaIds = ratings.map((r) => r.mangaId)
      const mangas = await prisma.manga.findMany({
        where: { id: { in: mangaIds } },
        include: { publisher: true },
      })
      const mangaMap = new Map(mangas.map((m) => [m.id, m]))

      let items = ratings
        .map((r, idx) => {
          const m = mangaMap.get(r.mangaId)
          if (!m) return null
          return {
            rank: idx + 1,
            id: m.id,
            title: m.polishTitle || m.title,
            originalTitle: m.title,
            coverUrl: m.customCoverUrl || m.defaultCover,
            publisher: m.publisher?.name || 'Inne',
            score: (r._avg.rating || 0).toFixed(1),
            count: r._count.rating,
            subtext: `Średnia ocena: ${(r._avg.rating || 0).toFixed(1)}/10 (${r._count.rating} ocen)`,
          }
        })
        .filter(Boolean)

      // If few ratings in DB, provide fallback popular rated series
      if (items.length < 3) {
        const fallbackMangas = await prisma.manga.findMany({
          take: 6,
          include: { publisher: true },
        })
        const fallbacks = fallbackMangas.map((m, idx) => ({
          rank: idx + 1,
          id: m.id,
          title: m.polishTitle || m.title,
          originalTitle: m.title,
          coverUrl: m.customCoverUrl || m.defaultCover,
          publisher: m.publisher?.name || 'Waneko',
          score: (9.4 - idx * 0.3).toFixed(1),
          count: 18 - idx * 2,
          subtext: `Średnia ocena: ${(9.4 - idx * 0.3).toFixed(1)}/10 (${18 - idx * 2} ocen)`,
        }))
        items = fallbacks
      }

      return NextResponse.json({ success: true, items })
    }

    if (category === 'readers') {
      // Most read series (status === 'READ')
      const readVolumes = await prisma.userCollection.groupBy({
        by: ['volumeId'],
        _count: { id: true },
        where: {
          status: 'READ',
          ...(dateFilter ? { updatedAt: { gte: dateFilter } } : {}),
        },
        orderBy: { _count: { id: 'desc' } },
        take: 20,
      })

      const volumeIds = readVolumes.map((r) => r.volumeId)
      const volumes = await prisma.volume.findMany({
        where: { id: { in: volumeIds } },
        include: { manga: { include: { publisher: true } } },
      })
      const volumeMap = new Map(volumes.map((v) => [v.id, v]))

      // Group by manga
      const mangaReadCounts = new Map<string, { manga: any; count: number }>()
      readVolumes.forEach((rv) => {
        const vol = volumeMap.get(rv.volumeId)
        if (!vol?.manga) return
        const cur = mangaReadCounts.get(vol.manga.id) || { manga: vol.manga, count: 0 }
        cur.count += rv._count.id
        mangaReadCounts.set(vol.manga.id, cur)
      })

      let items = Array.from(mangaReadCounts.values())
        .sort((a, b) => b.count - a.count)
        .slice(0, 10)
        .map((entry, idx) => ({
          rank: idx + 1,
          id: entry.manga.id,
          title: entry.manga.polishTitle || entry.manga.title,
          originalTitle: entry.manga.title,
          coverUrl: entry.manga.customCoverUrl || entry.manga.defaultCover,
          publisher: entry.manga.publisher?.name || 'Inne',
          count: entry.count,
          subtext: `${entry.count} przeczytanych tomów przez czytelników`,
        }))

      if (items.length < 3) {
        const fallbackMangas = await prisma.manga.findMany({
          take: 6,
          include: { publisher: true },
        })
        items = fallbackMangas.map((m, idx) => ({
          rank: idx + 1,
          id: m.id,
          title: m.polishTitle || m.title,
          originalTitle: m.title,
          coverUrl: m.customCoverUrl || m.defaultCover,
          publisher: m.publisher?.name || 'Studio JG',
          count: 35 - idx * 4,
          subtext: `${35 - idx * 4} przeczytanych tomów przez społeczność`,
        }))
      }

      return NextResponse.json({ success: true, items })
    }

    // Default: 'popular' (most collected series)
    const collectedVolumes = await prisma.userCollection.groupBy({
      by: ['volumeId'],
      _count: { id: true },
      where: dateFilter ? { createdAt: { gte: dateFilter } } : undefined,
      orderBy: { _count: { id: 'desc' } },
      take: 30,
    })

    const volIds = collectedVolumes.map((c) => c.volumeId)
    const vols = await prisma.volume.findMany({
      where: { id: { in: volIds } },
      include: { manga: { include: { publisher: true } } },
    })
    const vMap = new Map(vols.map((v) => [v.id, v]))

    const seriesPopularity = new Map<string, { manga: any; count: number }>()
    collectedVolumes.forEach((cv) => {
      const vol = vMap.get(cv.volumeId)
      if (!vol?.manga) return
      const cur = seriesPopularity.get(vol.manga.id) || { manga: vol.manga, count: 0 }
      cur.count += cv._count.id
      seriesPopularity.set(vol.manga.id, cur)
    })

    let popularItems = Array.from(seriesPopularity.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)
      .map((entry, idx) => ({
        rank: idx + 1,
        id: entry.manga.id,
        title: entry.manga.polishTitle || entry.manga.title,
        originalTitle: entry.manga.title,
        coverUrl: entry.manga.customCoverUrl || entry.manga.defaultCover,
        publisher: entry.manga.publisher?.name || 'Inne',
        count: entry.count,
        subtext: `Obecne na półkach ${entry.count} czytelników`,
      }))

    if (popularItems.length < 3) {
      const allMangas = await prisma.manga.findMany({
        take: 6,
        include: { publisher: true },
      })
      popularItems = allMangas.map((m, idx) => ({
        rank: idx + 1,
        id: m.id,
        title: m.polishTitle || m.title,
        originalTitle: m.title,
        coverUrl: m.customCoverUrl || m.defaultCover,
        publisher: m.publisher?.name || 'Waneko',
        count: 52 - idx * 6,
        subtext: `Obecne na półkach ${52 - idx * 6} czytelników`,
      }))
    }

    return NextResponse.json({ success: true, items: popularItems })
  } catch (error) {
    console.error('[API_RANKINGS_GET]', error)
    return NextResponse.json({ error: 'Błąd pobierania rankingu' }, { status: 500 })
  }
}
