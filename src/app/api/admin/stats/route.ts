import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'

export async function GET() {
  try {
    const session = await auth()
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Brak uprawnień administratora' }, { status: 403 })
    }

    const [mangaCount, volumeCount, userCount, collections, activities] = await Promise.all([
      prisma.manga.count(),
      prisma.volume.count(),
      prisma.user.count(),
      prisma.userCollection.findMany({
        where: {
          status: { in: ['OWNED', 'READ'] },
        },
        include: {
          volume: {
            select: {
              pricePLN: true,
            },
          },
        },
      }),
      prisma.activity.findMany({
        take: 40,
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
      }),
    ])

    let totalCoverValue = 0
    let totalSpent = 0
    let totalSavings = 0

    for (const c of collections) {
      const coverPrice = c.volume?.pricePLN ?? 34.99
      const purchasePrice = c.purchasePrice ?? coverPrice
      totalCoverValue += coverPrice
      totalSpent += purchasePrice
      if (purchasePrice < coverPrice) {
        totalSavings += (coverPrice - purchasePrice)
      }
    }

    // Deduplicate consecutive identical activities
    const uniqueActivities = []
    const seenRecentKeys = new Set<string>()
    for (const act of activities) {
      const key = `${act.userId}-${act.mangaId || ''}-${act.content}`
      if (!seenRecentKeys.has(key)) {
        uniqueActivities.push(act)
        seenRecentKeys.add(key)
      }
      if (uniqueActivities.length >= 15) break
    }

    return NextResponse.json({
      success: true,
      stats: {
        mangaCount,
        volumeCount,
        userCount,
        ownedVolumesCount: collections.length,
        totalCoverValue: Math.round(totalCoverValue * 100) / 100,
        totalSpent: Math.round(totalSpent * 100) / 100,
        totalSavings: Math.round(totalSavings * 100) / 100,
      },
      activities: uniqueActivities,
    })
  } catch (error) {
    console.error('[ADMIN_STATS_GET]', error)
    return NextResponse.json({ error: 'Błąd pobierania statystyk admina' }, { status: 500 })
  }
}
