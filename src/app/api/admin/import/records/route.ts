import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/api-auth'
import { applyImportRecords } from '@/lib/importer/apply'
import type { ImportStatus, Prisma } from '@/generated/prisma/client'

export const dynamic = 'force-dynamic'

const STATUSES: ImportStatus[] = ['PENDING', 'APPLIED', 'REJECTED', 'SKIPPED']
const BATCH_LIMIT = 300

interface Filter {
  status?: string
  publisherId?: string
  q?: string
}

function buildWhere(filter: Filter): Prisma.ImportRecordWhereInput {
  const where: Prisma.ImportRecordWhereInput = {}
  if (filter.status && STATUSES.includes(filter.status as ImportStatus)) where.status = filter.status as ImportStatus
  if (filter.publisherId) where.publisherId = filter.publisherId === 'none' ? null : filter.publisherId
  if (filter.q?.trim()) {
    const q = filter.q.trim()
    where.OR = [
      { seriesTitle: { contains: q, mode: 'insensitive' } },
      { originalTitle: { contains: q, mode: 'insensitive' } },
      { isbn: { contains: q.replace(/-/g, '') } },
    ]
  }
  return where
}

// GET /api/admin/import/records?status=PENDING&publisherId=...&q=...&page=1
export async function GET(request: NextRequest) {
  const guard = await requireAdmin()
  if (guard.error) return guard.error

  const sp = request.nextUrl.searchParams
  const where = buildWhere({
    status: sp.get('status') ?? 'PENDING',
    publisherId: sp.get('publisherId') ?? undefined,
    q: sp.get('q') ?? undefined,
  })
  const page = Math.max(1, Number(sp.get('page')) || 1)
  const pageSize = 50

  const [total, records] = await Promise.all([
    prisma.importRecord.count({ where }),
    prisma.importRecord.findMany({
      where,
      include: { publisher: { select: { id: true, name: true } } },
      orderBy: [{ publisherId: 'asc' }, { seriesTitle: 'asc' }, { volumeNumber: 'asc' }],
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ])

  return NextResponse.json({
    total,
    page,
    pageSize,
    records: records.map((r) => ({ ...r, bnId: r.bnId.toString() })),
  })
}

// POST /api/admin/import/records - akcje zbiorcze: approve | reject | reset
// Body: { action, ids?: string[], filter?: { status, publisherId, q } }. Dla filtra przetwarzamy do 300 rekordów
// na wywołanie i zwracamy "remaining", żeby panel mógł wywołać ponownie.
export async function POST(request: NextRequest) {
  const guard = await requireAdmin()
  if (guard.error) return guard.error

  const body = await request.json().catch(() => null)
  const action = body?.action
  if (!['approve', 'reject', 'reset'].includes(action)) {
    return NextResponse.json({ error: 'Nieprawidłowa akcja' }, { status: 400 })
  }

  const fromStatus: ImportStatus[] =
    action === 'reset' ? ['REJECTED', 'SKIPPED'] : action === 'approve' ? ['PENDING'] : ['PENDING', 'SKIPPED']
  const idsInput: string[] | null = Array.isArray(body.ids)
    ? body.ids.filter((x: unknown): x is string => typeof x === 'string').slice(0, BATCH_LIMIT)
    : null

  const where: Prisma.ImportRecordWhereInput = idsInput
    ? { id: { in: idsInput }, status: { in: fromStatus } }
    : { ...buildWhere(body.filter ?? {}), status: { in: fromStatus } }

  const batch = await prisma.importRecord.findMany({
    where,
    select: { id: true },
    take: BATCH_LIMIT,
    orderBy: { id: 'asc' },
  })
  const ids = batch.map((b) => b.id)

  let result: Record<string, number> = {}
  if (action === 'approve') {
    result = { ...(await applyImportRecords(ids)) }
  } else {
    const data = action === 'reject' ? { status: 'REJECTED' as const } : { status: 'PENDING' as const, note: null }
    const updated = await prisma.importRecord.updateMany({ where: { id: { in: ids } }, data })
    result = { updated: updated.count }
  }

  // Rekordy pominięte przy zatwierdzaniu zmieniają status, więc "remaining" liczy tylko te, które nadal czekają
  const remaining = idsInput ? 0 : await prisma.importRecord.count({ where })
  return NextResponse.json({ success: true, processed: ids.length, ...result, remaining })
}
