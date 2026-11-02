// Parser rekordów API Biblioteki Narodowej (data.bn.org.pl) do postaci używanej przez importer.
// Rekord zawiera pola MARC21; zasady odczytu opisane są przy każdym polu.

export interface BnBib {
  id: number
  title: string
  publisher: string
  publicationYear: string
  genre: string
  languageOfOriginal?: string
  /** Język publikacji (np. "polski"); rekordy w innych językach to nie polskie wydania. */
  language?: string
  marc?: { fields: Record<string, unknown>[] }
}

export interface ParsedBnRecord {
  bnId: number
  publisherRaw: string
  publisherName: string | null
  seriesTitle: string
  originalTitle: string | null
  subtitle: string | null
  volumeNumber: number | null
  isbn: string | null
  coverPrice: number | null
  releaseYear: number | null
  releaseMonth: number | null
  pages: number | null
  edition: string | null
  special: boolean
  language: string | null
  genre: string
}

interface MarcField {
  tag: string
  subfields: Record<string, string>[]
}

const MONTHS: Record<string, number> = {
  styczeń: 1, stycznia: 1, luty: 2, lutego: 2, marzec: 3, marca: 3, kwiecień: 4, kwietnia: 4, maj: 5, maja: 5,
  czerwiec: 6, czerwca: 6, lipiec: 7, lipca: 7, sierpień: 8, sierpnia: 8, wrzesień: 9, września: 9,
  październik: 10, października: 10, listopad: 11, listopada: 11, grudzień: 12, grudnia: 12,
}

const MANGA_GENRE = /manga|manhwa|manhua|komiks/i
const NOT_A_COMIC = /poradnik|podręcznik|encyklopedia|słownik|kalendarz/i
const SPECIAL_EDITION = /deluxe|kanzenban|\bbox\b|zestaw|kolekcjonersk|ultimate|perfect|omnibus|\d\s*w\s*1\b|artbook|fanbook/i

/** Czyści końcówki typu " /", " :", " =" (tytuły równoległe: "Tytuł = Original"). */
export function cleanText(s: string | undefined | null): string {
  return (s ?? '').replace(/\s+/g, ' ').replace(/[\s/:;,.=]+$/g, '').trim()
}

function fieldsOf(bib: BnBib): MarcField[] {
  const out: MarcField[] = []
  for (const f of bib.marc?.fields ?? []) {
    const [tag, value] = Object.entries(f)[0] ?? []
    if (tag && value && typeof value === 'object' && 'subfields' in value) {
      out.push({ tag, subfields: (value as { subfields: Record<string, string>[] }).subfields })
    }
  }
  return out
}

const firstSub = (f: MarcField | undefined, code: string): string | undefined =>
  f?.subfields.map((s) => s[code]).find((v) => v !== undefined)

const allSubs = (f: MarcField, code: string): string[] => f.subfields.map((s) => s[code]).filter(Boolean)

function isValidEan13(d: string): boolean {
  if (!/^\d{13}$/.test(d)) return false
  let sum = 0
  for (let i = 0; i < 12; i++) sum += Number(d[i]) * (i % 2 === 0 ? 1 : 3)
  return (10 - (sum % 10)) % 10 === Number(d[12])
}

function isbn10to13(isbn10: string): string | null {
  if (!/^\d{9}[\dXx]$/.test(isbn10)) return null
  const body = '978' + isbn10.slice(0, 9)
  let sum = 0
  for (let i = 0; i < 12; i++) sum += Number(body[i]) * (i % 2 === 0 ? 1 : 3)
  return body + String((10 - (sum % 10)) % 10)
}

function extractIsbn(raw: string): string | null {
  const digits = raw.replace(/-/g, '')
  const m13 = digits.match(/\b97[89]\d{10}\b/)
  if (m13 && isValidEan13(m13[0])) return m13[0]
  const m10 = digits.match(/\b\d{9}[\dXx]\b/)
  return m10 ? isbn10to13(m10[0]) : null
}

function parsePrice(s: string | undefined): number | null {
  const m = s?.match(/(\d+)[,.](\d{2})/)
  return m ? Number(`${m[1]}.${m[2]}`) : null
}

/** Rekord jest mangą/komiksem azjatyckim, gdy ma odpowiedni gatunek (i nie jest poradnikiem). */
export function isMangaRecord(bib: BnBib): boolean {
  if (bib.language && !/polski/i.test(bib.language)) return false
  const genre = bib.genre ?? ''
  return MANGA_GENRE.test(genre) && !NOT_A_COMIC.test(genre)
}

/** Nazwa wydawcy z pola 260/264 $b (czystsza niż pole "publisher" z API). */
export function rawPublisher(bib: BnBib): string {
  const f = fieldsOf(bib).find((x) => x.tag === '260' || x.tag === '264')
  return (firstSub(f, 'b') ?? bib.publisher ?? '').trim()
}

export function parseBnRecord(bib: BnBib, canonicalPublisher: (raw: string) => string | null): ParsedBnRecord | null {
  const fields = fieldsOf(bib)
  const f245 = fields.find((f) => f.tag === '245')
  if (!f245) return null

  const seriesTitle = cleanText(firstSub(f245, 'a'))
  if (!seriesTitle) return null

  const part = firstSub(f245, 'n') ?? ''
  const volMatch =
    part.match(/(\d+)/) ??
    bib.title.match(/(?:\b[Tt]\.?|[Tt]om)\s*(\d+)\b/) ??
    bib.title.match(/[.,]\s*(\d{1,3})\s*[/,]/)
  const volumeNumber = volMatch && Number(volMatch[1]) <= 999 ? Number(volMatch[1]) : null
  const subtitle = cleanText(firstSub(f245, 'b') ?? firstSub(f245, 'p')) || null

  const f246 = fields.find((f) => f.tag === '246' && (firstSub(f, 'i') ?? '').toLowerCase().includes('oryginał'))
  const originalTitle = cleanText(firstSub(f246, 'a')) || null
  const language = firstSub(
    fields.find((f) => f.tag === '041'),
    'h'
  ) ?? null

  // ISBN i cena: pole 020. $a to ISBN tomu, $z to numery nieważne lub ponownie nadane, "(całość)" to ISBN zestawu.
  const f020s = fields.filter((f) => f.tag === '020')
  const isSet = (f: MarcField) => allSubs(f, 'q').join(' ').toLowerCase().includes('całość')
  let isbn: string | null = null
  let coverPrice: number | null = null
  for (const code of ['a', 'z'] as const) {
    for (const f of f020s) {
      const raw = firstSub(f, code)
      if (raw && !isSet(f)) {
        const parsed = extractIsbn(raw)
        if (parsed) {
          isbn = parsed
          coverPrice = parsePrice(firstSub(f, 'c'))
          break
        }
      }
    }
    if (isbn) break
  }
  if (coverPrice === null) coverPrice = f020s.map((f) => parsePrice(firstSub(f, 'c'))).find((p) => p !== null) ?? null

  const f26x = fields.find((f) => f.tag === '260' || f.tag === '264')
  const dateRaw = (firstSub(f26x, 'c') ?? '').toLowerCase()
  const releaseYear = Number(dateRaw.match(/\b(19|20)\d{2}\b/)?.[0] ?? bib.publicationYear) || null
  const monthWord = Object.keys(MONTHS).find((m) => dateRaw.includes(m))

  const pages = Number(firstSub(fields.find((f) => f.tag === '300'), 'a')?.match(/(\d+)/)?.[1]) || null
  const edition = cleanText(firstSub(fields.find((f) => f.tag === '250'), 'a')) || null
  const special = SPECIAL_EDITION.test(`${bib.title} ${edition ?? ''} ${subtitle ?? ''}`)

  const publisherRaw = rawPublisher(bib)

  return {
    bnId: bib.id,
    publisherRaw,
    publisherName: canonicalPublisher(publisherRaw),
    seriesTitle,
    originalTitle,
    subtitle,
    volumeNumber,
    isbn,
    coverPrice,
    releaseYear,
    releaseMonth: monthWord ? MONTHS[monthWord] : null,
    pages,
    edition,
    special,
    language,
    genre: bib.genre ?? '',
  }
}
