import { prisma } from '@/lib/prisma'
import type { ImportRecord, ImportRun, Prisma, Publisher } from '@/generated/prisma/client'
import { BN_STREAMS, fetchBnPage } from './bn-client'
import { isMangaRecord, parseBnRecord, type ParsedBnRecord } from './bn-parser'
import { canonicalPublisherName, isKnownPublisher, publisherMatchKey } from './publisher-names'
import { applyImportRecords, MangaIndex } from './apply'

export interface RunOptions {
  /** incremental: tylko nowe rekordy (od kursora); refresh: ponowny przegląd ostatnich lat, uzupełnia zmiany. */
  mode: 'incremental' | 'refresh'
  trigger: 'manual' | 'cron'
  startedById?: string
  /** Po tym czasie uruchomienie kończy się jako PARTIAL, a kolejne wznawia od kursora. */
  budgetMs?: number
  maxPages?: number
  streams?: string[]
}

export interface RunStats {
  pages: number
  fetched: number
  notManga: number
  created: number
  updated: number
  applied: number
  skipped: number
  failed: number
  newPublishers: string[]
  streams: Record<string, { pages: number; done: boolean }>
}

const DEFAULT_BUDGET_MS = 10 * 60 * 1000
const STALE_RUN_MS = 30 * 60 * 1000
const PAGE_DELAY_MS = 250
const MAX_ALIASES = 25

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

const emptyStats = (): RunStats => ({
  pages: 0, fetched: 0, notManga: 0, created: 0, updated: 0, applied: 0, skipped: 0, failed: 0, newPublishers: [], streams: {},
})

/** Wydawcy z bazy, z rozpoznawaniem wariantów nazw i zakładaniem nowych (trafiają do panelu admina do sprawdzenia). */
class PublisherResolver {
  private byKey = new Map<string, Publisher>()
  readonly created: string[] = []

  static async load(): Promise<PublisherResolver> {
    const resolver = new PublisherResolver()
    for (const p of await prisma.publisher.findMany()) resolver.register(p)
    return resolver
  }

  private register(p: Publisher) {
    this.byKey.set(publisherMatchKey(p.name), p)
    for (const alias of p.aliases) this.byKey.set(publisherMatchKey(alias), p)
  }

  async resolve(raw: string, name: string | null): Promise<Publisher | null> {
    if (!name) return null
    const alias = raw.replace(/[\s,;:./]+$/g, '') // zapis z BN bez końcowej interpunkcji
    const found = this.byKey.get(publisherMatchKey(name)) ?? this.byKey.get(publisherMatchKey(alias))
    if (found) {
      if (alias && !found.aliases.includes(alias) && publisherMatchKey(alias) !== publisherMatchKey(found.name) && found.aliases.length < MAX_ALIASES) {
        const updated = await prisma.publisher.update({ where: { id: found.id }, data: { aliases: { push: alias } } })
        this.register(updated)
        return updated
      }
      return found
    }

    try {
      const created = await prisma.publisher.create({
        data: { name, source: 'bn', needsReview: !isKnownPublisher(name), aliases: alias && alias !== name ? [alias] : [] },
      })
      this.register(created)
      this.created.push(name)
      return created
    } catch {
      // wyścig lub inna wielkość liter: pobieramy istniejącego
      const existing = await prisma.publisher.findUnique({ where: { name } })
      if (existing) {
        this.register(existing)
        return existing
      }
      return null
    }
  }
}

const recordData = (p: ParsedBnRecord, publisherId: string | null) => ({
  publisherId,
  publisherRaw: p.publisherRaw,
  seriesTitle: p.seriesTitle,
  originalTitle: p.originalTitle,
  subtitle: p.subtitle,
  volumeNumber: p.volumeNumber,
  isbn: p.isbn,
  coverPrice: p.coverPrice,
  releaseYear: p.releaseYear,
  releaseMonth: p.releaseMonth,
  pages: p.pages,
  edition: p.edition,
  special: p.special,
  language: p.language,
  genre: p.genre,
})

const changed = (ex: ImportRecord, p: ParsedBnRecord) =>
  ex.coverPrice !== p.coverPrice || ex.isbn !== p.isbn || ex.volumeNumber !== p.volumeNumber || ex.seriesTitle !== p.seriesTitle

/** Tworzy wpis uruchomienia i startuje import w tle. Gdy inny import trwa, zwraca jego wpis. */
export async function startImportRun(options: RunOptions): Promise<{ run: ImportRun; started: boolean }> {
  await prisma.importRun.updateMany({
    where: { status: 'RUNNING', startedAt: { lt: new Date(Date.now() - STALE_RUN_MS) } },
    data: { status: 'FAILED', error: 'Przerwany (restart serwera lub przekroczony czas).', finishedAt: new Date() },
  })
  const running = await prisma.importRun.findFirst({ where: { status: 'RUNNING' }, orderBy: { startedAt: 'desc' } })
  if (running) return { run: running, started: false }

  const run = await prisma.importRun.create({
    data: { mode: options.mode, trigger: options.trigger, startedById: options.startedById ?? null, stats: emptyStats() as unknown as Prisma.InputJsonValue },
  })
  void executeImportRun(run.id, options).catch((error) => console.error('[IMPORT] Nieobsłużony błąd uruchomienia:', error))
  return { run, started: true }
}

export async function executeImportRun(runId: string, options: RunOptions): Promise<RunStats> {
  const stats = emptyStats()
  const startedAt = Date.now()
  const budget = options.budgetMs ?? DEFAULT_BUDGET_MS
  const maxPages = options.maxPages ?? Number.POSITIVE_INFINITY
  let incomplete = false

  const saveProgress = () =>
    prisma.importRun.update({ where: { id: runId }, data: { stats: stats as unknown as Prisma.InputJsonValue } }).catch(() => {})

  try {
    const publishers = await PublisherResolver.load()
    const mangaIndex = await MangaIndex.load()

    // Zadania: strumienie z kursorem (incremental) albo strumienie x ostatnie lata bez kursora (refresh)
    const streams = BN_STREAMS.filter((s) => !options.streams || options.streams.includes(s.id))
    const year = new Date().getFullYear()
    const jobs =
      options.mode === 'refresh'
        ? streams.flatMap((s) =>
            [year + 1, year, year - 1].map((y) => ({ id: `${s.id}:${y}`, params: { ...s.params, publicationYear: String(y) }, cursor: false }))
          )
        : streams.map((s) => ({ id: s.id, params: s.params, cursor: true }))

    jobLoop: for (const job of jobs) {
      const saved = job.cursor ? await prisma.importCursor.findUnique({ where: { stream: job.id } }) : null
      let sinceId = Number(saved?.sinceId ?? 0)
      stats.streams[job.id] = { pages: 0, done: false }

      while (true) {
        if (Date.now() - startedAt > budget || stats.pages >= maxPages) {
          incomplete = true
          break jobLoop
        }

        const page = await fetchBnPage(job.params, sinceId)
        stats.pages++
        stats.streams[job.id].pages++
        stats.fetched += page.bibs.length

        const parsed: ParsedBnRecord[] = []
        for (const bib of page.bibs) {
          if (!isMangaRecord(bib)) {
            stats.notManga++
            continue
          }
          const rec = parseBnRecord(bib, canonicalPublisherName)
          if (rec) parsed.push(rec)
        }

        const existing = await prisma.importRecord.findMany({ where: { bnId: { in: parsed.map((p) => BigInt(p.bnId)) } } })
        const existingById = new Map(existing.map((e) => [e.bnId.toString(), e]))
        const toApply: string[] = []

        for (const p of parsed) {
          const publisher = await publishers.resolve(p.publisherRaw, p.publisherName)
          const ex = existingById.get(String(p.bnId))
          if (!ex) {
            const created = await prisma.importRecord.create({ data: { bnId: BigInt(p.bnId), ...recordData(p, publisher?.id ?? null) } })
            stats.created++
            if (publisher?.autoApprove) toApply.push(created.id)
          } else if (ex.status === 'PENDING' || (ex.status === 'APPLIED' && changed(ex, p))) {
            await prisma.importRecord.update({ where: { id: ex.id }, data: recordData(p, publisher?.id ?? ex.publisherId) })
            stats.updated++
            if (ex.status === 'APPLIED' || publisher?.autoApprove) toApply.push(ex.id)
          }
        }

        if (toApply.length > 0) {
          const result = await applyImportRecords(toApply, mangaIndex)
          stats.applied += result.applied
          stats.skipped += result.skipped
          stats.failed += result.failed
        }
        stats.newPublishers = publishers.created

        const lastId = page.bibs.reduce((max, b) => Math.max(max, b.id), sinceId)
        const finished = page.nextSinceId === null
        if (job.cursor) {
          await prisma.importCursor.upsert({
            where: { stream: job.id },
            update: { sinceId: BigInt(page.nextSinceId ?? lastId), ...(finished ? { doneAt: new Date() } : {}) },
            create: { stream: job.id, sinceId: BigInt(page.nextSinceId ?? lastId), doneAt: finished ? new Date() : null },
          })
        }
        await saveProgress()

        if (finished) {
          stats.streams[job.id].done = true
          break
        }
        sinceId = page.nextSinceId!
        await sleep(PAGE_DELAY_MS)
      }
    }

    await prisma.importRun.update({
      where: { id: runId },
      data: { status: incomplete ? 'PARTIAL' : 'DONE', finishedAt: new Date(), stats: stats as unknown as Prisma.InputJsonValue },
    })
  } catch (error) {
    console.error('[IMPORT] Import zakończony błędem:', error)
    await prisma.importRun
      .update({
        where: { id: runId },
        data: {
          status: 'FAILED',
          finishedAt: new Date(),
          error: error instanceof Error ? error.message : 'Nieznany błąd',
          stats: stats as unknown as Prisma.InputJsonValue,
        },
      })
      .catch(() => {})
  }
  return stats
}
