import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET /api/users/me - Pobierz profil zalogowanego użytkownika
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const userId = searchParams.get('userId')

  if (!userId) {
    return NextResponse.json({ error: 'Brak userId' }, { status: 400 })
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        username: true,
        name: true,
        bio: true,
        avatar: true,
        email: true,
        role: true,
        friendPrivacy: true,
        createdAt: true,
        _count: {
          select: { collections: true },
        },
      },
    })

    if (!user) {
      return NextResponse.json({ error: 'Nie znaleziono' }, { status: 404 })
    }

    return NextResponse.json({ user })
  } catch (error) {
    console.error('GET /api/users/me:', error)
    return NextResponse.json({ error: 'Błąd serwera' }, { status: 500 })
  }
}
