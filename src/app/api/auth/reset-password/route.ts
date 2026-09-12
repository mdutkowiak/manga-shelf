import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { identifier, newPassword } = body

    if (!identifier || typeof identifier !== 'string' || !identifier.trim()) {
      return NextResponse.json({ error: 'Podaj login lub adres email' }, { status: 400 })
    }

    if (!newPassword || typeof newPassword !== 'string' || newPassword.length < 6) {
      return NextResponse.json({ error: 'Hasło musi mieć co najmniej 6 znaków' }, { status: 400 })
    }

    const cleanIdentifier = identifier.trim()

    // Find user by email OR username (case-insensitive)
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { email: { equals: cleanIdentifier, mode: 'insensitive' } },
          { username: { equals: cleanIdentifier, mode: 'insensitive' } },
        ],
      },
    })

    if (!user) {
      return NextResponse.json(
        { error: `Nie znaleziono użytkownika o loginie lub adresie "${cleanIdentifier}"` },
        { status: 404 }
      )
    }

    const hashedPassword = await bcrypt.hash(newPassword, 12)

    await prisma.user.update({
      where: { id: user.id },
      data: { password: hashedPassword },
    })

    return NextResponse.json({
      success: true,
      username: user.username,
      message: `Hasło dla konta "${user.username}" zostało pomyślnie zmienione. Możesz się teraz zalogować.`,
    })
  } catch (error) {
    console.error('[RESET_PASSWORD_ERROR]', error)
    return NextResponse.json({ error: 'Błąd podczas resetowania hasła' }, { status: 500 })
  }
}
