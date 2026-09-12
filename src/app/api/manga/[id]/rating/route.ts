import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

async function ensureTableExists() {
  try {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS manga_ratings (
        id TEXT PRIMARY KEY DEFAULT concat('mr_', md5(random()::text || clock_timestamp()::text)),
        rating INTEGER NOT NULL,
        "userId" TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        "mangaId" TEXT NOT NULL REFERENCES mangas(id) ON DELETE CASCADE,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT manga_ratings_userId_mangaId_key UNIQUE ("userId", "mangaId")
      );
    `)
  } catch (err) {
    console.warn('ensureTableExists manga_ratings warning:', err)
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  try {
    const session = await auth()
    const numericAnilist = /^\d+$/.test(id) ? parseInt(id, 10) : null

    let manga = await prisma.manga.findFirst({
      where: {
        OR: [
          { id },
          ...(numericAnilist ? [{ anilistId: numericAnilist }] : []),
        ],
      },
    })

    if (!manga) {
      return NextResponse.json({
        averageRating: null,
        ratingCount: 0,
        userRating: null,
      })
    }

    try {
      const stats = await prisma.mangaRating.aggregate({
        where: { mangaId: manga.id },
        _avg: { rating: true },
        _count: { rating: true },
      })

      let userRating: number | null = null
      if (session?.user?.id) {
        const ur = await prisma.mangaRating.findUnique({
          where: {
            userId_mangaId: {
              userId: session.user.id,
              mangaId: manga.id,
            },
          },
        })
        userRating = ur?.rating ?? null
      }

      return NextResponse.json({
        averageRating: stats._avg.rating ?? null,
        ratingCount: stats._count.rating ?? 0,
        userRating,
      })
    } catch (dbErr) {
      await ensureTableExists()
      return NextResponse.json({
        averageRating: null,
        ratingCount: 0,
        userRating: null,
      })
    }
  } catch (error) {
    console.error('GET /api/manga/[id]/rating error:', error)
    return NextResponse.json({ error: 'Błąd pobierania oceny' }, { status: 500 })
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Wymagane logowanie' }, { status: 401 })
    }

    const userId = session.user.id
    const body = await request.json()
    const { rating, seriesTitle, coverUrl } = body

    if (rating !== null && rating !== undefined) {
      const numRating = Number(rating)
      if (isNaN(numRating) || numRating < 1 || numRating > 10) {
        return NextResponse.json({ error: 'Ocena musi być liczbą całkowitą od 1 do 10' }, { status: 400 })
      }
    }

    await ensureTableExists()

    // Find or create manga
    const numericAnilist = /^\d+$/.test(id) ? parseInt(id, 10) : null
    let manga = await prisma.manga.findFirst({
      where: {
        OR: [
          { id },
          ...(numericAnilist ? [{ anilistId: numericAnilist }] : []),
          ...(seriesTitle ? [{ title: seriesTitle }, { polishTitle: seriesTitle }] : []),
        ],
      },
    })

    if (!manga) {
      manga = await prisma.manga.create({
        data: {
          title: seriesTitle || `Manga ${id}`,
          anilistId: numericAnilist,
          defaultCover: coverUrl || null,
        },
      })
    }

    if (rating === null || rating === undefined) {
      // Remove rating
      await prisma.mangaRating.deleteMany({
        where: {
          userId,
          mangaId: manga.id,
        },
      })
    } else {
      const roundedRating = Math.round(Number(rating))
      await prisma.mangaRating.upsert({
        where: {
          userId_mangaId: {
            userId,
            mangaId: manga.id,
          },
        },
        update: {
          rating: roundedRating,
        },
        create: {
          userId,
          mangaId: manga.id,
          rating: roundedRating,
        },
      })

      // Rejestruj aktywność w panelu
      const displayTitle = manga.polishTitle || manga.title
      await prisma.activity.create({
        data: {
          type: 'RATED',
          userId,
          mangaId: manga.id,
          content: `ocenił serię ${displayTitle} na ${roundedRating}/10 ⭐`,
        },
      }).catch(() => {})
    }

    // Recalculate average and count strictly for users who rated
    const stats = await prisma.mangaRating.aggregate({
      where: { mangaId: manga.id },
      _avg: { rating: true },
      _count: { rating: true },
    })

    return NextResponse.json({
      success: true,
      averageRating: stats._avg.rating ?? null,
      ratingCount: stats._count.rating ?? 0,
      userRating: rating ? Math.round(Number(rating)) : null,
    })
  } catch (error) {
    console.error('POST /api/manga/[id]/rating error:', error)
    return NextResponse.json({ error: 'Błąd zapisu oceny' }, { status: 500 })
  }
}
