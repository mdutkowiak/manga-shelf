import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/api-auth'

// POST /api/admin/publishers/merge { fromId, toId }
// Przenosi serie i rekordy importu do wydawcy docelowego, a nazwę i aliasy źródła zapisuje jako aliasy celu,
// dzięki czemu kolejne importy trafiają od razu do właściwego wydawcy.
export async function POST(request: NextRequest) {
  const guard = await requireAdmin()
  if (guard.error) return guard.error

  const { fromId, toId } = (await request.json().catch(() => ({}))) as { fromId?: string; toId?: string }
  if (!fromId || !toId || fromId === toId) {
    return NextResponse.json({ error: 'Podaj dwóch różnych wydawców' }, { status: 400 })
  }

  const [from, to] = await Promise.all([
    prisma.publisher.findUnique({ where: { id: fromId } }),
    prisma.publisher.findUnique({ where: { id: toId } }),
  ])
  if (!from || !to) return NextResponse.json({ error: 'Nie znaleziono wydawcy' }, { status: 404 })

  const aliases = [...new Set([...to.aliases, from.name, ...from.aliases])].filter((a) => a !== to.name).slice(0, 25)
  await prisma.$transaction([
    prisma.manga.updateMany({ where: { publisherId: fromId }, data: { publisherId: toId } }),
    prisma.importRecord.updateMany({ where: { publisherId: fromId }, data: { publisherId: toId } }),
    prisma.publisher.update({ where: { id: toId }, data: { aliases } }),
    prisma.publisher.delete({ where: { id: fromId } }),
  ])
  return NextResponse.json({ success: true, merged: from.name, into: to.name })
}
