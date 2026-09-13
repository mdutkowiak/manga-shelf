import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// Known Polish manga bookstores with verified working CDN logos
const DEFAULT_SHOPS = [
  { name: 'Yatta.pl', url: 'https://yatta.pl', country: 'PL', logo: 'https://cache.yatta-static.pl/yatta_favicon.jpg' },
  { name: 'Sklep Waneko', url: 'https://sklepwaneko.pl', country: 'PL', logo: 'https://sklepwaneko.pl/img/logo-1732709891.jpg' },
  { name: 'Gildia.pl', url: 'https://www.gildia.pl/manga', country: 'PL', logo: 'https://www.gildia.pl/favicon.ico' },
  { name: 'Empik.com', url: 'https://www.empik.com/ksiazki/komiksy/manga', country: 'PL', logo: 'https://www.empik.com/favicon.ico' },
  { name: 'Mangarden.pl', url: 'https://mangarden.pl', country: 'PL', logo: 'https://mangarden.pl/favicon.ico' },
  { name: 'Sklep Dango', url: 'https://sklep-dango.pl', country: 'PL', logo: 'https://sklep-dango.pl/images/logos/1/dango_logo.png' },
]

// GET /api/shops - Pobierz listę sklepów
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const country = searchParams.get('country')

  try {
    const count = await prisma.shop.count()
    if (count === 0) {
      for (const sh of DEFAULT_SHOPS) {
        await prisma.shop.create({
          data: {
            name: sh.name,
            url: sh.url,
            country: sh.country,
            logo: sh.logo,
            isActive: true,
          },
        }).catch(() => {})
      }
    } else {
      // Auto-migrate any existing outdated/broken logos in the database
      await prisma.shop.updateMany({
        where: {
          OR: [
            { logo: 'https://yatta.pl/favicon.ico' },
            { logo: null, name: 'Yatta.pl' },
          ],
        },
        data: { logo: 'https://cache.yatta-static.pl/yatta_favicon.jpg' },
      }).catch(() => {})

      await prisma.shop.updateMany({
        where: {
          OR: [
            { logo: 'https://sklep.waneko.pl/favicon.ico' },
            { logo: 'https://sklepwaneko.pl/favicon.ico' },
            { logo: null, name: 'Sklep Waneko' },
          ],
        },
        data: { logo: 'https://sklepwaneko.pl/img/logo-1732709891.jpg' },
      }).catch(() => {})
    }

    const where = country ? { country, isActive: true } : { isActive: true }

    const shops = await prisma.shop.findMany({
      where,
      orderBy: { name: 'asc' },
    })

    return NextResponse.json({ shops })
  } catch (error) {
    console.error('GET /api/shops:', error)
    return NextResponse.json({ error: 'Błąd serwera' }, { status: 500 })
  }
}

// POST /api/shops - Dodaj nowy sklep (admin)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, url, country = 'PL', logo } = body

    if (!name || !url) {
      return NextResponse.json({ error: 'Brak wymaganych pól (nazwa, url)' }, { status: 400 })
    }

    const shop = await prisma.shop.create({
      data: {
        name: name.trim(),
        url: url.trim(),
        country: country.trim(),
        logo: logo?.trim() || null,
        isActive: true,
      },
    })

    return NextResponse.json({ success: true, shop })
  } catch (error) {
    console.error('POST /api/shops:', error)
    return NextResponse.json({ error: 'Błąd serwera' }, { status: 500 })
  }
}

// PATCH /api/shops - Aktualizuj sklep (admin)
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, name, url, country, logo, isActive } = body

    if (!id) {
      return NextResponse.json({ error: 'Brak ID sklepu' }, { status: 400 })
    }

    const shop = await prisma.shop.update({
      where: { id },
      data: {
        ...(name !== undefined ? { name: name.trim() } : {}),
        ...(url !== undefined ? { url: url.trim() } : {}),
        ...(country !== undefined ? { country: country.trim() } : {}),
        ...(logo !== undefined ? { logo: logo ? logo.trim() : null } : {}),
        ...(isActive !== undefined ? { isActive: Boolean(isActive) } : {}),
      },
    })

    return NextResponse.json({ success: true, shop })
  } catch (error) {
    console.error('PATCH /api/shops:', error)
    return NextResponse.json({ error: 'Błąd serwera' }, { status: 500 })
  }
}

// DELETE /api/shops - Usuń sklep (admin)
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'Brak ID sklepu' }, { status: 400 })
    }

    await prisma.shop.delete({
      where: { id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('DELETE /api/shops:', error)
    return NextResponse.json({ error: 'Błąd serwera' }, { status: 500 })
  }
}
