import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ username: string }> }
) {
  const { username } = await params

  try {
    const user = await prisma.user.findFirst({
      where: {
        username: {
          equals: username,
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
    })

    if (!user) {
      return NextResponse.json({ error: 'Nie znaleziono użytkownika' }, { status: 404 })
    }

    // Pobierz oceny mang danego użytkownika
    const userRatings = await prisma.mangaRating.findMany({
      where: { userId: user.id },
      select: { mangaId: true, rating: true },
    }).catch(() => [])
    const ratingMap = new Map(userRatings.map((r) => [r.mangaId, r.rating]))

    // Pobierz tomy użytkownika z pełnymi relacjami
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
      orderBy: [
        { volume: { manga: { title: 'asc' } } },
        { volume: { volumeNumber: 'asc' } },
      ],
    })

    // Pogrupuj tomy w całe serie (tak samo jak w /api/collection)
    const seriesMap = new Map<string, any>()

    for (const uc of collections) {
      const vol = uc.volume
      const manga = vol.manga
      const seriesId = manga.id

      if (!seriesMap.has(seriesId)) {
        seriesMap.set(seriesId, {
          id: seriesId,
          mangaId: manga.anilistId ? String(manga.anilistId) : seriesId,
          title: manga.title,
          polishTitle: manga.polishTitle ?? null,
          publisher: manga.publisher?.name || 'Inne',
          coverUrl: manga.customCoverUrl || manga.defaultCover || vol.coverImage || '',
          totalVolumes: manga.totalVolumesPoland || 0,
          totalVolumesJapan: manga.totalVolumesJapan ?? null,
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
    }

    const seriesList = Array.from(seriesMap.values())

    const volumes = collections.map((c) => ({
      id: c.volume.id,
      volumeNumber: c.volume.volumeNumber,
      coverImage: c.volume.coverImage,
      customCoverUrl: c.volume.customCoverUrl,
      manga: {
        id: c.volume.manga.id,
        title: c.volume.manga.title,
        polishTitle: c.volume.manga.polishTitle,
        defaultCover: c.volume.manga.defaultCover,
        customCoverUrl: c.volume.manga.customCoverUrl,
        publisher: c.volume.manga.publisher?.name || 'Inne',
      },
      collection: {
        status: c.status,
        userRating: c.userRating,
      },
    }))

    return NextResponse.json({
      profile: {
        ...user,
        avatar: user.avatar || user.image || null,
      },
      series: seriesList,
      volumes,
    })
  } catch (error) {
    console.error('GET /api/users/[username]:', error)
    return NextResponse.json({ error: 'Błąd serwera' }, { status: 500 })
  }
}

