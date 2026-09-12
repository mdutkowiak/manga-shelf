import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'

export async function GET() {
  try {
    const session = await auth()
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Brak uprawnień administratora' }, { status: 403 })
    }

    const users = await prisma.user.findMany({
      select: {
        id: true,
        username: true,
        name: true,
        email: true,
        role: true,
        avatar: true,
        image: true,
        createdAt: true,
        _count: {
          select: {
            collections: true,
          },
        },
      },
      orderBy: {
        createdAt: 'asc',
      },
    })

    const mappedUsers = users.map((u) => ({
      ...u,
      avatar: u.avatar || u.image || null,
    }))

    return NextResponse.json({ success: true, users: mappedUsers })
  } catch (error) {
    console.error('[ADMIN_USERS_GET]', error)
    return NextResponse.json({ error: 'Błąd podczas pobierania użytkowników' }, { status: 500 })
  }
}

export async function PATCH(request: Request) {
  try {
    const session = await auth()
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Brak uprawnień administratora' }, { status: 403 })
    }

    const body = await request.json()
    const { userId, role } = body

    if (!userId || !role || (role !== 'USER' && role !== 'ADMIN')) {
      return NextResponse.json({ error: 'Nieprawidłowe dane (wymagane userId i role: USER|ADMIN)' }, { status: 400 })
    }

    const targetUser = await prisma.user.findUnique({
      where: { id: userId },
    })

    if (!targetUser) {
      return NextResponse.json({ error: 'Użytkownik nie został znaleziony' }, { status: 404 })
    }

    // Ochrona głównego administratora przed przypadkową utratą praw
    if (targetUser.username.toLowerCase() === 'daqu' && role !== 'ADMIN') {
      return NextResponse.json({ error: 'Nie można odebrać uprawnień głównemu administratorowi (DaQu)' }, { status: 400 })
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { role },
      select: {
        id: true,
        username: true,
        name: true,
        email: true,
        role: true,
      },
    })

    return NextResponse.json({
      success: true,
      user: updatedUser,
      message: `Uprawnienia użytkownika ${updatedUser.username} zostały zmienione na ${role}`,
    })
  } catch (error) {
    console.error('[ADMIN_USERS_PATCH]', error)
    return NextResponse.json({ error: 'Błąd podczas zmiany uprawnień' }, { status: 500 })
  }
}
