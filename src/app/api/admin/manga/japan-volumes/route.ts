import { NextRequest, NextResponse } from 'next/server'
import { fetchJapanVolumes } from '@/lib/volume-lookup'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { title, polishTitle, anilistId } = body

    if (!title && !polishTitle && !anilistId) {
      return NextResponse.json(
        { error: 'Brak tytułu lub ID AniList do wyszukania' },
        { status: 400 }
      )
    }

    const result = await fetchJapanVolumes(title || polishTitle, anilistId, polishTitle)

    return NextResponse.json({
      success: true,
      volumes: result.volumes,
      source: result.source,
      status: result.status,
    })
  } catch (error) {
    console.error('Japan volumes lookup error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Błąd podczas wyszukiwania tomów' },
      { status: 500 }
    )
  }
}
