import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireUser } from '@/lib/api-auth'
import { requireFeature } from '@/lib/site-settings'

export async function GET(request: NextRequest) {
  const disabled = await requireFeature('community')
  if (disabled) return disabled

  const guard = await requireUser()
  if (guard.error) return guard.error

  const { searchParams } = new URL(request.url)
  const query = searchParams.get('q') || ''

  if (!query.trim()) {
    return NextResponse.json({ users: [] })
  }

  try {
    const users = await prisma.user.findMany({
      where: {
        OR: [
          { username: { contains: query, mode: 'insensitive' } },
          { name: { contains: query, mode: 'insensitive' } },
        ],
      },
      select: {
        id: true,
        username: true,
        name: true,
        avatar: true,
        image: true,
        bio: true,
        _count: {
          select: { collections: true },
        },
      },
      take: 20,
      orderBy: { username: 'asc' },
    })

    const mappedUsers = users.map((u) => ({
      id: u.id,
      username: u.username,
      name: u.name,
      avatar: u.avatar || u.image || null,
      bio: u.bio,
      _count: u._count,
    }))

    return NextResponse.json({ users: mappedUsers })
  } catch (error) {
    console.error('GET /api/users/search:', error)
    return NextResponse.json({ error: 'Błąd serwera' }, { status: 500 })
  }
}
