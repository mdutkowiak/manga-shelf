import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'

export async function GET() {
  try {
    const session = await auth()
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Brak uprawnień administratora' }, { status: 403 })
    }

    const mangas = await prisma.manga.findMany({
      include: {
        publisher: true,
        volumes: {
          select: {
            id: true,
            volumeNumber: true,
            pricePLN: true,
            coverImage: true,
            customCoverUrl: true,
          },
          orderBy: { volumeNumber: 'asc' },
        },
        _count: {
          select: {
            volumes: true,
          },
        },
      },
      orderBy: {
        title: 'asc',
      },
    })

    // Get count of user collections for each manga
    const userCollections = await prisma.userCollection.findMany({
      select: {
        volume: {
          select: {
            mangaId: true,
          },
        },
      },
    })

    const collectionCountByManga = new Map<string, number>()
    for (const uc of userCollections) {
      if (uc.volume?.mangaId) {
        collectionCountByManga.set(
          uc.volume.mangaId,
          (collectionCountByManga.get(uc.volume.mangaId) || 0) + 1
        )
      }
    }

    const formatted = mangas.map((m) => {
      const volCount = m.totalVolumesPoland || m._count.volumes || m.volumes.length
      const inUserCollection = (collectionCountByManga.get(m.id) || 0) > 0

      return {
        id: m.id,
        title: m.title,
        polishTitle: m.polishTitle || m.title,
        publisherName: m.publisher?.name || 'Inne',
        statusInPoland: m.statusInPoland === 'FINISHED' ? 'FINISHED' : 'ONGOING',
        volumesCount: volCount,
        totalVolumesJapan: m.totalVolumesJapan,
        coverUrl: m.customCoverUrl || m.defaultCover || (m.volumes[0]?.customCoverUrl || m.volumes[0]?.coverImage) || '',
        inUserCollection,
        collectionItemsCount: collectionCountByManga.get(m.id) || 0,
        volumes: m.volumes,
        hasAdminEdits: Boolean(m.customCoverUrl || m.polishTitle || m.totalVolumesJapan),
      }
    })

    return NextResponse.json({ success: true, mangas: formatted })
  } catch (error) {
    console.error('[ADMIN_MANGA_GET]', error)
    return NextResponse.json({ error: 'Błąd pobierania mang' }, { status: 500 })
  }
}
