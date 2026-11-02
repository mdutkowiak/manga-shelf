import { NextRequest, NextResponse } from 'next/server'
import { timingSafeEqual } from 'node:crypto'
import { startImportRun } from '@/lib/importer/run'

export const dynamic = 'force-dynamic'

function validSecret(provided: string | null): boolean {
  const secret = process.env.CRON_SECRET
  if (!secret || !provided) return false
  const a = Buffer.from(provided)
  const b = Buffer.from(secret)
  return a.length === b.length && timingSafeEqual(a, b)
}

// POST /api/cron/import?mode=incremental|refresh, nagłówek x-cron-secret = CRON_SECRET.
// Wywoływany z crona na serwerze (patrz docs/09_importer.md). Bez ustawionego CRON_SECRET zawsze zwraca 401.
export async function POST(request: NextRequest) {
  if (!validSecret(request.headers.get('x-cron-secret'))) {
    return NextResponse.json({ error: 'Brak dostępu' }, { status: 401 })
  }
  const mode = request.nextUrl.searchParams.get('mode') === 'refresh' ? 'refresh' : 'incremental'
  const { run, started } = await startImportRun({ mode, trigger: 'cron' })
  return NextResponse.json({ success: true, started, runId: run.id }, { status: started ? 202 : 200 })
}
