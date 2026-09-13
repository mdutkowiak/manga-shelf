import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'

export const AVAILABLE_PERMISSIONS = [
  { id: 'MANGA_MANAGE', label: 'Zarządzanie seriami mang', description: 'Dodawanie, edycja tomów, okładek i statusów w Polsce' },
  { id: 'RELEASES_MANAGE', label: 'Zarządzanie premierami i kalendarzem', description: 'Dodawanie zapowiedzi, edycja cen, linków do sklepów i dat' },
  { id: 'PUBLISHERS_MANAGE', label: 'Zarządzanie wydawcami', description: 'Dodawanie nowych wydawnictw, logo i linków' },
  { id: 'USERS_MANAGE', label: 'Zarządzanie użytkownikami', description: 'Przeglądanie kont, edycja profili, haseł i blokowanie' },
  { id: 'ROLES_MANAGE', label: 'Zarządzanie rolami', description: 'Tworzenie i edycja ról oraz uprawnień systemowych' },
]

export async function GET() {
  try {
    const session = await auth()
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Brak uprawnień administratora' }, { status: 403 })
    }

    // Ensure system roles exist
    let roles = await prisma.role.findMany({
      include: {
        _count: {
          select: { users: true },
        },
      },
      orderBy: { createdAt: 'asc' },
    })

    if (roles.length === 0) {
      try {
        await prisma.role.createMany({
          data: [
            {
              name: 'SUPER_ADMIN',
              label: 'Super Administrator',
              description: 'Pełny dostęp do wszystkich funkcji systemu',
              isSystem: true,
              permissions: ['MANGA_MANAGE', 'RELEASES_MANAGE', 'PUBLISHERS_MANAGE', 'USERS_MANAGE', 'ROLES_MANAGE'],
            },
            {
              name: 'MODERATOR',
              label: 'Moderator Treści',
              description: 'Zarządzanie bazą mang i kalendarzem premier',
              isSystem: false,
              permissions: ['MANGA_MANAGE', 'RELEASES_MANAGE'],
            },
            {
              name: 'RELEASES_EDITOR',
              label: 'Redaktor Premier',
              description: 'Dodawanie i aktualizacja nadchodzących tomów i linków sklepowych',
              isSystem: false,
              permissions: ['RELEASES_MANAGE'],
            },
          ],
        })

        roles = await prisma.role.findMany({
          include: {
            _count: {
              select: { users: true },
            },
          },
          orderBy: { createdAt: 'asc' },
        })
      } catch (seedErr) {
        console.warn('Could not auto-seed roles (table might be initializing):', seedErr)
      }
    }

    return NextResponse.json({
      success: true,
      roles,
      availablePermissions: AVAILABLE_PERMISSIONS,
    })
  } catch (error) {
    console.error('[ADMIN_ROLES_GET]', error)
    return NextResponse.json({ error: 'Błąd podczas pobierania ról' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth()
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Brak uprawnień administratora' }, { status: 403 })
    }

    const body = await request.json()
    const { name, label, description, permissions } = body

    if (!label || typeof label !== 'string' || !label.trim()) {
      return NextResponse.json({ error: 'Wymagana jest czytelna nazwa roli' }, { status: 400 })
    }

    const cleanName = (name || label)
      .trim()
      .toUpperCase()
      .replace(/[^A-Z0-9_]/g, '_')

    // Check unique name
    const existing = await prisma.role.findUnique({
      where: { name: cleanName },
    })
    if (existing) {
      return NextResponse.json({ error: 'Rola o takim identyfikatorze technicznym już istnieje' }, { status: 400 })
    }

    const newRole = await prisma.role.create({
      data: {
        name: cleanName,
        label: label.trim(),
        description: description?.trim() || null,
        permissions: Array.isArray(permissions) ? permissions : [],
        isSystem: false,
      },
    })

    return NextResponse.json({ success: true, role: newRole })
  } catch (error) {
    console.error('[ADMIN_ROLES_POST]', error)
    return NextResponse.json({ error: 'Błąd podczas tworzenia roli' }, { status: 500 })
  }
}

export async function PATCH(request: Request) {
  try {
    const session = await auth()
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Brak uprawnień administratora' }, { status: 403 })
    }

    const body = await request.json()
    const { id, label, description, permissions } = body

    if (!id) {
      return NextResponse.json({ error: 'Brak ID roli' }, { status: 400 })
    }

    const targetRole = await prisma.role.findUnique({
      where: { id },
    })

    if (!targetRole) {
      return NextResponse.json({ error: 'Rola nie została odnaleziona' }, { status: 404 })
    }

    const updatedRole = await prisma.role.update({
      where: { id },
      data: {
        ...(label ? { label: label.trim() } : {}),
        ...(description !== undefined ? { description: description?.trim() || null } : {}),
        ...(Array.isArray(permissions) ? { permissions } : {}),
      },
    })

    return NextResponse.json({ success: true, role: updatedRole })
  } catch (error) {
    console.error('[ADMIN_ROLES_PATCH]', error)
    return NextResponse.json({ error: 'Błąd podczas aktualizacji roli' }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  try {
    const session = await auth()
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Brak uprawnień administratora' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'Brak ID roli' }, { status: 400 })
    }

    const targetRole = await prisma.role.findUnique({
      where: { id },
      include: { _count: { select: { users: true } } },
    })

    if (!targetRole) {
      return NextResponse.json({ error: 'Rola nie została odnaleziona' }, { status: 404 })
    }

    if (targetRole.isSystem) {
      return NextResponse.json({ error: 'Nie można usunąć wbudowanej roli systemowej' }, { status: 400 })
    }

    if (targetRole._count.users > 0) {
      return NextResponse.json({
        error: `Nie można usunąć roli przypisanej do ${targetRole._count.users} użytkowników. Zmień im role przed usunięciem.`,
      }, { status: 400 })
    }

    await prisma.role.delete({
      where: { id },
    })

    return NextResponse.json({ success: true, message: 'Rola została pomyślnie usunięta' })
  } catch (error) {
    console.error('[ADMIN_ROLES_DELETE]', error)
    return NextResponse.json({ error: 'Błąd podczas usuwania roli' }, { status: 500 })
  }
}
