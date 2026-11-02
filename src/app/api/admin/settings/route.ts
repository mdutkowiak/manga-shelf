import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/api-auth'
import { getSiteSettings, saveSiteSettings } from '@/lib/site-settings'

export const dynamic = 'force-dynamic'

// GET /api/admin/settings - aktualne ustawienia witryny
export async function GET() {
  const guard = await requireAdmin()
  if (guard.error) return guard.error

  return NextResponse.json({ settings: await getSiteSettings() })
}

// PUT /api/admin/settings - zapis ustawień witryny (nieprawidłowe pola są odrzucane, braki uzupełniane domyślnymi)
export async function PUT(request: NextRequest) {
  const guard = await requireAdmin()
  if (guard.error) return guard.error

  try {
    const body = await request.json()
    const settings = await saveSiteSettings(body?.settings ?? body, guard.session.user.id)
    return NextResponse.json({ success: true, settings })
  } catch (error) {
    console.error('PUT /api/admin/settings error:', error)
    return NextResponse.json({ error: 'Nie udało się zapisać ustawień' }, { status: 500 })
  }
}
