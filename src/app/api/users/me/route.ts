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

// PATCH /api/users/me - Zaktualizuj profil zalogowanego użytkownika
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()
    const { userId, name, bio, avatar } = body

    if (!userId) {
      return NextResponse.json({ error: 'Brak identyfikatora użytkownika' }, { status: 400 })
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        name: name !== undefined ? name : undefined,
        bio: bio !== undefined ? bio : undefined,
        avatar: avatar !== undefined ? avatar : undefined,
        image: avatar !== undefined ? avatar : undefined,
      },
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
      },
    })

    return NextResponse.json({ success: true, user: updatedUser })
  } catch (error) {
    console.error('PATCH /api/users/me error:', error)
    return NextResponse.json({ error: 'Błąd podczas aktualizacji profilu' }, { status: 500 })
  }
}
