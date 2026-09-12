import { NextRequest, NextResponse } from 'next/server'
import { scrapeYatta } from '@/lib/yatta-scraper'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { url } = body

    if (!url || typeof url !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Wymagany jest poprawny adres URL ze sklepu Yatta.pl' },
        { status: 400 }
      )
    }

    const result = await scrapeYatta(url)

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: result.error || 'Nie udało się zaciągnąć okładek z podanego adresu Yatta.pl',
        },
        { status: 404 }
      )
    }

    return NextResponse.json(result)
  } catch (error) {
    console.error('POST /api/admin/yatta error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Błąd serwera podczas scrapowania Yatta.pl',
      },
      { status: 500 }
    )
  }
}
