import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ username: string }> | { username: string } }
) {
  try {
    const resolvedParams = params instanceof Promise ? await params : params
    const rawUsername = resolvedParams?.username

    if (!rawUsername) {
      return NextResponse.json({ error: 'Brak nazwy użytkownika' }, { status: 400 })
    }

    const cleanUsername = decodeURIComponent(rawUsername).trim()

    // 1. Spróbuj wyszukać przez findUnique (szybki index na username)
    let user = await prisma.user.findUnique({
      where: { username: cleanUsername },
      select: {
        id: true,
        username: true,
        name: true,
        bio: true,
        avatar: true,
        image: true,
        createdAt: true,
        _count: {
          select: { collections: true },
        },
      },
    }).catch(() => null)

    // 2. Jeśli nie znaleziono, spróbuj case-insensitive
    if (!user) {
      user = await prisma.user.findFirst({
        where: {
          username: {
            equals: cleanUsername,
            mode: 'insensitive',
          },
        },
        select: {
          id: true,
          username: true,
          name: true,
          bio: true,
          avatar: true,
          image: true,
          createdAt: true,
          _count: {
            select: { collections: true },
          },
        },
      }).catch(() => null)
    }

    // 3. Jeśli nadal nie znaleziono, sprawdź czy cleanUsername nie jest ID użytkownika
    if (!user) {
      user = await prisma.user.findUnique({
        where: { id: cleanUsername },
        select: {
          id: true,
          username: true,
          name: true,
          bio: true,
          avatar: true,
          image: true,
          createdAt: true,
          _count: {
            select: { collections: true },
          },
        },
      }).catch(() => null)
    }

    if (!user) {
      return NextResponse.json({ error: 'Nie znaleziono użytkownika' }, { status: 404 })
    }

    // Pobierz oceny mang danego użytkownika
    const userRatings = await prisma.mangaRating.findMany({
      where: { userId: user.id },
      select: { mangaId: true, rating: true },
    }).catch(() => [])
    const ratingMap = new Map(userRatings.map((r) => [r.mangaId, r.rating]))

    // Pobierz tomy użytkownika z relacjami
    const collections = await prisma.userCollection.findMany({
      where: { userId: user.id },
      include: {
        volume: {
          include: {
            manga: {
              include: {
                publisher: true,
              },
            },
          },
        },
      },
    }).catch((err) => {
      console.error('Error fetching collections for user:', err)
      return []
    })

    // Pogrupuj tomy w całe serie (tak samo jak w /api/collection)
    const seriesMap = new Map<string, any>()
    const flatVolumes: any[] = []

    for (const uc of collections) {
      if (!uc.volume) continue
      const vol = uc.volume
      const manga = vol.manga
      if (!manga) continue

      const seriesId = manga.id

      if (!seriesMap.has(seriesId)) {
        seriesMap.set(seriesId, {
          id: seriesId,
          mangaId: manga.anilistId ? String(manga.anilistId) : seriesId,
          title: manga.title || 'Manga',
          polishTitle: manga.polishTitle ?? null,
          publisher: manga.publisher?.name || 'Inne',
          coverUrl: manga.customCoverUrl || manga.defaultCover || vol.coverImage || '',
          customCoverUrl: manga.customCoverUrl || null,
          totalVolumes: manga.totalVolumesPoland || 0,
          totalVolumesJapan: manga.totalVolumesJapan ?? null,
          statusInPoland: (manga.statusInPoland as any) || 'UNKNOWN',
          description: manga.description || '',
          userSeriesRating: ratingMap.get(seriesId) ?? null,
          volumes: [],
        })
      }

      const series = seriesMap.get(seriesId)!
      series.volumes.push({
        id: vol.id,
        volumeNumber: vol.volumeNumber,
        coverUrl: vol.customCoverUrl || vol.coverImage || series.coverUrl,
        customCoverUrl: vol.customCoverUrl,
        status: uc.status,
        coverPrice: vol.pricePLN ?? 34.99,
        purchasePrice: uc.purchasePrice,
        userRating: uc.userRating,
        notes: uc.notes,
      })

      if (vol.volumeNumber > series.totalVolumes) {
        series.totalVolumes = vol.volumeNumber
      }

      flatVolumes.push({
        id: vol.id,
        volumeNumber: vol.volumeNumber,
        coverImage: vol.coverImage,
        customCoverUrl: vol.customCoverUrl,
        manga: {
          id: manga.id,
          title: manga.title,
          polishTitle: manga.polishTitle,
          defaultCover: manga.defaultCover,
          customCoverUrl: manga.customCoverUrl,
          publisher: manga.publisher?.name || 'Inne',
        },
        collection: {
          status: uc.status,
          userRating: uc.userRating,
        },
      })
    }

    // Sortuj serie alfabetycznie po tytule
    const seriesList = Array.from(seriesMap.values()).sort((a, b) =>
      (a.polishTitle || a.title).localeCompare(b.polishTitle || b.title, 'pl')
    )

    // Sortuj tomy wewnątrz każdej serii po volumeNumber
    seriesList.forEach((s) => {
      s.volumes.sort((a: any, b: any) => a.volumeNumber - b.volumeNumber)
    })

    return NextResponse.json({
      profile: {
        ...user,
        avatar: user.avatar || user.image || null,
      },
      series: seriesList,
      volumes: flatVolumes,
    })
  } catch (error) {
    console.error('GET /api/users/[username]:', error)
    return NextResponse.json({ error: 'Błąd serwera' }, { status: 500 })
  }
}


