import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

function formatReadersCount(count: number): string {
  if (count === 1) return 'Obecne na półce 1 czytelnika'
  return `Obecne na półkach ${count} czytelników`
}

function formatReadVolumesCount(count: number): string {
  if (count === 1) return '1 przeczytany tom'
  if (count % 10 >= 2 && count % 10 <= 4 && (count % 100 < 10 || count % 100 >= 20)) {
    return `${count} przeczytane tomy`
  }
  return `${count} przeczytanych tomów`
}

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

    // 1. TOP KOLEKCJONERZY
    if (category === 'collectors') {
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
              collections: {
                where: {
                  status: { in: ['OWNED', 'READ'] },
                  ...(dateFilter ? { createdAt: { gte: dateFilter } } : {}),
                },
              },
            },
          },
        },
        orderBy: {
          collections: { _count: 'desc' },
        },
        take: 10,
      })

      const collectors = users
        .filter((u) => u._count.collections > 0)
        .map((u, idx) => ({
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

    // 2. NAJWYŻEJ OCENIANE SERIE
    if (category === 'rating') {
      // Aggregate real ratings from mangaRating table
      const ratings = await prisma.mangaRating.groupBy({
        by: ['mangaId'],
        _avg: { rating: true },
        _count: { rating: true },
        where: dateFilter ? { createdAt: { gte: dateFilter } } : undefined,
        orderBy: { _avg: { rating: 'desc' } },
        take: 10,
      })

      // Also check if any ratings exist in userCollection if mangaRating is empty
      if (ratings.length === 0) {
        const userColRatings = await prisma.userCollection.findMany({
          where: {
            userRating: { not: null, gt: 0 },
            ...(dateFilter ? { updatedAt: { gte: dateFilter } } : {}),
          },
          select: {
            userRating: true,
            volume: { select: { mangaId: true } },
          },
        })

        if (userColRatings.length > 0) {
          const mangaRatingStats = new Map<string, { sum: number; count: number }>()
          for (const item of userColRatings) {
            if (!item.volume?.mangaId || !item.userRating) continue
            const cur = mangaRatingStats.get(item.volume.mangaId) || { sum: 0, count: 0 }
            cur.sum += item.userRating
            cur.count += 1
            mangaRatingStats.set(item.volume.mangaId, cur)
          }

          const sortedMangaIds = Array.from(mangaRatingStats.entries())
            .map(([mangaId, stat]) => ({
              mangaId,
              avg: stat.sum / stat.count,
              count: stat.count,
            }))
            .sort((a, b) => b.avg - a.avg || b.count - a.count)
            .slice(0, 10)

          const mangas = await prisma.manga.findMany({
            where: { id: { in: sortedMangaIds.map((s) => s.mangaId) } },
            include: { publisher: true },
          })
          const mangaMap = new Map(mangas.map((m) => [m.id, m]))

          const items = sortedMangaIds
            .map((s, idx) => {
              const m = mangaMap.get(s.mangaId)
              if (!m) return null
              return {
                rank: idx + 1,
                id: m.id,
                title: m.polishTitle || m.title,
                originalTitle: m.title,
                coverUrl: m.customCoverUrl || m.defaultCover,
                publisher: m.publisher?.name || '',
                score: s.avg.toFixed(1),
                count: s.count,
                subtext: `Średnia: ${s.avg.toFixed(1)} / 10 (${s.count} ${s.count === 1 ? 'ocena' : 'ocen'})`,
              }
            })
            .filter(Boolean)

          return NextResponse.json({ success: true, items })
        }

        // If genuinely 0 ratings in database, return empty array (no fake data!)
        return NextResponse.json({ success: true, items: [] })
      }

      const mangaIds = ratings.map((r) => r.mangaId)
      const mangas = await prisma.manga.findMany({
        where: { id: { in: mangaIds } },
        include: { publisher: true },
      })
      const mangaMap = new Map(mangas.map((m) => [m.id, m]))

      const items = ratings
        .map((r, idx) => {
          const m = mangaMap.get(r.mangaId)
          if (!m) return null
          const avgScore = (r._avg.rating || 0).toFixed(1)
          return {
            rank: idx + 1,
            id: m.id,
            title: m.polishTitle || m.title,
            originalTitle: m.title,
            coverUrl: m.customCoverUrl || m.defaultCover,
            publisher: m.publisher?.name || '',
            score: avgScore,
            count: r._count.rating,
            subtext: `Średnia: ${avgScore} / 10 (${r._count.rating} ${r._count.rating === 1 ? 'ocena' : 'ocen'})`,
            totalVolumes: m.totalVolumesPoland || 20,
            totalVolumesJapan: m.totalVolumesJapan,
            description: m.description,
          }
        })
        .filter(Boolean)

      return NextResponse.json({ success: true, items })
    }

    // 3. NAJWIĘCEJ CZYTAJĄCYCH (STATUS === 'READ')
    if (category === 'readers') {
      const readEntries = await prisma.userCollection.findMany({
        where: {
          status: 'READ',
          ...(dateFilter ? { updatedAt: { gte: dateFilter } } : {}),
        },
        select: {
          userId: true,
          volume: {
            select: {
              mangaId: true,
            },
          },
        },
      })

      // Count distinct readers per manga, and total read volumes
      const mangaReadersMap = new Map<string, { readers: Set<string>; volumeCount: number }>()
      for (const entry of readEntries) {
        if (!entry.volume?.mangaId) continue
        const cur = mangaReadersMap.get(entry.volume.mangaId) || { readers: new Set(), volumeCount: 0 }
        cur.readers.add(entry.userId)
        cur.volumeCount += 1
        mangaReadersMap.set(entry.volume.mangaId, cur)
      }

      const sortedReaders = Array.from(mangaReadersMap.entries())
        .map(([mangaId, stats]) => ({
          mangaId,
          readersCount: stats.readers.size,
          volumeCount: stats.volumeCount,
        }))
        .sort((a, b) => b.readersCount - a.readersCount || b.volumeCount - a.volumeCount)
        .slice(0, 10)

      if (sortedReaders.length === 0) {
        return NextResponse.json({ success: true, items: [] })
      }

      const mangas = await prisma.manga.findMany({
        where: { id: { in: sortedReaders.map((r) => r.mangaId) } },
        include: { publisher: true },
      })
      const mangaMap = new Map(mangas.map((m) => [m.id, m]))

      const items = sortedReaders
        .map((entry, idx) => {
          const m = mangaMap.get(entry.mangaId)
          if (!m) return null
          return {
            rank: idx + 1,
            id: m.id,
            title: m.polishTitle || m.title,
            originalTitle: m.title,
            coverUrl: m.customCoverUrl || m.defaultCover,
            publisher: m.publisher?.name || '',
            count: entry.readersCount,
            subtext: `${formatReadVolumesCount(entry.volumeCount)} (${entry.readersCount} ${entry.readersCount === 1 ? 'czytelnik' : 'czytelników'})`,
            totalVolumes: m.totalVolumesPoland || 20,
            totalVolumesJapan: m.totalVolumesJapan,
            description: m.description,
          }
        })
        .filter(Boolean)

      return NextResponse.json({ success: true, items })
    }

    // 4. NAJPOPULARNIEJSZE SERIE (STATUS === 'OWNED' lub 'READ') - zliczanie UNIKALNYCH czytelników
    const collectedEntries = await prisma.userCollection.findMany({
      where: {
        status: { in: ['OWNED', 'READ'] },
        ...(dateFilter ? { createdAt: { gte: dateFilter } } : {}),
      },
      select: {
        userId: true,
        volume: {
          select: {
            mangaId: true,
          },
        },
      },
    })

    // Count distinct users who have each manga in their collection
    const mangaDistinctUsers = new Map<string, Set<string>>()
    for (const uc of collectedEntries) {
      if (!uc.volume?.mangaId) continue
      const set = mangaDistinctUsers.get(uc.volume.mangaId) || new Set<string>()
      set.add(uc.userId)
      mangaDistinctUsers.set(uc.volume.mangaId, set)
    }

    const sortedByPopularity = Array.from(mangaDistinctUsers.entries())
      .map(([mangaId, userSet]) => ({ mangaId, userCount: userSet.size }))
      .sort((a, b) => b.userCount - a.userCount)

    // Also include any other mangas from DB if fewer than 10 have been collected, but with real 0 count
    const topMangaIds = sortedByPopularity.map((s) => s.mangaId)
    let remainingMangaIds: string[] = []
    if (topMangaIds.length < 10) {
      const otherMangas = await prisma.manga.findMany({
        where: { id: { notIn: topMangaIds } },
        take: 10 - topMangaIds.length,
        select: { id: true },
      })
      remainingMangaIds = otherMangas.map((m) => m.id)
    }

    const allNeededIds = [...topMangaIds, ...remainingMangaIds].slice(0, 10)

    if (allNeededIds.length === 0) {
      return NextResponse.json({ success: true, items: [] })
    }

    const mangas = await prisma.manga.findMany({
      where: { id: { in: allNeededIds } },
      include: { publisher: true },
    })
    const mangaMap = new Map(mangas.map((m) => [m.id, m]))

    const items = allNeededIds
      .map((mId, idx) => {
        const m = mangaMap.get(mId)
        if (!m) return null
        const realUserCount = mangaDistinctUsers.get(mId)?.size || 0
        return {
          rank: idx + 1,
          id: m.id,
          title: m.polishTitle || m.title,
          originalTitle: m.title,
          coverUrl: m.customCoverUrl || m.defaultCover,
          publisher: m.publisher?.name || '',
          count: realUserCount,
          subtext: formatReadersCount(realUserCount),
          totalVolumes: m.totalVolumesPoland || 20,
          totalVolumesJapan: m.totalVolumesJapan,
          description: m.description,
        }
      })
      .filter(Boolean)

    return NextResponse.json({ success: true, items })
  } catch (error) {
    console.error('[API_RANKINGS_GET]', error)
    return NextResponse.json({ error: 'Błąd pobierania rankingu' }, { status: 500 })
  }
}
