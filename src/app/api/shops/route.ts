import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET /api/shops - Pobierz listę sklepów
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const country = searchParams.get('country')

  try {
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
    const { name, url, country, logo } = body

    if (!name || !url || !country) {
      return NextResponse.json({ error: 'Brak wymaganych pól' }, { status: 400 })
    }

    const shop = await prisma.shop.create({
      data: { name, url, country, logo },
    })

    return NextResponse.json({ success: true, shop })
  } catch (error) {
    console.error('POST /api/shops:', error)
    return NextResponse.json({ error: 'Błąd serwera' }, { status: 500 })
  }
}
