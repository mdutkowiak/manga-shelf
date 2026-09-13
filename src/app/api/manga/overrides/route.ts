import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { normalizeTitleKey } from '@/lib/title-utils'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const mangas = await prisma.manga.findMany({
      include: {
        publisher: true,
        volumes: {
          select: {
            volumeNumber: true,
            coverImage: true,
            customCoverUrl: true,
            pricePLN: true,
            polishReleaseDate: true,
          },
          orderBy: { volumeNumber: 'asc' },
        },
      },
      orderBy: { title: 'asc' },
    })

    const overrides: Record<string, any> = {}
    const items: any[] = []

    for (const m of mangas) {
      const volOverrides = m.volumes.map((v) => ({
        volumeNumber: v.volumeNumber,
        customCoverUrl: v.customCoverUrl || v.coverImage || null,
        pricePLN: v.pricePLN || 34.99,
        releaseDate: v.polishReleaseDate ? v.polishReleaseDate.toISOString() : undefined,
      }))

      const vol1 = m.volumes.find((v) => v.volumeNumber === 1)
      const vol1Cover = vol1?.customCoverUrl || vol1?.coverImage
      const effectiveCover = m.customCoverUrl || vol1?.customCoverUrl || vol1Cover || m.defaultCover || null

      const entry = {
        id: m.id,
        mangaId: m.anilistId ? String(m.anilistId) : m.id,
        title: m.title,
        polishTitle: m.polishTitle || undefined,
        publisher: m.publisher?.name || undefined,
        statusInPoland: (m.statusInPoland === 'FINISHED' ? 'FINISHED' : 'ONGOING') as 'ONGOING' | 'FINISHED' | 'CANCELLED' | 'HIATUS',
        totalVolumes: m.totalVolumesPoland || m.volumes.length || 1,
        totalVolumesJapan: m.totalVolumesJapan,
        customCoverUrl: m.customCoverUrl || vol1?.customCoverUrl || null,
        coverUrl: effectiveCover,
        defaultCover: m.defaultCover || effectiveCover,
        volumes: volOverrides,
      }

      items.push(entry)

      // Index by database CUID
      overrides[m.id] = entry

      // Index by AniList numeric ID if present
      if (m.anilistId) {
        overrides[String(m.anilistId)] = entry
      }

      // Index by normalized title
      const normTitle = normalizeTitleKey(m.title)
      if (normTitle) {
        overrides[normTitle] = entry
      }

      // Index by normalized Polish title if present
      if (m.polishTitle) {
        const normPolish = normalizeTitleKey(m.polishTitle)
        if (normPolish) {
          overrides[normPolish] = entry
        }
      }
    }

    return NextResponse.json({
      success: true,
      count: mangas.length,
      overrides,
      items,
    })
  } catch (error) {
    console.error('[API_MANGA_OVERRIDES_ERROR]', error)
    return NextResponse.json({ success: false, overrides: {} }, { status: 500 })
  }
}
