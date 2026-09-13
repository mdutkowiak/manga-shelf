import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'

export interface PolishRelease {
  id: string
  mangaId: string
  day: string
  date: string
  month: string
  year: number
  publisher: string
  title: string
  volumeNumber: number
  pricePLN: number
  coverUrl: string
  bannerUrl?: string | null
  status: string
  logoBg: string
  logoText: string
  description?: string | null
  shopUrl?: string | null
  shopLinks?: { name: string; url: string; price?: number; logo?: string }[]
}

const monthsList = [
  'Styczeń', 'Luty', 'Marzec', 'Kwiecień', 'Maj', 'Czerwiec',
  'Lipiec', 'Sierpień', 'Wrzesień', 'Październik', 'Listopad', 'Grudzień'
]

// Harmonogram bazowy - wyczyszczony pod ręczne wprowadzanie premier przez administratora
export function getAllReleases(): PolishRelease[] {
  return []
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const month = searchParams.get('month') || monthsList[new Date().getMonth()]
  const year = parseInt(searchParams.get('year') || String(new Date().getFullYear()), 10)

  let dbReleases: PolishRelease[] = []
  try {
    const volumes = await prisma.volume.findMany({
      where: {
        polishReleaseDate: { not: null },
      },
      include: {
        manga: {
          include: {
            publisher: true,
          },
        },
      },
      orderBy: {
        polishReleaseDate: 'asc',
      },
    })

    dbReleases = volumes.map((vol) => {
      const date = vol.polishReleaseDate ? new Date(vol.polishReleaseDate) : new Date()
      const mIdx = date.getMonth()
      const mName = monthsList[mIdx]
      const y = date.getFullYear()
      const pubName = vol.manga?.publisher?.name || 'Wydawnictwo'
      const mangaTitle = vol.manga?.polishTitle || vol.manga?.title || 'Manga'
      const title = `${pubName}: "${mangaTitle} ${vol.volumeNumber}"`

      return {
        id: `db-${vol.id}`,
        mangaId: vol.mangaId,
        day: `${date.getDate()} ${mName.slice(0, 3)}`,
        date: date.toISOString().slice(0, 10),
        month: mName,
        year: y,
        publisher: pubName,
        title,
        volumeNumber: vol.volumeNumber,
        pricePLN: vol.pricePLN || 34.99,
        coverUrl: vol.customCoverUrl || vol.coverImage || vol.manga?.customCoverUrl || vol.manga?.defaultCover || '',
        bannerUrl: null,
        status: 'PREORDER',
        logoBg: 'bg-primary',
        logoText: pubName.slice(0, 2).toUpperCase(),
        description: vol.description || null,
      }
    })
  } catch (err) {
    console.error('Błąd podczas pobierania premier z bazy:', err)
  }

  const allReleases = dbReleases
  const matchingReleases = allReleases.filter(
    (rel) => rel.month.toLowerCase() === month.toLowerCase() && rel.year === year
  )

  return NextResponse.json({
    success: true,
    month,
    year,
    count: matchingReleases.length,
    releases: matchingReleases,
    allCount: allReleases.length,
    allReleases,
  })
}

// POST endpoint do ręcznego dodawania premier przez administratora
export async function POST(request: Request) {
  try {
    const session = await auth()
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Brak uprawnień administratora' }, { status: 403 })
    }

    const body = await request.json()
    const { seriesTitle, volumeNumber, releaseDate, publisher, pricePLN, coverUrl, description } = body

    if (!seriesTitle || !volumeNumber || !releaseDate) {
      return NextResponse.json({ error: 'Brak wymaganych pól (tytuł, tom, data)' }, { status: 400 })
    }

    // 1. Znajdź lub utwórz wydawcę
    let publisherRecord = null
    if (publisher) {
      publisherRecord = await prisma.publisher.upsert({
        where: { name: publisher },
        update: {},
        create: { name: publisher },
      })
    }

    // 2. Znajdź lub utwórz mangę
    let manga = await prisma.manga.findFirst({
      where: {
        title: { equals: seriesTitle, mode: 'insensitive' },
      },
    })

    if (!manga) {
      manga = await prisma.manga.create({
        data: {
          title: seriesTitle,
          publisherId: publisherRecord?.id,
          defaultCover: coverUrl || null,
          customCoverUrl: coverUrl || null,
        },
      })
    }

    // 3. Utwórz lub zaktualizuj tom
    const volNum = parseInt(String(volumeNumber), 10)
    const relDate = new Date(releaseDate)

    const volume = await prisma.volume.upsert({
      where: {
        mangaId_volumeNumber: {
          mangaId: manga.id,
          volumeNumber: volNum,
        },
      },
      update: {
        polishReleaseDate: relDate,
        pricePLN: pricePLN ? parseFloat(String(pricePLN)) : null,
        coverImage: coverUrl || undefined,
        customCoverUrl: coverUrl || undefined,
        description: description || undefined,
      },
      create: {
        mangaId: manga.id,
        volumeNumber: volNum,
        polishReleaseDate: relDate,
        pricePLN: pricePLN ? parseFloat(String(pricePLN)) : null,
        coverImage: coverUrl || null,
        customCoverUrl: coverUrl || null,
        description: description || null,
      },
    })

    return NextResponse.json({
      success: true,
      volumeId: volume.id,
      mangaId: manga.id,
      message: 'Premiera została pomyślnie dodana do bazy danych',
    })
  } catch (error) {
    console.error('Błąd podczas zapisywania premiery:', error)
    return NextResponse.json({ error: 'Wystąpił błąd podczas zapisywania premiery' }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  try {
    const session = await auth()
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Brak uprawnień administratora' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    let id = searchParams.get('id')

    if (!id) {
      try {
        const body = await request.json()
        id = body.id
      } catch {
        // No body
      }
    }

    if (!id) {
      return NextResponse.json({ error: 'Brak ID premiery do usunięcia' }, { status: 400 })
    }

    if (id.startsWith('db-')) {
      const volumeId = id.replace(/^db-/, '')
      await prisma.volume.update({
        where: { id: volumeId },
        data: { polishReleaseDate: null },
      }).catch((err) => {
        console.warn('Volume not found or could not update polishReleaseDate:', err)
      })
    }

    return NextResponse.json({
      success: true,
      id,
      message: 'Premiera została pomyślnie usunięta z kalendarza',
    })
  } catch (error) {
    console.error('Błąd podczas usuwania premiery:', error)
    return NextResponse.json({ error: 'Błąd podczas usuwania premiery' }, { status: 500 })
  }
}
