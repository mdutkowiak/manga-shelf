import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getSiteSettings } from '@/lib/site-settings'
import { UI_COOKIE, resolveUi, sanitizeUserPrefs } from '@/lib/ui-settings'

export const dynamic = 'force-dynamic'

// PUT /api/ui-preferences - zapis wyboru wyglądu (ciasteczko dla każdego, baza dla zalogowanych)
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const prefs = sanitizeUserPrefs(body)
    const site = await getSiteSettings()

    const session = await auth()
    if (session?.user?.id) {
      await prisma.user
        .update({ where: { id: session.user.id }, data: { uiPreferences: JSON.parse(JSON.stringify(prefs)) } })
        .catch((err) => console.error('Nie udało się zapisać preferencji wyglądu w bazie:', err))
    }

    const response = NextResponse.json({ success: true, ui: resolveUi(site, prefs) })
    response.cookies.set(UI_COOKIE, JSON.stringify(prefs), {
      path: '/',
      maxAge: 60 * 60 * 24 * 365,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      httpOnly: true,
    })
    return response
  } catch {
    return NextResponse.json({ error: 'Nieprawidłowe dane' }, { status: 400 })
  }
}
