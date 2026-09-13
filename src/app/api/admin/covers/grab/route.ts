import { NextRequest, NextResponse } from 'next/server'
import { scrapePublisherStore, getSupportedStores, detectPublisherStore } from '@/lib/scrapers'

export async function GET() {
  const stores = getSupportedStores()
  return NextResponse.json({ success: true, stores })
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { url } = body

    if (!url || typeof url !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Wymagany jest poprawny adres URL ze sklepu wydawcy' },
        { status: 400 }
      )
    }

    const detected = detectPublisherStore(url)
    const result = await scrapePublisherStore(url)

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          detectedStore: detected?.name || null,
          error: result.error || 'Nie udało się zaciągnąć okładek z podanego adresu',
        },
        { status: 404 }
      )
    }

    return NextResponse.json({
      ...result,
      detectedStore: detected?.name || result.storeName,
    })
  } catch (error) {
    console.error('POST /api/admin/covers/grab error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Błąd serwera podczas scrapowania sklepu wydawcy',
      },
      { status: 500 }
    )
  }
}
