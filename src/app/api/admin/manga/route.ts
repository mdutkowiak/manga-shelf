import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { normalizeTitleKey } from '@/lib/title-utils'

export async function GET() {
  try {
    const session = await auth()
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Brak uprawnień administratora' }, { status: 403 })
    }

    // 0. Auto-clean orphaned release manga duplicates such as "Kaoru i Rin. Rozkwitając z tobą #11"
    try {
      const orphanedToPurge = await prisma.manga.findMany({
        where: {
          OR: [
            { title: { contains: 'Rozkwitając z tobą #11', mode: 'insensitive' } },
            { title: { contains: 'Rozkwitając z tobą #', mode: 'insensitive' } },
            { title: { contains: 'Kaoru i Rin. Rozkwitając z tobą #', mode: 'insensitive' } },
            { title: { endsWith: '#11', mode: 'insensitive' } },
          ],
        },
        select: { id: true, title: true },
      })

      for (const orphan of orphanedToPurge) {
        // Only delete if it has no user collection items
        const colCount = await prisma.userCollection.count({
          where: { volume: { mangaId: orphan.id } },
        })
        if (colCount === 0) {
          console.log(`[ADMIN_MANGA_PURGE] Purging orphaned release manga: "${orphan.title}" (${orphan.id})`)
          await prisma.volumePrice.deleteMany({ where: { volume: { mangaId: orphan.id } } }).catch(() => {})
          await prisma.priceHistory.deleteMany({ where: { volume: { mangaId: orphan.id } } }).catch(() => {})
          await prisma.volume.deleteMany({ where: { mangaId: orphan.id } }).catch(() => {})
          await prisma.mangaRating.deleteMany({ where: { mangaId: orphan.id } }).catch(() => {})
          await prisma.activity.deleteMany({ where: { mangaId: orphan.id } }).catch(() => {})
          await prisma.manga.delete({ where: { id: orphan.id } }).catch(() => {})
        }
      }
    } catch (cleanupErr) {
      console.warn('Auto-cleanup of orphaned release manga failed:', cleanupErr)
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

      let coverUrl = m.customCoverUrl || m.defaultCover || (m.volumes[0]?.customCoverUrl || m.volumes[0]?.coverImage) || ''
      const norm = normalizeTitleKey(m.title)
      if (norm !== 'jujutsu-kaisen' && !norm.startsWith('jujutsu-kaisen--') && (coverUrl.includes('bx101517') || coverUrl.includes('jujutsu'))) {
        if (norm === 'chainsaw-man') {
          coverUrl = 'https://s4.anilist.co/file/anilistcdn/media/manga/cover/large/bx105778-9MhW0K0bUf7n.jpg'
        } else if (norm === 'solo-leveling') {
          coverUrl = 'https://s4.anilist.co/file/anilistcdn/media/manga/cover/large/bx105398-b6736294.jpg'
        } else if (norm === 'seihantai-na-kimi-to-boku') {
          coverUrl = 'https://s4.anilist.co/file/anilistcdn/media/manga/cover/large/bx144426-80516.jpg'
        } else {
          coverUrl = m.defaultCover && !m.defaultCover.includes('bx101517') ? m.defaultCover : ''
        }
      }

      return {
        id: m.id,
        title: m.title,
        polishTitle: m.polishTitle || m.title,
        publisherName: m.publisher?.name || 'Inne',
        statusInPoland: m.statusInPoland === 'FINISHED' ? 'FINISHED' : 'ONGOING',
        volumesCount: volCount,
        totalVolumesJapan: m.totalVolumesJapan,
        coverUrl,
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

export async function DELETE(request: Request) {
  try {
    const session = await auth()
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Brak uprawnień administratora' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    let id = searchParams.get('id')
    let title = searchParams.get('title')

    if (!id && !title) {
      try {
        const body = await request.json()
        id = body.id
        title = body.title
      } catch {
        // No body
      }
    }

    if (!id && !title) {
      return NextResponse.json({ error: 'Wymagane ID lub tytuł mangi do usunięcia' }, { status: 400 })
    }

    let deletedCount = 0

    if (id) {
      // Find manga to check
      const manga = await prisma.manga.findUnique({
        where: { id },
        select: { id: true, title: true, polishTitle: true },
      })

      if (manga) {
        await prisma.userCollection.deleteMany({ where: { volume: { mangaId: id } } }).catch(() => {})
        await prisma.volumePrice.deleteMany({ where: { volume: { mangaId: id } } }).catch(() => {})
        await prisma.priceHistory.deleteMany({ where: { volume: { mangaId: id } } }).catch(() => {})
        await prisma.volume.deleteMany({ where: { mangaId: id } }).catch(() => {})
        await prisma.mangaRating.deleteMany({ where: { mangaId: id } }).catch(() => {})
        await prisma.activity.deleteMany({ where: { mangaId: id } }).catch(() => {})
        await prisma.manga.delete({ where: { id } })
        deletedCount = 1

        if (session?.user?.id) {
          await prisma.activity.create({
            data: {
              userId: session.user.id,
              type: 'REMOVED_FROM_COLLECTION',
              content: `usunął serię z bazy danych: ${manga.polishTitle || manga.title}`,
              metadata: { action: 'admin_delete', title: manga.title, polishTitle: manga.polishTitle },
            },
          }).catch(() => {})
        }
      }
    } else if (title) {
      const mangasToDelete = await prisma.manga.findMany({
        where: {
          OR: [
            { title: { equals: title, mode: 'insensitive' } },
            { polishTitle: { equals: title, mode: 'insensitive' } },
            { title: { contains: title, mode: 'insensitive' } },
          ],
        },
        select: { id: true, title: true, polishTitle: true },
      })

      for (const m of mangasToDelete) {
        await prisma.userCollection.deleteMany({ where: { volume: { mangaId: m.id } } }).catch(() => {})
        await prisma.volumePrice.deleteMany({ where: { volume: { mangaId: m.id } } }).catch(() => {})
        await prisma.priceHistory.deleteMany({ where: { volume: { mangaId: m.id } } }).catch(() => {})
        await prisma.volume.deleteMany({ where: { mangaId: m.id } }).catch(() => {})
        await prisma.mangaRating.deleteMany({ where: { mangaId: m.id } }).catch(() => {})
        await prisma.activity.deleteMany({ where: { mangaId: m.id } }).catch(() => {})
        await prisma.manga.delete({ where: { id: m.id } }).catch(() => {})
        deletedCount++

        if (session?.user?.id) {
          await prisma.activity.create({
            data: {
              userId: session.user.id,
              type: 'REMOVED_FROM_COLLECTION',
              content: `usunął serię z bazy danych: ${m.polishTitle || m.title}`,
              metadata: { action: 'admin_delete', title: m.title, polishTitle: m.polishTitle },
            },
          }).catch(() => {})
        }
      }
    }

    return NextResponse.json({
      success: true,
      deletedCount,
      message: 'Manga została pomyślnie usunięta z bazy danych',
    })
  } catch (error) {
    console.error('[ADMIN_MANGA_DELETE]', error)
    return NextResponse.json({ error: 'Błąd podczas usuwania mangi' }, { status: 500 })
  }
}
