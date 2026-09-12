import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ username: string }> }
) {
  const { username } = await params

  try {
    const user = await prisma.user.findUnique({
      where: { username },
      select: {
        id: true,
        username: true,
        name: true,
        bio: true,
        avatar: true,
        createdAt: true,
        _count: {
          select: { collections: true },
        },
      },
    })

    if (!user) {
      return NextResponse.json({ error: 'Nie znaleziono' }, { status: 404 })
    }

    // Pobierz tomy użytkownika z statusami
    const collections = await prisma.userCollection.findMany({
      where: { userId: user.id },
      include: {
        volume: {
          include: {
            manga: {
              select: {
                title: true,
                defaultCover: true,
                customCoverUrl: true,
              },
            },
          },
        },
      },
    })

    const volumes = collections.map((c) => ({
      id: c.volume.id,
      volumeNumber: c.volume.volumeNumber,
      coverImage: c.volume.coverImage,
      customCoverUrl: c.volume.customCoverUrl,
      manga: c.volume.manga,
      collection: {
        status: c.status,
        userRating: c.userRating,
      },
    }))

    return NextResponse.json({ profile: user, volumes })
  } catch (error) {
    console.error('GET /api/users/[username]:', error)
    return NextResponse.json({ error: 'Błąd serwera' }, { status: 500 })
  }
}
