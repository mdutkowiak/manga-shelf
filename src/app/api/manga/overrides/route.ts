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
      const normTitle = normalizeTitleKey(m.title)
      const isNotJk = normTitle !== 'jujutsu-kaisen' && !normTitle.startsWith('jujutsu-kaisen--')
      const maxVolLimit = Math.max(m.totalVolumesPoland || 1, m.totalVolumesJapan || 0)

      const volOverrides = m.volumes
        .filter((v) => !m.totalVolumesPoland || v.volumeNumber <= maxVolLimit)
        .map((v) => {
          let custom = v.customCoverUrl || v.coverImage || null
          if (isNotJk && custom && (custom.includes('bx101517') || custom.includes('jujutsu'))) {
            custom = null
          }
          return {
            volumeNumber: v.volumeNumber,
            customCoverUrl: custom,
            pricePLN: v.pricePLN || 34.99,
            releaseDate: v.polishReleaseDate ? v.polishReleaseDate.toISOString() : undefined,
          }
        })

      const vol1 = volOverrides.find((v) => v.volumeNumber === 1)
      let effectiveCover = m.customCoverUrl || vol1?.customCoverUrl || m.defaultCover || null
      if (isNotJk && effectiveCover && (effectiveCover.includes('bx101517') || effectiveCover.includes('jujutsu'))) {
        if (normTitle === 'chainsaw-man') {
          effectiveCover = 'https://s4.anilist.co/file/anilistcdn/media/manga/cover/large/bx105778-9MhW0K0bUf7n.jpg'
        } else if (normTitle === 'solo-leveling') {
          effectiveCover = 'https://s4.anilist.co/file/anilistcdn/media/manga/cover/large/bx105398-b6736294.jpg'
        } else if (normTitle === 'seihantai-na-kimi-to-boku') {
          effectiveCover = 'https://s4.anilist.co/file/anilistcdn/media/manga/cover/large/bx144426-80516.jpg'
        } else {
          effectiveCover = m.defaultCover && !m.defaultCover.includes('bx101517') ? m.defaultCover : null
        }
      }

      const entry = {
        id: m.id,
        mangaId: m.anilistId ? String(m.anilistId) : m.id,
        title: m.title,
        polishTitle: m.polishTitle || undefined,
        publisher: m.publisher?.name || undefined,
        statusInPoland: (m.statusInPoland === 'FINISHED' ? 'FINISHED' : 'ONGOING') as 'ONGOING' | 'FINISHED' | 'CANCELLED' | 'HIATUS',
        totalVolumes: m.totalVolumesPoland || volOverrides.length || 1,
        totalVolumesJapan: m.totalVolumesJapan,
        customCoverUrl: (isNotJk && m.customCoverUrl && m.customCoverUrl.includes('bx101517')) ? null : (m.customCoverUrl || vol1?.customCoverUrl || null),
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
