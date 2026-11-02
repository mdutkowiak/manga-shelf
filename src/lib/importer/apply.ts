import { prisma } from '@/lib/prisma'
import type { ImportRecord, Prisma } from '@/generated/prisma/client'
import { areSameSeries, normalizeTitleKey } from '@/lib/title-utils'

/**
 * Zapis rekordów z importu do katalogu (Manga i Volume).
 *
 * Ochrona ręcznych zmian: każde pole uzupełnione importem dostaje wpis w fieldMeta
 * ({ source, value, at }). Import nadpisuje pole tylko wtedy, gdy jest puste albo gdy jego
 * wartość nadal równa się tej, którą import zapisał (czyli nikt jej ręcznie nie zmienił).
 * Zmiana w panelu admina automatycznie "odblokowuje" pole przed importem.
 */

type FieldMeta = Record<string, { source: string; value: unknown; at: string }>

const PLACEHOLDER_PRICE = 34.99 // domyślna cena, którą aplikacja wstawia przy tworzeniu tomu bez ceny

export interface ApplyResult {
  status: 'APPLIED' | 'SKIPPED'
  note?: string
  mangaId?: string
  volumeId?: string
}

interface IndexedManga {
  id: string
  title: string
  polishTitle: string | null
  publisherId: string | null
}

/** Indeks istniejących serii po znormalizowanym tytule (żeby nie porównywać każdego rekordu ze wszystkimi seriami). */
export class MangaIndex {
  private byKey = new Map<string, IndexedManga[]>()

  static async load(): Promise<MangaIndex> {
    const index = new MangaIndex()
    const mangas = await prisma.manga.findMany({
      select: { id: true, title: true, polishTitle: true, publisherId: true },
    })
    for (const m of mangas) index.add(m)
    return index
  }

  add(m: IndexedManga) {
    for (const t of [m.title, m.polishTitle]) {
      const key = normalizeTitleKey(t)
      if (!key) continue
      const list = this.byKey.get(key) ?? []
      if (!list.some((x) => x.id === m.id)) list.push(m)
      this.byKey.set(key, list)
    }
  }

  find(rec: { seriesTitle: string; originalTitle: string | null }, publisherId: string | null): IndexedManga | null {
    const keys = [normalizeTitleKey(rec.originalTitle), normalizeTitleKey(rec.seriesTitle)].filter(Boolean)
    const seen = new Map<string, IndexedManga>()
    for (const key of keys) for (const m of this.byKey.get(key) ?? []) seen.set(m.id, m)

    const candidate = { title: rec.originalTitle ?? rec.seriesTitle, polishTitle: rec.seriesTitle }
    const matches = [...seen.values()].filter((m) => areSameSeries(candidate, m))
    // Ta sama seria innego wydawcy to osobne polskie wydanie, więc łączymy tylko z tym samym wydawcą lub bez wydawcy.
    return (
      matches.find((m) => publisherId && m.publisherId === publisherId) ??
      matches.find((m) => m.publisherId === null) ??
      null
    )
  }
}

const readMeta = (raw: Prisma.JsonValue | null | undefined): FieldMeta =>
  raw && typeof raw === 'object' && !Array.isArray(raw) ? (raw as unknown as FieldMeta) : {}

const normalizeValue = (v: unknown): string => JSON.stringify(v instanceof Date ? v.toISOString() : (v ?? null))

/** Czy import może zapisać pole: jest puste albo ma wartość zapisaną wcześniej przez import. */
function mayWrite(meta: FieldMeta, field: string, current: unknown): boolean {
  if (current === null || current === undefined) return true
  const entry = meta[field]
  return !!entry && entry.source === 'bn' && normalizeValue(entry.value) === normalizeValue(current)
}

const stamp = (meta: FieldMeta, field: string, value: unknown): FieldMeta => ({
  ...meta,
  [field]: { source: 'bn', value: value instanceof Date ? value.toISOString() : value, at: new Date().toISOString() },
})

const releaseDate = (rec: ImportRecord): Date | null =>
  rec.releaseYear && rec.releaseMonth ? new Date(Date.UTC(rec.releaseYear, rec.releaseMonth - 1, 1)) : null

const isNewer = (a: ImportRecord, b: ImportRecord): boolean =>
  (a.releaseYear ?? 0) * 100 + (a.releaseMonth ?? 0) > (b.releaseYear ?? 0) * 100 + (b.releaseMonth ?? 0)

const skipped = (note: string, extra: Partial<ApplyResult> = {}): ApplyResult => ({ status: 'SKIPPED', note, ...extra })

/** Zapisuje jeden rekord w katalogu. Nie zmienia samego ImportRecord, robi to wywołujący. */
export async function applyImportRecord(
  rec: ImportRecord,
  publisherId: string | null,
  index: MangaIndex
): Promise<ApplyResult> {
  if (rec.special) return skipped('Wydanie specjalne (box, deluxe, zestaw). Dodaj ręcznie, jeśli ma trafić do katalogu.')

  let volumeNumber = rec.volumeNumber
  if (volumeNumber === null) {
    const numbered = await prisma.importRecord.count({
      where: { publisherId, seriesTitle: rec.seriesTitle, volumeNumber: { not: null } },
    })
    if (numbered > 0) return skipped('Brak numeru tomu w serii wielotomowej.')
    volumeNumber = 1 // jednotomówka
  }

  // 1. Ten sam ISBN w katalogu: to ten sam tom
  let manga: { id: string; publisherId: string | null } | null = null
  let existingVolume = null as Awaited<ReturnType<typeof prisma.volume.findUnique>>
  if (rec.isbn) {
    const byIsbn = await prisma.volume.findUnique({ where: { isbn: rec.isbn }, include: { manga: true } })
    if (byIsbn) {
      if (byIsbn.volumeNumber !== volumeNumber) {
        return skipped(
          `ISBN ${rec.isbn} jest w katalogu przypisany do tomu ${byIsbn.volumeNumber} serii "${byIsbn.manga.polishTitle ?? byIsbn.manga.title}".`
        )
      }
      manga = byIsbn.manga
      existingVolume = byIsbn
    }
  }

  // 2. Seria po tytule i wydawcy, a gdy jej brak, tworzymy nową
  if (!manga) {
    const found = index.find(rec, publisherId)
    if (found) {
      manga = found
    } else {
      const created = await prisma.manga.create({
        data: {
          title: rec.originalTitle ?? rec.seriesTitle,
          polishTitle: rec.originalTitle ? rec.seriesTitle : null,
          publisherId,
          statusInPoland: 'UNKNOWN',
          fieldMeta: {
            polishTitle: { source: 'bn', value: rec.originalTitle ? rec.seriesTitle : null, at: new Date().toISOString() },
          },
        },
        select: { id: true, title: true, polishTitle: true, publisherId: true },
      })
      index.add(created)
      manga = created
    }
  }

  // 3. Tom
  if (!existingVolume) {
    existingVolume = await prisma.volume.findUnique({
      where: { mangaId_volumeNumber: { mangaId: manga.id, volumeNumber } },
    })
  }

  const date = releaseDate(rec)
  let volumeId: string
  let note: string | undefined

  if (!existingVolume) {
    let meta: FieldMeta = {}
    if (rec.isbn) meta = stamp(meta, 'isbn', rec.isbn)
    if (date) meta = stamp(meta, 'polishReleaseDate', date)
    if (rec.coverPrice !== null) meta = stamp(meta, 'pricePLN', rec.coverPrice)
    const created = await prisma.volume.create({
      data: {
        mangaId: manga.id,
        volumeNumber,
        isbn: rec.isbn,
        polishReleaseDate: date,
        pricePLN: rec.coverPrice,
        fieldMeta: meta as unknown as Prisma.InputJsonValue,
      },
    })
    volumeId = created.id
  } else {
    volumeId = existingVolume.id
    const previous = await prisma.importRecord.findFirst({
      where: { volumeId, status: 'APPLIED', id: { not: rec.id } },
    })
    const isReprint = !!previous
    let meta = readMeta(existingVolume.fieldMeta)
    const data: Prisma.VolumeUpdateInput = {}

    if (rec.isbn && !existingVolume.isbn && !isReprint) {
      const clash = await prisma.volume.findUnique({ where: { isbn: rec.isbn }, select: { id: true } })
      if (!clash) {
        data.isbn = rec.isbn
        meta = stamp(meta, 'isbn', rec.isbn)
      }
    }
    // data premiery pochodzi z pierwszego wydania, dodruk jej nie zmienia
    if (date && !isReprint && mayWrite(meta, 'polishReleaseDate', existingVolume.polishReleaseDate)) {
      data.polishReleaseDate = date
      meta = stamp(meta, 'polishReleaseDate', date)
    }
    // cena okładkowa: dodruk z późniejszej daty aktualizuje cenę
    const priceAllowed =
      rec.coverPrice !== null &&
      (!isReprint || (previous && isNewer(rec, previous))) &&
      (mayWrite(meta, 'pricePLN', existingVolume.pricePLN) ||
        (existingVolume.pricePLN === PLACEHOLDER_PRICE && !meta.pricePLN))
    if (priceAllowed) {
      data.pricePLN = rec.coverPrice
      meta = stamp(meta, 'pricePLN', rec.coverPrice)
    }

    if (Object.keys(data).length > 0) {
      await prisma.volume.update({ where: { id: volumeId }, data: { ...data, fieldMeta: meta as unknown as Prisma.InputJsonValue } })
    }
    if (isReprint) {
      return skipped('Dodruk lub kolejne wydanie tomu, który jest już w katalogu.', {
        mangaId: manga.id,
        volumeId,
      })
    }
    note = Object.keys(data).length > 0 ? 'Uzupełniono tom, który już był w katalogu.' : 'Tom już był w katalogu, bez zmian.'
  }

  // 4. Seria: wydawca, liczba tomów (nigdy nie zmniejszamy)
  const current = await prisma.manga.findUnique({
    where: { id: manga.id },
    select: { publisherId: true, totalVolumesPoland: true, fieldMeta: true },
  })
  if (current) {
    const mangaData: Prisma.MangaUpdateInput = {}
    let mangaMeta = readMeta(current.fieldMeta)
    if (publisherId && !current.publisherId) mangaData.publisher = { connect: { id: publisherId } }
    const max = await prisma.volume.aggregate({ where: { mangaId: manga.id }, _max: { volumeNumber: true } })
    const maxVol = max._max.volumeNumber ?? null
    if (maxVol !== null && (current.totalVolumesPoland === null || current.totalVolumesPoland < maxVol)) {
      mangaData.totalVolumesPoland = maxVol
      mangaMeta = stamp(mangaMeta, 'totalVolumesPoland', maxVol)
    }
    if (Object.keys(mangaData).length > 0) {
      await prisma.manga.update({
        where: { id: manga.id },
        data: { ...mangaData, fieldMeta: mangaMeta as unknown as Prisma.InputJsonValue },
      })
    }
  }

  return { status: 'APPLIED', note, mangaId: manga.id, volumeId }
}

export interface BulkApplyStats {
  applied: number
  skipped: number
  failed: number
}

/** Zatwierdza rekordy: zapisuje je w katalogu i aktualizuje ich status. */
export async function applyImportRecords(ids: string[], index?: MangaIndex): Promise<BulkApplyStats> {
  const stats: BulkApplyStats = { applied: 0, skipped: 0, failed: 0 }
  if (ids.length === 0) return stats
  const mangaIndex = index ?? (await MangaIndex.load())
  const records = await prisma.importRecord.findMany({ where: { id: { in: ids } }, orderBy: [{ releaseYear: 'asc' }, { releaseMonth: 'asc' }] })

  for (const rec of records) {
    try {
      const result = await applyImportRecord(rec, rec.publisherId, mangaIndex)
      await prisma.importRecord.update({
        where: { id: rec.id },
        data: {
          status: result.status,
          note: result.note ?? null,
          mangaId: result.mangaId ?? null,
          volumeId: result.volumeId ?? null,
          appliedAt: result.status === 'APPLIED' ? new Date() : null,
        },
      })
      if (result.status === 'APPLIED') stats.applied++
      else stats.skipped++
    } catch (error) {
      stats.failed++
      console.error(`[IMPORT] Nie udało się zastosować rekordu ${rec.id}:`, error)
      await prisma.importRecord
        .update({ where: { id: rec.id }, data: { note: `Błąd zapisu: ${error instanceof Error ? error.message : 'nieznany'}` } })
        .catch(() => {})
    }
  }
  return stats
}
