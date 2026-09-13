import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const volumeIdParam = searchParams.get('volumeId')
  const mangaId = searchParams.get('mangaId')
  const volumeNumber = searchParams.get('volumeNumber')

  try {
    let targetVolumeId = volumeIdParam

    if (!targetVolumeId && mangaId && volumeNumber) {
      const volNum = parseInt(volumeNumber, 10)
      if (!isNaN(volNum)) {
        const found = await prisma.volume.findUnique({
          where: {
            mangaId_volumeNumber: {
              mangaId,
              volumeNumber: volNum,
            },
          },
          select: { id: true },
        })
        if (found) targetVolumeId = found.id
      }
    }

    if (!targetVolumeId) {
      return NextResponse.json({ prices: [], history: [] })
    }

    const prices = await prisma.volumePrice.findMany({
      where: { volumeId: targetVolumeId },
      include: {
        shop: {
          select: {
            id: true,
            name: true,
            url: true,
            country: true,
            logo: true,
            isActive: true,
          },
        },
      },
      orderBy: { price: 'asc' },
    })

    const history = await prisma.priceHistory.findMany({
      where: { volumeId: targetVolumeId },
      include: {
        shop: {
          select: { name: true },
        },
      },
      orderBy: { date: 'desc' },
      take: 100,
    })

    return NextResponse.json({
      prices: prices.map((p) => ({
        id: p.id,
        volumeId: p.volumeId,
        shopId: p.shopId,
        price: Number(p.price),
        url: p.url,
        currency: p.currency,
        inStock: p.inStock,
        scrapedAt: p.scrapedAt,
        shop: p.shop,
      })),
      history: history.map((h) => ({
        id: h.id,
        price: Number(h.price),
        currency: h.currency,
        date: h.date.toISOString(),
        shop: h.shop,
      })),
    })
  } catch (error) {
    console.error('GET /api/volume-prices error:', error)
    return NextResponse.json({ error: 'Błąd pobierania cen' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Wymagane logowanie' }, { status: 401 })
    }

    const body = await request.json()
    const { volumeId, mangaId, volumeNumber, shopId, url, price, inStock } = body

    if (!shopId || !url || price === undefined || price === null) {
      return NextResponse.json({ error: 'Brak wymaganych pól (shopId, url, price)' }, { status: 400 })
    }

    const numericPrice = parseFloat(String(price).replace(',', '.'))
    if (isNaN(numericPrice) || numericPrice < 0) {
      return NextResponse.json({ error: 'Nieprawidłowa cena' }, { status: 400 })
    }

    let targetVolumeId = volumeId

    if (!targetVolumeId && mangaId && volumeNumber !== undefined) {
      const volNum = parseInt(String(volumeNumber), 10)
      if (isNaN(volNum)) {
        return NextResponse.json({ error: 'Nieprawidłowy numer tomu' }, { status: 400 })
      }

      // Upsert Volume record in DB so it definitely exists
      const volumeRecord = await prisma.volume.upsert({
        where: {
          mangaId_volumeNumber: {
            mangaId,
            volumeNumber: volNum,
          },
        },
        update: {},
        create: {
          mangaId,
          volumeNumber: volNum,
        },
      })
      targetVolumeId = volumeRecord.id
    }

    if (!targetVolumeId) {
      return NextResponse.json({ error: 'Brak volumeId lub (mangaId, volumeNumber)' }, { status: 400 })
    }

    // Upsert VolumePrice
    const volumePrice = await prisma.volumePrice.upsert({
      where: {
        volumeId_shopId: {
          volumeId: targetVolumeId,
          shopId,
        },
      },
      update: {
        price: numericPrice,
        url: url.trim(),
        inStock: inStock !== undefined ? Boolean(inStock) : true,
        scrapedAt: new Date(),
      },
      create: {
        volumeId: targetVolumeId,
        shopId,
        price: numericPrice,
        url: url.trim(),
        currency: 'PLN',
        inStock: inStock !== undefined ? Boolean(inStock) : true,
      },
      include: {
        shop: true,
      },
    })

    // Log entry in PriceHistory
    await prisma.priceHistory.create({
      data: {
        volumeId: targetVolumeId,
        shopId,
        price: numericPrice,
        currency: 'PLN',
        date: new Date(),
      },
    }).catch(() => {})

    return NextResponse.json({
      success: true,
      volumePrice: {
        id: volumePrice.id,
        volumeId: volumePrice.volumeId,
        shopId: volumePrice.shopId,
        price: Number(volumePrice.price),
        url: volumePrice.url,
        inStock: volumePrice.inStock,
        shop: volumePrice.shop,
      },
    })
  } catch (error) {
    console.error('POST /api/volume-prices error:', error)
    return NextResponse.json({ error: 'Błąd zapisu oferty cenowej' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Wymagane logowanie' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    const volumeId = searchParams.get('volumeId')
    const shopId = searchParams.get('shopId')

    if (id) {
      await prisma.volumePrice.delete({
        where: { id },
      })
      return NextResponse.json({ success: true })
    }

    if (volumeId && shopId) {
      await prisma.volumePrice.delete({
        where: {
          volumeId_shopId: {
            volumeId,
            shopId,
          },
        },
      })
      return NextResponse.json({ success: true })
    }

    return NextResponse.json({ error: 'Wymagane id lub (volumeId i shopId)' }, { status: 400 })
  } catch (error) {
    console.error('DELETE /api/volume-prices error:', error)
    return NextResponse.json({ error: 'Błąd usuwania oferty' }, { status: 500 })
  }
}
