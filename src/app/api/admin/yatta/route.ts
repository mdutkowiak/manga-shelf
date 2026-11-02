import { NextRequest, NextResponse } from 'next/server'
import { scrapePublisherStore } from '@/lib/scrapers'
import { requireUser } from '@/lib/api-auth'

export async function POST(request: NextRequest) {
  const guard = await requireUser()
  if (guard.error) return guard.error

  try {
    const body = await request.json()
    const { url } = body

    if (!url || typeof url !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Wymagany jest poprawny adres URL ze sklepu wydawcy' },
        { status: 400 }
      )
    }

    const result = await scrapePublisherStore(url)

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: result.error || 'Nie udało się zaciągnąć okładek z podanego adresu',
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
        error: error instanceof Error ? error.message : 'Błąd serwera podczas scrapowania sklepu wydawcy',
      },
      { status: 500 }
    )
  }
}
