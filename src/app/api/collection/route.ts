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

    const userRatings = await prisma.mangaRating.findMany({
      where: { userId },
      select: { mangaId: true, rating: true },
    }).catch(() => [])
    const ratingMap = new Map(userRatings.map((r) => [r.mangaId, r.rating]))

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
          polishTitle: manga.polishTitle ?? null,
          publisher: manga.publisher?.name || 'Inne',
          coverUrl: manga.customCoverUrl || manga.defaultCover || vol.coverImage || '',
          customCoverUrl: manga.customCoverUrl || null,
          totalVolumes: manga.totalVolumesPoland || 0,
          totalVolumesJapan: manga.totalVolumesJapan ?? null,
          statusInPoland: (manga.statusInPoland as any) || 'ONGOING',
          description: manga.description || '',
          userSeriesRating: ratingMap.get(seriesId) ?? null,
          volumes: [],
        })
      }

      const series = seriesMap.get(seriesId)!
      series.volumes.push({
        volumeNumber: vol.volumeNumber,
        coverUrl: vol.customCoverUrl || vol.coverImage || series.coverUrl,
        customCoverUrl: vol.customCoverUrl,
        status: uc.status as CollectionVolumeItem['status'],
        coverPrice: vol.pricePLN ?? 34.99,
        purchasePrice: uc.purchasePrice,
        userRating: uc.userRating,
        notes: uc.notes,
      })

      if (vol.volumeNumber === 1 && !series.customCoverUrl && vol.customCoverUrl) {
        series.customCoverUrl = vol.customCoverUrl
        series.coverUrl = vol.customCoverUrl
      }

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

    let syncedCount = 0

    for (const s of incomingSeries) {
      if (!s.title) continue

      // 1. Find or create publisher
      let publisherId: string | undefined = undefined
      if (s.publisher && s.publisher !== 'Wszystkie' && s.publisher.trim().length > 0) {
        const pub = await prisma.publisher.upsert({
          where: { name: s.publisher.trim() },
          update: {},
          create: { name: s.publisher.trim() },
        })
        publisherId = pub.id
      }

      // 2. Find or create Manga (case-insensitive and alias matching)
      const numericAnilistId = /^\d+$/.test(s.mangaId) ? parseInt(s.mangaId, 10) : null
      let manga = await prisma.manga.findFirst({
        where: {
          OR: [
            ...(numericAnilistId ? [{ anilistId: numericAnilistId }] : []),
            ...(s.id && !s.id.startsWith('user-') ? [{ id: s.id }] : []),
            ...(s.mangaId && !s.mangaId.startsWith('user-') && !/^\d+$/.test(s.mangaId) ? [{ id: s.mangaId }] : []),
            { title: { equals: s.title, mode: 'insensitive' as const } },
            ...(s.polishTitle ? [{ polishTitle: { equals: s.polishTitle, mode: 'insensitive' as const } }] : []),
            { polishTitle: { equals: s.title, mode: 'insensitive' as const } },
            ...(s.polishTitle ? [{ title: { equals: s.polishTitle, mode: 'insensitive' as const } }] : []),
          ],
        },
      })

      if (!manga) {
        manga = await prisma.manga.create({
          data: {
            title: s.title,
            polishTitle: s.polishTitle || null,
            defaultCover: s.coverUrl || null,
            anilistId: numericAnilistId,
            publisherId,
            totalVolumesPoland: s.totalVolumes || null,
            totalVolumesJapan: s.totalVolumesJapan || null,
            description: s.description || null,
          },
        })
      } else {
        await prisma.manga.update({
          where: { id: manga.id },
          data: {
            publisherId: publisherId ?? manga.publisherId,
            defaultCover: manga.defaultCover || s.coverUrl || undefined,
            ...(s.polishTitle ? { polishTitle: s.polishTitle } : {}),
            ...(s.totalVolumes && s.totalVolumes > (manga.totalVolumesPoland || 0) ? { totalVolumesPoland: s.totalVolumes } : {}),
            ...(s.totalVolumesJapan ? { totalVolumesJapan: s.totalVolumesJapan } : {}),
            ...(numericAnilistId && !manga.anilistId ? { anilistId: numericAnilistId } : {}),
          },
        })
      }

      // Upsert series rating if defined
      if (s.userSeriesRating !== undefined) {
        if (s.userSeriesRating === null) {
          await prisma.mangaRating.deleteMany({
            where: { userId, mangaId: manga.id },
          }).catch(() => {})
        } else {
          const cleanRating = Math.min(10, Math.max(1, Math.round(Number(s.userSeriesRating))))
          if (!isNaN(cleanRating)) {
            await prisma.mangaRating.upsert({
              where: { userId_mangaId: { userId, mangaId: manga.id } },
              update: { rating: cleanRating },
              create: { userId, mangaId: manga.id, rating: cleanRating },
            }).catch(() => {})
          }
        }
      }

      // Check existing user collection entries for this manga to detect if actual changes occur
      const existingUserEntries = await prisma.userCollection.findMany({
        where: {
          userId,
          volume: { mangaId: manga.id },
        },
        select: {
          status: true,
          volume: { select: { volumeNumber: true } },
        },
      })
      const oldMap = new Map(existingUserEntries.map((e) => [e.volume.volumeNumber, e.status]))

      // 3. Ultra-fast and reliable Volume & UserCollection sync
      // Separate active volumes from NONE
      const activeVolumes = s.volumes.filter((v) => v.status && v.status !== 'NONE')
      const noneVolumes = s.volumes.filter((v) => !v.status || v.status === 'NONE')

      const newMap = new Map(activeVolumes.map((v) => [v.volumeNumber, v.status]))
      const hasCollectionChanged =
        oldMap.size !== newMap.size ||
        Array.from(newMap.entries()).some(([volNum, status]) => oldMap.get(volNum) !== status)

      // Process active volumes (OWNED, READ, WISHLIST, ORDERED, PREORDER)
      for (const vol of activeVolumes) {
        const volNum = Number.isInteger(vol.volumeNumber) ? vol.volumeNumber : parseInt(String(vol.volumeNumber), 10)
        if (isNaN(volNum) || volNum < 1) continue

        const safeCoverPrice = typeof vol.coverPrice === 'number' && !isNaN(vol.coverPrice)
          ? vol.coverPrice
          : (vol.coverPrice ? parseFloat(String(vol.coverPrice)) || 34.99 : 34.99)
        const safePurchasePrice = typeof vol.purchasePrice === 'number' && !isNaN(vol.purchasePrice)
          ? vol.purchasePrice
          : (vol.purchasePrice ? parseFloat(String(vol.purchasePrice)) || null : null)
        const safeRating = typeof vol.userRating === 'number' && !isNaN(vol.userRating)
          ? Math.min(10, Math.max(1, Math.round(vol.userRating)))
          : (vol.userRating ? parseInt(String(vol.userRating), 10) || null : null)

        const statusMap: Record<string, VolumeStatus> = {
          OWNED: VolumeStatus.OWNED,
          READ: VolumeStatus.READ,
          WISHLIST: VolumeStatus.WISHLIST,
          ORDERED: VolumeStatus.ORDERED,
          PREORDER: VolumeStatus.PREORDER,
        }
        const validStatus = statusMap[vol.status] || VolumeStatus.OWNED

        const dbVolume = await prisma.volume.upsert({
          where: {
            mangaId_volumeNumber: {
              mangaId: manga.id,
              volumeNumber: volNum,
            },
          },
          update: {
            coverImage: vol.coverUrl || undefined,
            customCoverUrl: vol.customCoverUrl || undefined,
            pricePLN: safeCoverPrice,
          },
          create: {
            mangaId: manga.id,
            volumeNumber: volNum,
            coverImage: vol.coverUrl || s.coverUrl,
            customCoverUrl: vol.customCoverUrl || null,
            pricePLN: safeCoverPrice,
          },
        })

        await prisma.userCollection.upsert({
          where: {
            userId_volumeId: {
              userId,
              volumeId: dbVolume.id,
            },
          },
          update: {
            status: validStatus,
            purchasePrice: safePurchasePrice,
            userRating: safeRating,
            notes: vol.notes ?? undefined,
          },
          create: {
            userId,
            volumeId: dbVolume.id,
            status: validStatus,
            purchasePrice: safePurchasePrice,
            userRating: safeRating,
            notes: vol.notes ?? null,
          },
        })
      }

      // Process NONE volumes: ONLY delete from userCollection if the volume actually exists in DB
      if (noneVolumes.length > 0) {
        const noneVolNums = noneVolumes
          .map((v) => (Number.isInteger(v.volumeNumber) ? v.volumeNumber : parseInt(String(v.volumeNumber), 10)))
          .filter((n) => !isNaN(n) && n > 0)

        if (noneVolNums.length > 0) {
          const existingDbVolumes = await prisma.volume.findMany({
            where: {
              mangaId: manga.id,
              volumeNumber: { in: noneVolNums },
            },
            select: { id: true },
          })

          if (existingDbVolumes.length > 0) {
            await prisma.userCollection.deleteMany({
              where: {
                userId,
                volumeId: { in: existingDbVolumes.map((v) => v.id) },
              },
            }).catch(() => {})
          }
        }
      }

      // Register activity in dashboard ONLY if actual changes occurred
      if (hasCollectionChanged) {
        const ownedOrReadVols = s.volumes.filter((v) => v.status === 'OWNED' || v.status === 'READ')
        if (ownedOrReadVols.length > 0) {
          const displayTitle = manga.polishTitle || manga.title
          const newContent = `zaktualizował kolekcję: ${displayTitle} (${ownedOrReadVols.length} tomów)`

          const lastActivity = await prisma.activity.findFirst({
            where: {
              userId,
              mangaId: manga.id,
            },
            orderBy: { createdAt: 'desc' },
          }).catch(() => null)

          if (!lastActivity || lastActivity.content !== newContent) {
            await prisma.activity.create({
              data: {
                type: 'ADDED_TO_COLLECTION',
                userId,
                mangaId: manga.id,
                content: newContent,
              },
            }).catch(() => {})
          }
        }
      }

      syncedCount++
    }

    return NextResponse.json({ success: true, count: syncedCount })
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
