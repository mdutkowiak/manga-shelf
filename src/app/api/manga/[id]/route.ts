import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { normalizeTitleKey } from '@/lib/title-utils'
import { getMangaById, searchManga, cleanDescription, type AniListManga } from '@/lib/anilist'

const polishPublisherMap: Record<string, { name: string; avgPrice: number }> = {
  'Chainsaw Man': { name: 'Studio JG', avgPrice: 34.99 },
  'Jujutsu Kaisen': { name: 'Waneko', avgPrice: 32.99 },
  'Spy x Family': { name: 'Waneko', avgPrice: 32.50 },
  'Oshi no Ko': { name: 'Studio JG', avgPrice: 34.99 },
  'Sakamoto Days': { name: 'Waneko', avgPrice: 32.99 },
  'Berserk': { name: 'J.P.Fantastica', avgPrice: 39.99 },
  'One Piece': { name: 'Waneko', avgPrice: 28.99 },
  'Attack on Titan': { name: 'Waneko', avgPrice: 34.80 },
  'Demon Slayer': { name: 'Waneko', avgPrice: 34.90 },
  'Demon Slayer: Kimetsu no Yaiba': { name: 'Waneko', avgPrice: 34.90 },
  'Tokyo Ghoul': { name: 'Waneko', avgPrice: 29.90 },
  'Gintama': { name: 'Studio JG', avgPrice: 34.99 },
  'Given': { name: 'Kotori', avgPrice: 31.99 },
  'Frieren: Beyond Journey\'s End': { name: 'Studio JG', avgPrice: 34.99 },
  'Dandadan': { name: 'Studio JG', avgPrice: 34.99 },
  'Solo Leveling': { name: 'Studio JG', avgPrice: 54.99 },
}

const knownIdMap: Record<string, string> = {
  '117832': 'Chainsaw Man',
  '114036': 'Chainsaw Man',
  '3': 'Chainsaw Man',
  '117195': 'Oshi no Ko',
  '1': 'Attack on Titan',
  '123': 'Attack on Titan',
  '30001': 'Attack on Titan',
  '2': 'One Piece',
  '21': 'One Piece',
  '30013': 'One Piece',
  '30012': 'Bleach',
  '101517': 'Jujutsu Kaisen',
  '118586': 'Frieren: Beyond Journey\'s End',
  '125862': 'Sakamoto Days',
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  try {
    // 1. Try fetching from database first
    try {
      const numericAnilist = /^\d+$/.test(id) ? parseInt(id, 10) : null
      const manga = await prisma.manga.findFirst({
        where: {
          OR: [
            { id },
            ...(numericAnilist ? [{ anilistId: numericAnilist }] : []),
          ],
        },
        include: {
          publisher: true,
          volumes: {
            orderBy: { volumeNumber: 'asc' },
          },
          ratings: {
            select: { rating: true },
          },
          _count: { select: { volumes: true, ratings: true } },
        },
      })

      if (manga) {
        const maxVolLimit = Math.max(manga.totalVolumesPoland || 1, manga.totalVolumesJapan || 0)
        const filteredVolumes = manga.totalVolumesPoland
          ? manga.volumes.filter((v) => v.volumeNumber <= maxVolLimit)
          : manga.volumes
        return NextResponse.json({
          ...manga,
          volumes: filteredVolumes,
        })
      }
    } catch {
      // Database might be offline in demo mode
    }

    // 2. Fetch from AniList API (check known aliases first)
    let anilistMedia: AniListManga | null = null
    const knownTitle = knownIdMap[id]

    if (knownTitle) {
      try {
        const searchRes = await searchManga(knownTitle, 1, 1)
        anilistMedia = searchRes?.data?.Page?.media?.[0]
      } catch (err) {
        console.error('Known title AniList search failed:', err)
      }
    }

    const numericId = parseInt(id, 10)
    if (!anilistMedia && !isNaN(numericId)) {
      try {
        const res = await getMangaById(numericId)
        anilistMedia = res?.data?.Media
      } catch (err) {
        console.error('AniList fetch by id failed:', err)
      }
    }

    if (!anilistMedia) {
      try {
        const searchRes = await searchManga(id.replace(/-/g, ' '), 1, 1)
        anilistMedia = searchRes?.data?.Page?.media?.[0]
      } catch (err) {
        console.error('AniList search fallback failed:', err)
      }
    }

    if (anilistMedia) {
      const title = anilistMedia.title.english || anilistMedia.title.romaji
      const publisherInfo = polishPublisherMap[title] || polishPublisherMap[anilistMedia.title.romaji] || {
        name: 'Waneko',
        avgPrice: 34.99,
      }

      const totalVols = anilistMedia.volumes || 24
      const volumes = Array.from({ length: Math.min(totalVols, 30) }, (_, i) => {
        const volNum = i + 1
        return {
          id: `vol-${anilistMedia.id}-${volNum}`,
          volumeNumber: volNum,
          isbn: `978-83-${Math.floor(100000 + Math.random() * 900000)}-${volNum}`,
          polishReleaseDate: new Date(2023, (volNum * 2) % 12, 15).toISOString(),
          coverImage: anilistMedia.coverImage.extraLarge || anilistMedia.coverImage.large,
          customCoverUrl: null,
          pricePLN: publisherInfo.avgPrice,
          description: `Oficjalne polskie wydanie tomu ${volNum} bestsellerowej mangi ${title}. Dostępne w polskich księgarniach z polskim tłumaczeniem i dodatkami.`,
          manga: {
            id: String(anilistMedia.id),
            title,
            polishTitle: anilistMedia.title.romaji,
            defaultCover: anilistMedia.coverImage.extraLarge || anilistMedia.coverImage.large,
            customCoverUrl: null,
            description: cleanDescription(anilistMedia.description),
          },
        }
      })

      return NextResponse.json({
        id: String(anilistMedia.id),
        title,
        nativeTitle: anilistMedia.title.native,
        polishTitle: anilistMedia.title.romaji,
        description: cleanDescription(anilistMedia.description),
        defaultCover: anilistMedia.coverImage.extraLarge || anilistMedia.coverImage.large,
        bannerImage: anilistMedia.bannerImage,
        anilistId: anilistMedia.id,
        statusInPoland: 'ONGOING',
        totalVolumesJapan: anilistMedia.volumes || null,
        totalVolumesPoland: volumes.length,
        publisher: {
          id: 'pub-1',
          name: publisherInfo.name,
          website: `https://${publisherInfo.name.toLowerCase().replace(/\s+/g, '')}.pl`,
        },
        volumes,
        _count: { volumes: volumes.length },
      })
    }

    // 3. Not found in DB or AniList
    return NextResponse.json({ error: 'Nie znaleziono mangi' }, { status: 404 })
  } catch (error) {
    console.error('GET /api/manga/[id]:', error)
    return NextResponse.json({ error: 'Błąd serwera' }, { status: 500 })
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  try {
    const body = await request.json()
    const { totalVolumesJapan, totalVolumesPoland, title, polishTitle, statusInPoland, customCoverUrl, defaultCover, volumes } = body

    const session = await auth()
    const numericAnilist = /^\d+$/.test(id) ? parseInt(id, 10) : null
    let resolvedAnilistId = numericAnilist
    if (!resolvedAnilistId) {
      const norm = normalizeTitleKey(title || polishTitle || '')
      if (norm === 'seihantai-na-kimi-to-boku') resolvedAnilistId = 144426
      else if (norm === 'solo-leveling') resolvedAnilistId = 105398
      else if (norm === 'chainsaw-man') resolvedAnilistId = 105778
      else if (norm === 'jujutsu-kaisen') resolvedAnilistId = 101517
      else {
        // Automatically query AniList for any unknown title
        try {
          const queryTitle = title || polishTitle || ''
          if (queryTitle.length >= 3) {
            const searchRes = await searchManga(queryTitle, 1, 1)
            const topMatch = searchRes?.data?.Page?.media?.[0]
            if (topMatch?.id) {
              resolvedAnilistId = topMatch.id
            }
          }
        } catch {}
      }
    }

    let existing = await prisma.manga.findFirst({
      where: {
        OR: [
          { id },
          ...(resolvedAnilistId ? [{ anilistId: resolvedAnilistId }] : []),
          ...(title ? [{ title: { equals: title, mode: 'insensitive' as const } }] : []),
          ...(polishTitle ? [{ polishTitle: { equals: polishTitle, mode: 'insensitive' as const } }] : []),
        ],
      },
    })

    if (!resolvedAnilistId && existing?.anilistId) {
      resolvedAnilistId = existing.anilistId
    } else if (!resolvedAnilistId && existing?.title) {
      try {
        const searchRes = await searchManga(existing.title, 1, 1)
        const topMatch = searchRes?.data?.Page?.media?.[0]
        if (topMatch?.id) {
          resolvedAnilistId = topMatch.id
        }
      } catch {}
    }

    const vol1FromInput = Array.isArray(volumes) ? volumes.find((v: any) => v.volumeNumber === 1) : null
    const effectiveSeriesCover = customCoverUrl || vol1FromInput?.customCoverUrl || vol1FromInput?.coverUrl || null

    if (existing) {
      const updated = await prisma.manga.update({
        where: { id: existing.id },
        data: {
          ...(title ? { title } : {}),
          ...(polishTitle !== undefined ? { polishTitle: polishTitle || null } : {}),
          ...(statusInPoland ? { statusInPoland } : {}),
          ...(effectiveSeriesCover ? { customCoverUrl: effectiveSeriesCover } : (customCoverUrl !== undefined ? { customCoverUrl: null } : {})),
          ...(defaultCover !== undefined ? { defaultCover: defaultCover || null } : {}),
          ...(totalVolumesJapan !== undefined ? { totalVolumesJapan } : {}),
          ...(totalVolumesPoland !== undefined ? { totalVolumesPoland } : {}),
          ...(resolvedAnilistId && !existing.anilistId ? { anilistId: resolvedAnilistId } : {}),
        },
      })

      // Also sync polishTitle, customCoverUrl, and total volumes to any matching duplicate manga records in DB
      if (title || polishTitle) {
        await prisma.manga.updateMany({
          where: {
            id: { not: existing.id },
            OR: [
              ...(title ? [{ title: { equals: title, mode: 'insensitive' as const } }] : []),
              ...(polishTitle ? [{ polishTitle: { equals: polishTitle, mode: 'insensitive' as const } }] : []),
            ],
          },
          data: {
            ...(polishTitle !== undefined ? { polishTitle: polishTitle || null } : {}),
            ...(customCoverUrl !== undefined ? { customCoverUrl: customCoverUrl || null } : {}),
            ...(totalVolumesPoland !== undefined ? { totalVolumesPoland } : {}),
            ...(totalVolumesJapan !== undefined ? { totalVolumesJapan } : {}),
            ...(statusInPoland ? { statusInPoland } : {}),
          },
        }).catch(() => {})
      }

      // If volumes are provided, upsert them
      if (Array.isArray(volumes)) {
        for (const v of volumes) {
          if (!v.volumeNumber) continue
          const effectiveVolCover = v.customCoverUrl !== undefined
            ? v.customCoverUrl
            : (v.volumeNumber === 1 && customCoverUrl ? customCoverUrl : undefined)

          await prisma.volume.upsert({
            where: {
              mangaId_volumeNumber: {
                mangaId: existing.id,
                volumeNumber: v.volumeNumber,
              },
            },
            update: {
              coverImage: v.coverUrl || undefined,
              customCoverUrl: effectiveVolCover,
              pricePLN: v.pricePLN ?? undefined,
            },
            create: {
              mangaId: existing.id,
              volumeNumber: v.volumeNumber,
              coverImage: v.coverUrl || customCoverUrl || existing.defaultCover,
              customCoverUrl: effectiveVolCover || null,
              pricePLN: v.pricePLN ?? 34.99,
            },
          })
        }
      }

      // Purge any excess volumes in DB when total volume count is explicitly reduced
      if (totalVolumesPoland && totalVolumesPoland > 0) {
        const maxVolLimit = Math.max(totalVolumesPoland, totalVolumesJapan || 0)
        await prisma.volume.deleteMany({
          where: {
            mangaId: existing.id,
            volumeNumber: { gt: maxVolLimit },
          },
        }).catch(() => {})
      }

      // Log admin activity in dashboard
      const displayTitle = polishTitle || title || existing.polishTitle || existing.title
      const actUserId = session?.user?.id || (await prisma.user.findFirst({ where: { role: 'ADMIN' }, select: { id: true } }))?.id
      if (actUserId) {
        await prisma.activity.create({
          data: {
            type: 'STATUS_CHANGED',
            userId: actUserId,
            mangaId: existing.id,
            content: `zaktualizował serię w panelu: ${displayTitle}`,
          },
        }).catch(() => {})
      }

      return NextResponse.json({ success: true, manga: updated })
    }

    // If manga does not exist yet in DB, create it!
    const created = await prisma.manga.create({
      data: {
        title: title || 'Manga ' + id,
        polishTitle: polishTitle || null,
        anilistId: resolvedAnilistId || numericAnilist,
        defaultCover: defaultCover || null,
        customCoverUrl: customCoverUrl || null,
        totalVolumesJapan: totalVolumesJapan || null,
        totalVolumesPoland: totalVolumesPoland || null,
        statusInPoland: statusInPoland || 'UNKNOWN',
      },
    })

    if (Array.isArray(volumes)) {
      for (const v of volumes) {
        if (!v.volumeNumber) continue
        await prisma.volume.create({
          data: {
            mangaId: created.id,
            volumeNumber: v.volumeNumber,
            coverImage: v.coverUrl || created.defaultCover,
            customCoverUrl: v.customCoverUrl || null,
            pricePLN: v.pricePLN ?? 34.99,
          },
        })
      }
    }

    // Log admin activity for newly created series
    const actUserId = session?.user?.id || (await prisma.user.findFirst({ where: { role: 'ADMIN' }, select: { id: true } }))?.id
    if (actUserId) {
      await prisma.activity.create({
        data: {
          type: 'ADDED_TO_COLLECTION',
          userId: actUserId,
          mangaId: created.id,
          content: `dodał nową serię w panelu: ${polishTitle || title || created.title}`,
        },
      }).catch(() => {})
    }

    return NextResponse.json({ success: true, manga: created })
  } catch (err) {
    console.error('PATCH /api/manga/[id] error:', err)
    return NextResponse.json({ error: 'Błąd podczas aktualizacji mangi w bazie' }, { status: 500 })
  }
}

