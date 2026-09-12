import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { VolumeStatus } from '@/generated/prisma/client'
import type { CollectionSeriesItem, CollectionVolumeItem } from '@/components/manga/series-collection-detail-modal'

export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    const { searchParams } = new URL(request.url)
    const queryUserId = searchParams.get('userId')
    const userId = session?.user?.id || queryUserId

    if (!userId) {
      return NextResponse.json({ series: [] }, { status: 200 })
    }

    const userCollections = await prisma.userCollection.findMany({
      where: { userId },
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

    // Group volumes by Manga into CollectionSeriesItem
    const seriesMap = new Map<string, CollectionSeriesItem>()

    for (const uc of userCollections) {
      const vol = uc.volume
      const manga = vol.manga
      const seriesId = manga.id

      if (!seriesMap.has(seriesId)) {
        seriesMap.set(seriesId, {
          id: seriesId,
          mangaId: manga.anilistId ? String(manga.anilistId) : seriesId,
          title: manga.title,
          publisher: manga.publisher?.name || 'Inne',
          coverUrl: manga.customCoverUrl || manga.defaultCover || vol.coverImage || '',
          totalVolumes: 0,
          description: manga.description || '',
          userSeriesRating: null,
          volumes: [],
        })
      }

      const series = seriesMap.get(seriesId)!
      series.volumes.push({
        volumeNumber: vol.volumeNumber,
        coverUrl: vol.customCoverUrl || vol.coverImage || series.coverUrl,
        customCoverUrl: vol.customCoverUrl,
        status: uc.status as CollectionVolumeItem['status'],
        purchasePrice: uc.purchasePrice,
        userRating: uc.userRating,
        notes: uc.notes,
      })

      if (vol.volumeNumber > series.totalVolumes) {
        series.totalVolumes = vol.volumeNumber
      }
    }

    const seriesList = Array.from(seriesMap.values())
    return NextResponse.json({ series: seriesList })
  } catch (error) {
    console.error('GET /api/collection error:', error)
    return NextResponse.json({ series: [], error: 'Błąd pobierania kolekcji' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Wymagane logowanie' }, { status: 401 })
    }

    const userId = session.user.id
    const body = await request.json()

    // Support either a single series or bulk list
    const incomingSeries: CollectionSeriesItem[] = body.syncAll
      ? body.syncAll
      : body.series
      ? [body.series]
      : []

    if (incomingSeries.length === 0) {
      return NextResponse.json({ error: 'Brak danych do zapisu' }, { status: 400 })
    }

    for (const s of incomingSeries) {
      if (!s.title) continue

      // 1. Find or create publisher
      let publisherId: string | undefined = undefined
      if (s.publisher && s.publisher !== 'Wszystkie') {
        const pub = await prisma.publisher.upsert({
          where: { name: s.publisher },
          update: {},
          create: { name: s.publisher },
        })
        publisherId = pub.id
      }

      // 2. Find or create Manga
      const numericAnilistId = /^\d+$/.test(s.mangaId) ? parseInt(s.mangaId, 10) : null
      let manga = numericAnilistId
        ? await prisma.manga.findUnique({ where: { anilistId: numericAnilistId } })
        : null

      if (!manga) {
        manga = await prisma.manga.findFirst({
          where: { title: s.title },
        })
      }

      if (!manga) {
        manga = await prisma.manga.create({
          data: {
            title: s.title,
            defaultCover: s.coverUrl,
            anilistId: numericAnilistId,
            publisherId,
            description: s.description || null,
          },
        })
      } else {
        await prisma.manga.update({
          where: { id: manga.id },
          data: {
            publisherId: publisherId ?? manga.publisherId,
            defaultCover: manga.defaultCover || s.coverUrl,
          },
        })
      }

      // 3. Upsert volumes and user collections
      for (const vol of s.volumes) {
        if (!vol.volumeNumber) continue

        // Upsert Volume
        const dbVolume = await prisma.volume.upsert({
          where: {
            mangaId_volumeNumber: {
              mangaId: manga.id,
              volumeNumber: vol.volumeNumber,
            },
          },
          update: {
            coverImage: vol.coverUrl || undefined,
            customCoverUrl: vol.customCoverUrl || undefined,
            pricePLN: vol.purchasePrice || undefined,
          },
          create: {
            mangaId: manga.id,
            volumeNumber: vol.volumeNumber,
            coverImage: vol.coverUrl || s.coverUrl,
            customCoverUrl: vol.customCoverUrl,
            pricePLN: vol.purchasePrice || 34.99,
          },
        })

        if (vol.status === 'NONE') {
          // Remove from collection if status is NONE
          await prisma.userCollection.deleteMany({
            where: {
              userId,
              volumeId: dbVolume.id,
            },
          })
        } else {
          // Map to Prisma VolumeStatus
          const statusMap: Record<string, VolumeStatus> = {
            OWNED: VolumeStatus.OWNED,
            READ: VolumeStatus.READ,
            WISHLIST: VolumeStatus.WISHLIST,
            ORDERED: VolumeStatus.ORDERED,
            PREORDER: VolumeStatus.PREORDER,
          }
          const validStatus = statusMap[vol.status] || VolumeStatus.OWNED

          await prisma.userCollection.upsert({
            where: {
              userId_volumeId: {
                userId,
                volumeId: dbVolume.id,
              },
            },
            update: {
              status: validStatus,
              purchasePrice: vol.purchasePrice ?? undefined,
              userRating: vol.userRating ?? undefined,
              notes: vol.notes ?? undefined,
            },
            create: {
              userId,
              volumeId: dbVolume.id,
              status: validStatus,
              purchasePrice: vol.purchasePrice ?? null,
              userRating: vol.userRating ?? null,
              notes: vol.notes ?? null,
            },
          })
        }
      }
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('POST /api/collection error:', error)
    return NextResponse.json({ error: 'Błąd zapisu kolekcji do bazy' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Wymagane logowanie' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const mangaId = searchParams.get('mangaId')
    const volumeNumber = searchParams.get('volumeNumber')

    if (!mangaId) {
      return NextResponse.json({ error: 'Brak mangaId' }, { status: 400 })
    }

    const numericAnilistId = /^\d+$/.test(mangaId) ? parseInt(mangaId, 10) : null
    const manga = numericAnilistId
      ? await prisma.manga.findUnique({ where: { anilistId: numericAnilistId } })
      : await prisma.manga.findFirst({ where: { OR: [{ id: mangaId }, { title: mangaId }] } })

    if (!manga) {
      return NextResponse.json({ success: true })
    }

    if (volumeNumber) {
      const volNum = parseInt(volumeNumber, 10)
      const volume = await prisma.volume.findUnique({
        where: { mangaId_volumeNumber: { mangaId: manga.id, volumeNumber: volNum } },
      })
      if (volume) {
        await prisma.userCollection.deleteMany({
          where: { userId: session.user.id, volumeId: volume.id },
        })
      }
    } else {
      // Remove all volumes for this manga from user's collection
      const volumes = await prisma.volume.findMany({
        where: { mangaId: manga.id },
        select: { id: true },
      })
      const volumeIds = volumes.map((v) => v.id)
      await prisma.userCollection.deleteMany({
        where: { userId: session.user.id, volumeId: { in: volumeIds } },
      })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('DELETE /api/collection error:', error)
    return NextResponse.json({ error: 'Błąd usuwania' }, { status: 500 })
  }
}
