import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const shopId = searchParams.get('shopId')
    const search = searchParams.get('q')?.toLowerCase().trim()

    // 1. Fetch real volume prices from DB
    const volumePrices = await prisma.volumePrice.findMany({
      where: {
        inStock: true,
        shop: {
          isActive: true,
          ...(shopId ? { id: shopId } : {}),
        },
      },
      include: {
        shop: {
          select: {
            id: true,
            name: true,
            url: true,
            logo: true,
          },
        },
        volume: {
          include: {
            manga: {
              include: {
                publisher: {
                  select: { name: true, logo: true },
                },
              },
            },
          },
        },
      },
      orderBy: { price: 'asc' },
    })

    const deals = volumePrices
      .map((vp) => {
        const vol = vp.volume
        const manga = vol?.manga
        if (!vol || !manga) return null

        const coverPrice = vol.pricePLN || 34.99
        const currentPrice = Number(vp.price)
        const discountAmount = Math.max(0, coverPrice - currentPrice)
        const discountPercent = Math.round((discountAmount / coverPrice) * 100)

        // Filter search query if specified
        if (search) {
          const title = (manga.polishTitle || manga.title || '').toLowerCase()
          if (!title.includes(search)) return null
        }

        const coverUrl = vol.customCoverUrl || vol.coverImage || manga.customCoverUrl || manga.defaultCover || ''

        return {
          id: vp.id,
          volumeId: vol.id,
          mangaId: manga.id,
          title: manga.polishTitle || manga.title,
          originalTitle: manga.title,
          volumeNumber: vol.volumeNumber,
          coverUrl,
          publisher: manga.publisher?.name || '',
          shop: vp.shop,
          currentPrice,
          coverPrice,
          discountAmount: Math.round(discountAmount * 100) / 100,
          discountPercent,
          url: vp.url,
          inStock: vp.inStock,
          updatedAt: vp.updatedAt,
        }
      })
      .filter(Boolean)
      .sort((a, b) => (b?.discountPercent || 0) - (a?.discountPercent || 0))

    return NextResponse.json({
      success: true,
      deals,
    })
  } catch (error) {
    console.error('GET /api/deals error:', error)
    return NextResponse.json({ error: 'Błąd pobierania promocji' }, { status: 500 })
  }
}
