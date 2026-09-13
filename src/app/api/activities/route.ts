import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const userId = searchParams.get('userId')
  const friendIds = searchParams.get('friendIds')
  const limit = parseInt(searchParams.get('limit') || '20')
  const offset = parseInt(searchParams.get('offset') || '0')

  // Pobierz aktywność użytkownika lub znajomych
  let userIds: string[] = []

  if (userId) {
    userIds = [userId]
  } else if (friendIds) {
    userIds = friendIds.split(',').filter(Boolean)
  }

  if (userIds.length === 0) {
    // Zwróć ostatnie aktywności (publiczne)
    const activities = await prisma.activity.findMany({
      take: limit,
      skip: offset,
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: { id: true, name: true, username: true, avatar: true },
        },
        volume: {
          select: { id: true, volumeNumber: true, coverImage: true },
        },
        manga: {
          select: { id: true, title: true, polishTitle: true, defaultCover: true, customCoverUrl: true },
        },
      },
    })

    return NextResponse.json({ activities })
  }

  const activities = await prisma.activity.findMany({
    where: { userId: { in: userIds } },
    take: limit,
    skip: offset,
    orderBy: { createdAt: 'desc' },
    include: {
      user: {
        select: { id: true, name: true, username: true, avatar: true },
      },
      volume: {
        select: { id: true, volumeNumber: true, coverImage: true },
      },
      manga: {
        select: { id: true, title: true, polishTitle: true, defaultCover: true, customCoverUrl: true },
      },
    },
  })

  return NextResponse.json({ activities })
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { type, userId, volumeId, mangaId, content, metadata } = body

    if (!type || !userId) {
      return NextResponse.json({ error: 'type and userId required' }, { status: 400 })
    }

    const activity = await prisma.activity.create({
      data: {
        type,
        userId,
        volumeId: volumeId || null,
        mangaId: mangaId || null,
        content: content || null,
        metadata: metadata || null,
      },
      include: {
        user: {
          select: { id: true, name: true, username: true, avatar: true },
        },
        volume: {
          select: { id: true, volumeNumber: true, coverImage: true },
        },
        manga: {
          select: { id: true, title: true, defaultCover: true },
        },
      },
    })

    return NextResponse.json(activity)
  } catch {
    return NextResponse.json({ error: 'Failed to create activity' }, { status: 500 })
  }
}
