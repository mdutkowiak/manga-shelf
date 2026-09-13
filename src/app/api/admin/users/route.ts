import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'

export async function GET(request: Request) {
  try {
    const session = await auth()
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Brak uprawnień administratora' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const q = searchParams.get('q')?.trim()
    const roleFilter = searchParams.get('role')?.trim()
    const statusFilter = searchParams.get('status')?.trim()

    const where: any = {}

    if (q) {
      where.OR = [
        { username: { contains: q, mode: 'insensitive' } },
        { name: { contains: q, mode: 'insensitive' } },
        { email: { contains: q, mode: 'insensitive' } },
      ]
    }

    if (roleFilter && roleFilter !== 'ALL') {
      if (roleFilter === 'USER' || roleFilter === 'ADMIN') {
        where.role = roleFilter
      } else {
        // Custom role ID
        where.customRoleId = roleFilter
      }
    }

    if (statusFilter && statusFilter !== 'ALL') {
      if (statusFilter === 'ACTIVE') where.isActive = true
      if (statusFilter === 'INACTIVE') where.isActive = false
    }

    const users = await prisma.user.findMany({
      where,
      select: {
        id: true,
        username: true,
        name: true,
        email: true,
        bio: true,
        role: true,
        customRoleId: true,
        customRole: {
          select: {
            id: true,
            name: true,
            label: true,
            permissions: true,
          },
        },
        isActive: true,
        avatar: true,
        image: true,
        pinnedBadges: true,
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
      isActive: u.isActive !== false,
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
    const {
      userId,
      role,
      customRoleId,
      newPassword,
      name,
      username,
      email,
      bio,
      isActive,
    } = body

    if (!userId) {
      return NextResponse.json({ error: 'Nieprawidłowe dane (brak userId)' }, { status: 400 })
    }

    const targetUser = await prisma.user.findUnique({
      where: { id: userId },
    })

    if (!targetUser) {
      return NextResponse.json({ error: 'Użytkownik nie został znaleziony' }, { status: 404 })
    }

    const isMainAdmin =
      targetUser.username.toLowerCase() === 'daqu' ||
      targetUser.email.toLowerCase() === '7dudek@gmail.com'

    const updateData: Record<string, any> = {}

    // 1. Role validation
    if (role && (role === 'USER' || role === 'ADMIN')) {
      if (isMainAdmin && role !== 'ADMIN') {
        return NextResponse.json({ error: 'Nie można odebrać uprawnień głównemu administratorowi (DaQu)' }, { status: 400 })
      }
      updateData.role = role
    }

    // 2. Custom Role
    if (customRoleId !== undefined) {
      updateData.customRoleId = customRoleId || null
    }

    // 3. Status (Active / Deactivated)
    if (typeof isActive === 'boolean') {
      if (isMainAdmin && isActive === false) {
        return NextResponse.json({ error: 'Nie można zablokować konta głównego administratora (DaQu)' }, { status: 400 })
      }
      updateData.isActive = isActive
    }

    // 4. Password update
    if (newPassword && typeof newPassword === 'string' && newPassword.length >= 6) {
      updateData.password = await bcrypt.hash(newPassword, 12)
    }

    // 5. Profile fields (name, bio)
    if (name !== undefined) {
      updateData.name = typeof name === 'string' ? name.trim() : null
    }

    if (bio !== undefined) {
      updateData.bio = typeof bio === 'string' ? bio.trim() : null
    }

    // 6. Username / Email modification with unique checks
    if (username && username.trim() !== targetUser.username) {
      if (isMainAdmin) {
        return NextResponse.json({ error: 'Nie można modyfikować nazwy głównego administratora' }, { status: 400 })
      }
      const existingUser = await prisma.user.findFirst({
        where: { username: { equals: username.trim(), mode: 'insensitive' }, id: { not: userId } },
      })
      if (existingUser) {
        return NextResponse.json({ error: 'Podana nazwa użytkownika jest już zajęta' }, { status: 400 })
      }
      updateData.username = username.trim()
    }

    if (email && email.trim() !== targetUser.email) {
      if (isMainAdmin) {
        return NextResponse.json({ error: 'Nie można modyfikować adresu email głównego administratora' }, { status: 400 })
      }
      const existingEmail = await prisma.user.findFirst({
        where: { email: { equals: email.trim(), mode: 'insensitive' }, id: { not: userId } },
      })
      if (existingEmail) {
        return NextResponse.json({ error: 'Podany adres email jest już powiązany z innym kontem' }, { status: 400 })
      }
      updateData.email = email.trim()
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: 'Brak danych do aktualizacji' }, { status: 400 })
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: {
        id: true,
        username: true,
        name: true,
        email: true,
        bio: true,
        role: true,
        customRoleId: true,
        customRole: {
          select: { id: true, name: true, label: true, permissions: true },
        },
        isActive: true,
      },
    })

    return NextResponse.json({
      success: true,
      user: updatedUser,
      message: `Pomyślnie zaktualizowano dane użytkownika ${updatedUser.username}`,
    })
  } catch (error) {
    console.error('[ADMIN_USERS_PATCH]', error)
    return NextResponse.json({ error: 'Błąd podczas edycji użytkownika' }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  try {
    const session = await auth()
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Brak uprawnień administratora' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('id')

    if (!userId) {
      return NextResponse.json({ error: 'Brak ID użytkownika' }, { status: 400 })
    }

    const targetUser = await prisma.user.findUnique({
      where: { id: userId },
    })

    if (!targetUser) {
      return NextResponse.json({ error: 'Użytkownik nie został znaleziony' }, { status: 404 })
    }

    const isMainAdmin =
      targetUser.username.toLowerCase() === 'daqu' ||
      targetUser.email.toLowerCase() === '7dudek@gmail.com'

    if (isMainAdmin) {
      return NextResponse.json({ error: 'Nie można usunąć głównego konta administratora (DaQu)!' }, { status: 400 })
    }

    // Delete associated collections and records first or cascade
    await prisma.userCollection.deleteMany({
      where: { userId },
    })

    await prisma.user.delete({
      where: { id: userId },
    })

    return NextResponse.json({
      success: true,
      message: `Konto użytkownika ${targetUser.username} zostało trwale usunięte`,
    })
  } catch (error) {
    console.error('[ADMIN_USERS_DELETE]', error)
    return NextResponse.json({ error: 'Błąd podczas usuwania użytkownika' }, { status: 500 })
  }
}
