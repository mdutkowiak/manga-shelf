import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireUser } from '@/lib/api-auth'

// GET /api/users/me - Pobierz profil zalogowanego użytkownika
export async function GET() {
  const guard = await requireUser()
  if (guard.error) return guard.error
  const userId = guard.session.user.id

  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        username: true,
        name: true,
        bio: true,
        avatar: true,
        image: true,
        email: true,
        role: true,
        pinnedBadges: true,
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

    return NextResponse.json({
      user: {
        ...user,
        avatar: user.avatar || user.image || null,
        pinnedBadges: user.pinnedBadges || [],
      },
    })
  } catch (error) {
    console.error('GET /api/users/me:', error)
    return NextResponse.json({ error: 'Błąd serwera' }, { status: 500 })
  }
}

// PATCH /api/users/me - Zaktualizuj profil zalogowanego użytkownika
export async function PATCH(request: NextRequest) {
  try {
    const guard = await requireUser()
    if (guard.error) return guard.error
    const userId = guard.session.user.id

    const body = await request.json()
    const { name, bio, avatar, pinnedBadges } = body

    const updateData: Record<string, unknown> = {}
    if (name !== undefined) {
      if (typeof name !== 'string' || name.length > 60) {
        return NextResponse.json({ error: 'Nieprawidłowa nazwa' }, { status: 400 })
      }
      updateData.name = name
    }
    if (bio !== undefined) {
      if (typeof bio !== 'string' || bio.length > 500) {
        return NextResponse.json({ error: 'Opis może mieć maksymalnie 500 znaków' }, { status: 400 })
      }
      updateData.bio = bio
    }
    if (avatar !== undefined) {
      const validAvatar =
        avatar === null ||
        (typeof avatar === 'string' &&
          avatar.length <= 700_000 &&
          /^(https?:[/][/]|[/](?![/])|data:image[/](png|jpe?g|webp);base64,)/i.test(avatar))
      if (!validAvatar) {
        return NextResponse.json({ error: 'Nieprawidłowy awatar' }, { status: 400 })
      }
      updateData.avatar = avatar
      updateData.image = avatar
    }
    if (pinnedBadges !== undefined && Array.isArray(pinnedBadges)) {
      updateData.pinnedBadges = pinnedBadges.filter((b) => typeof b === 'string').slice(0, 4)
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: {
        id: true,
        username: true,
        name: true,
        bio: true,
        avatar: true,
        email: true,
        role: true,
        pinnedBadges: true,
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
