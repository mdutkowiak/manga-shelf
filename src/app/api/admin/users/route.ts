import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
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
    const { userId, role, newPassword } = body

    if (!userId) {
      return NextResponse.json({ error: 'Nieprawidłowe dane (brak userId)' }, { status: 400 })
    }

    const targetUser = await prisma.user.findUnique({
      where: { id: userId },
    })

    if (!targetUser) {
      return NextResponse.json({ error: 'Użytkownik nie został znaleziony' }, { status: 404 })
    }

    const updateData: Record<string, any> = {}

    if (role && (role === 'USER' || role === 'ADMIN')) {
      // Ochrona głównego administratora przed przypadkową utratą praw
      if (targetUser.username.toLowerCase() === 'daqu' && role !== 'ADMIN') {
        return NextResponse.json({ error: 'Nie można odebrać uprawnień głównemu administratorowi (DaQu)' }, { status: 400 })
      }
      updateData.role = role
    }

    if (newPassword && typeof newPassword === 'string' && newPassword.length >= 6) {
      updateData.password = await bcrypt.hash(newPassword, 12)
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: 'Brak danych do aktualizacji (rola lub hasło min. 6 znaków)' }, { status: 400 })
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: {
        id: true,
        username: true,
        name: true,
        email: true,
        role: true,
      },
    })

    const messages = []
    if (updateData.role) messages.push(`uprawnienia zmienione na ${updateData.role}`)
    if (updateData.password) messages.push('hasło zostało zaktualizowane')

    return NextResponse.json({
      success: true,
      user: updatedUser,
      message: `Użytkownik ${updatedUser.username}: ${messages.join(', ')}`,
    })
  } catch (error) {
    console.error('[ADMIN_USERS_PATCH]', error)
    return NextResponse.json({ error: 'Błąd podczas edycji użytkownika' }, { status: 500 })
  }
}
