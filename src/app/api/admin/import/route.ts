import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/api-auth'
import { startImportRun } from '@/lib/importer/run'

export const dynamic = 'force-dynamic'

// GET /api/admin/import - podsumowanie: ostatnie uruchomienia, kursory strumieni, liczby rekordów wg statusu
export async function GET() {
  const guard = await requireAdmin()
  if (guard.error) return guard.error

  const [runs, cursors, byStatus, publishersToReview] = await Promise.all([
    prisma.importRun.findMany({ orderBy: { startedAt: 'desc' }, take: 8 }),
    prisma.importCursor.findMany({ orderBy: { stream: 'asc' } }),
    prisma.importRecord.groupBy({ by: ['status'], _count: { _all: true } }),
    prisma.publisher.count({ where: { needsReview: true } }),
  ])

  return NextResponse.json({
    runs,
    cursors: cursors.map((c) => ({ stream: c.stream, sinceId: c.sinceId.toString(), doneAt: c.doneAt })),
    counts: Object.fromEntries(byStatus.map((s) => [s.status, s._count._all])),
    publishersToReview,
    running: runs.some((r) => r.status === 'RUNNING'),
  })
}

// POST /api/admin/import - ręczne uruchomienie importu (działa w tle)
export async function POST(request: NextRequest) {
  const guard = await requireAdmin()
  if (guard.error) return guard.error

  const body = await request.json().catch(() => ({}))
  const mode = body?.mode === 'refresh' ? 'refresh' : 'incremental'
  const { run, started } = await startImportRun({ mode, trigger: 'manual', startedById: guard.session.user.id })
  return NextResponse.json({ success: true, started, run }, { status: started ? 202 : 200 })
}
