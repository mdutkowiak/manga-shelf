/**
 * PROTOTYP: import polskich wydań mang z API Biblioteki Narodowej (data.bn.org.pl).
 * Nic nie zapisuje do bazy. Pokazuje, ile danych da się złożyć automatycznie i jak dobrej jakości.
 *
 * Uruchomienie:
 *   npx tsx scripts/prototype-bn-import.ts [wydawca ...] [--out=plik.json] [--max-pages=40]
 * Domyślnie: Waneko, Studio JG, Fantastica, Kotori, Dango, Hanami.
 */
import { writeFileSync } from 'node:fs'

const API = 'https://data.bn.org.pl/api/institutions/bibs.json'
const PAGE_SIZE = 100
const DELAY_MS = 300

type Subfield = Record<string, string>
interface MarcField {
  tag: string
  subfields: Subfield[]
}
interface Bib {
  id: number
  title: string
  publisher: string
  publicationYear: string
  genre: string
  marc?: { fields: Record<string, unknown>[] }
}

export interface ParsedVolume {
  bnId: number
  publisher: string
  seriesTitle: string
  subtitle: string | null
  originalTitle: string | null
  volume: number | null
  isbn: string | null
  isbnSource: 'a' | 'z' | null
  coverPrice: number | null
  year: number | null
  month: number | null
  pages: number | null
  edition: string | null
  special: boolean
  originalLang: string | null
  genre: string
  isManga: boolean
}

const MONTHS: Record<string, number> = {
  styczeń: 1, stycznia: 1, luty: 2, lutego: 2, marzec: 3, marca: 3, kwiecień: 4, kwietnia: 4, maj: 5, maja: 5,
  czerwiec: 6, czerwca: 6, lipiec: 7, lipca: 7, sierpień: 8, sierpnia: 8, wrzesień: 9, września: 9,
  październik: 10, października: 10, listopad: 11, listopada: 11, grudzień: 12, grudnia: 12,
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

// czyści końcówki typu " /", " :", " =" (tytuły równoległe: "Tytuł = Original")
const clean = (s: string | undefined) =>
  (s ?? '').replace(/\s+/g, ' ').replace(/[\s/:;,.=]+$/g, '').trim()

function fieldsOf(bib: Bib): MarcField[] {
  const out: MarcField[] = []
  for (const f of bib.marc?.fields ?? []) {
    const [tag, value] = Object.entries(f)[0]
    if (value && typeof value === 'object' && 'subfields' in value) {
      out.push({ tag, subfields: (value as { subfields: Subfield[] }).subfields })
    }
  }
  return out
}

const sub = (f: MarcField | undefined, code: string): string | undefined =>
  f?.subfields.map((s) => s[code]).find((v) => v !== undefined)

const allSub = (f: MarcField, code: string): string[] => f.subfields.map((s) => s[code]).filter(Boolean)

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

// BN zapisuje wydawcę niespójnie ("Wydawnictwo Waneko Waneko,", "J. P. Fantastica Shin Yasuda ..."), więc sprowadzamy do jednej nazwy
function canonicalPublisher(raw: string): string {
  if (/waneko/i.test(raw)) return 'Waneko'
  if (/fantastica|j\.?\s?p\.?\s?f\b|japonica/i.test(raw)) return 'J.P. Fantastica'
  if (/studio\s*j|sjg/i.test(raw)) return 'Studio JG'
  if (/kotori/i.test(raw)) return 'Kotori'
  if (/dango/i.test(raw)) return 'Dango'
  if (/hanami/i.test(raw)) return 'Hanami'
  return clean(raw).replace(/^Wydawnictwo\s+/i, '')
}

const parsePrice =(s: string | undefined): number | null => {
  const m = s?.match(/(\d+)[,.](\d{2})/)
  return m ? Number(`${m[1]}.${m[2]}`) : null
}

export function parseBib(bib: Bib): ParsedVolume | null {
  const fields = fieldsOf(bib)
  const f245 = fields.find((f) => f.tag === '245')
  if (!f245) return null

  const seriesTitle = clean(sub(f245, 'a'))
  if (!seriesTitle) return null
  const part = sub(f245, 'n') ?? ''
  const volMatch =
    part.match(/(\d+)/) ??
    bib.title.match(/(?:\b[Tt]\.?|[Tt]om)\s*(\d+)\b/) ??
    bib.title.match(/[.,]\s*(\d{1,3})\s*[/,]/)
  const subtitle = clean(sub(f245, 'b') ?? sub(f245, 'p')) || null

  // manga/manhwa rozpoznajemy po języku oryginału (041$h) albo gatunku; filtr genre=Manga w API pomija np. "Komiks"
  const originalLang = sub(fields.find((f) => f.tag === '041'), 'h') ?? null
  const isManga =
    ['jpn', 'kor', 'chi'].includes(originalLang ?? '') || /manga|manhwa|manhua|komiks/i.test(bib.genre ?? '')

  const f246 = fields.find((f) => f.tag === '246' && (sub(f, 'i') ?? '').toLowerCase().includes('oryginał'))
  const originalTitle = clean(sub(f246, 'a')) || null

  // ISBN i cena: pole 020. $a to ISBN tomu; $z to numery nieważne lub ponownie nadane; "(całość)" to ISBN zestawu
  let isbn: string | null = null
  let isbnSource: 'a' | 'z' | null = null
  let coverPrice: number | null = null
  const f020s = fields.filter((f) => f.tag === '020')
  const isSet = (f: MarcField) => allSub(f, 'q').join(' ').toLowerCase().includes('całość')
  for (const f of f020s) {
    const a = sub(f, 'a')
    if (a && !isSet(f)) {
      const parsed = extractIsbn(a)
      if (parsed) {
        isbn = parsed
        isbnSource = 'a'
        coverPrice = parsePrice(sub(f, 'c'))
        break
      }
    }
  }
  if (!isbn) {
    for (const f of f020s) {
      const z = sub(f, 'z')
      if (z && !isSet(f)) {
        const parsed = extractIsbn(z)
        if (parsed) {
          isbn = parsed
          isbnSource = 'z'
          coverPrice = parsePrice(sub(f, 'c'))
          break
        }
      }
    }
  }
  if (coverPrice === null) coverPrice = f020s.map((f) => parsePrice(sub(f, 'c'))).find((p) => p !== null) ?? null

  const f26x = fields.find((f) => f.tag === '260' || f.tag === '264')
  const dateRaw = (sub(f26x, 'c') ?? '').toLowerCase()
  const year = Number(dateRaw.match(/\b(19|20)\d{2}\b/)?.[0] ?? bib.publicationYear) || null
  const monthWord = Object.keys(MONTHS).find((m) => dateRaw.includes(m))

  const pages = Number(sub(fields.find((f) => f.tag === '300'), 'a')?.match(/(\d+)/)?.[1]) || null
  const edition = clean(sub(fields.find((f) => f.tag === '250'), 'a')) || null
  const special = /deluxe|kanzenban|box|zestaw|kolekcjonersk|ultimate|perfect|omnibus|\d\s*w\s*1/i.test(
    `${bib.title} ${edition ?? ''} ${subtitle ?? ''}`
  )

  return {
    bnId: bib.id,
    publisher: canonicalPublisher(bib.publisher),
    seriesTitle,
    subtitle,
    originalTitle,
    volume: volMatch ? Number(volMatch[1]) : null,
    isbn,
    isbnSource,
    coverPrice,
    year,
    month: monthWord ? MONTHS[monthWord] : null,
    pages,
    edition,
    special,
    originalLang,
    genre: bib.genre ?? '',
    isManga,
  }
}

async function fetchPublisher(publisher: string, maxPages: number): Promise<Bib[]> {
  const records: Bib[] = []
  let url: string | null = `${API}?${new URLSearchParams({ publisher, limit: String(PAGE_SIZE) })}`
  for (let page = 0; url && page < maxPages; page++) {
    const res = await fetch(url, { headers: { 'User-Agent': 'mangowo-bn-prototype' } })
    if (!res.ok) throw new Error(`BN API ${res.status} dla ${url}`)
    const json = (await res.json()) as { bibs: Bib[]; nextPage?: string }
    records.push(...json.bibs)
    url = json.nextPage && json.bibs.length > 0 ? json.nextPage : null
    process.stderr.write(`  ${publisher}: ${records.length} rekordów\r`)
    await sleep(DELAY_MS)
  }
  process.stderr.write('\n')
  return records
}

const norm = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/ł/g, 'l')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()

const pct = (n: number, d: number) => (d ? `${Math.round((n / d) * 100)}%` : '-')

function mostCommon(items: string[]): string {
  const counts = new Map<string, number>()
  for (const i of items) counts.set(i, (counts.get(i) ?? 0) + 1)
  return [...counts.entries()].sort((a, b) => b[1] - a[1])[0][0]
}

function compress(nums: number[]): string {
  if (!nums.length) return '-'
  const out: string[] = []
  let start = nums[0]
  let prev = nums[0]
  for (const n of [...nums.slice(1), Infinity]) {
    if (n === prev + 1) {
      prev = n
      continue
    }
    out.push(start === prev ? `${start}` : `${start}-${prev}`)
    start = n
    prev = n
  }
  return out.join(', ')
}

async function main() {
  const args = process.argv.slice(2)
  const out = args.find((a) => a.startsWith('--out='))?.slice(6)
  const maxPages = Number(args.find((a) => a.startsWith('--max-pages='))?.slice(12) ?? 120)
  const publishers = args.filter((a) => !a.startsWith('--'))
  const targets = publishers.length ? publishers : ['Waneko', 'Studio JG', 'Fantastica', 'Kotori', 'Dango', 'Hanami']

  const all: ParsedVolume[] = []
  for (const publisher of targets) {
    console.log(`\n=== ${publisher} ===`)
    const bibs = await fetchPublisher(publisher, maxPages)
    const parsed = bibs.map(parseBib).filter((v): v is ParsedVolume => v !== null && v.isManga)
    all.push(...parsed)

    const withVol = parsed.filter((v) => v.volume !== null)
    const withIsbn = parsed.filter((v) => v.isbn)
    const withPrice = parsed.filter((v) => v.coverPrice !== null)
    const withOrig = parsed.filter((v) => v.originalTitle)
    const withMonth = parsed.filter((v) => v.month !== null)

    // seria = wydawca + znormalizowany tytuł; pomijamy wydania specjalne w liczeniu luk
    const series = new Map<string, ParsedVolume[]>()
    for (const v of parsed) {
      // klucz serii: znormalizowany tytuł polski (tytuł oryginału bywa zapisany różnie w kolejnych tomach)
      const key = norm(v.seriesTitle)
      if (!series.has(key)) series.set(key, [])
      series.get(key)!.push(v)
    }
    let seriesWithGaps = 0
    let seriesWithDupes = 0
    const rows: { title: string; orig: string | null; nums: number[]; gaps: number[]; dupes: number; priceMin: number | null; priceMax: number | null; years: string }[] = []
    for (const [, vols] of series) {
      const numbered = vols.filter((v) => v.volume !== null && !v.special)
      const nums = [...new Set(numbered.map((v) => v.volume as number))].sort((a, b) => a - b)
      const dupes = numbered.length - nums.length
      const gaps: number[] = []
      if (nums.length) for (let i = 1; i <= nums[nums.length - 1]; i++) if (!nums.includes(i)) gaps.push(i)
      if (gaps.length) seriesWithGaps++
      if (dupes) seriesWithDupes++
      const prices = vols.map((v) => v.coverPrice).filter((p): p is number => p !== null)
      const years = vols.map((v) => v.year).filter((y): y is number => y !== null)
      rows.push({
        title: mostCommon(vols.map((v) => v.seriesTitle)),
        orig: vols.find((v) => v.originalTitle)?.originalTitle ?? null,
        nums,
        gaps,
        dupes,
        priceMin: prices.length ? Math.min(...prices) : null,
        priceMax: prices.length ? Math.max(...prices) : null,
        years: years.length ? `${Math.min(...years)}-${Math.max(...years)}` : '-',
      })
    }

    console.log(
      `rekordów BN (wszystkie książki wydawcy): ${bibs.length}, uznanych za mangę/komiks z Azji: ${parsed.length}, serii: ${series.size}`
    )
    console.log(
      `numer tomu: ${pct(withVol.length, parsed.length)} | ISBN-13: ${pct(withIsbn.length, parsed.length)} (z pola $z: ${withIsbn.filter((v) => v.isbnSource === 'z').length}) | cena okładkowa: ${pct(withPrice.length, parsed.length)} | tytuł oryginału: ${pct(withOrig.length, parsed.length)} | miesiąc: ${pct(withMonth.length, parsed.length)}`
    )
    console.log(`serie z lukami w numeracji: ${seriesWithGaps}/${series.size}, z dubletami numerów (dodruki): ${seriesWithDupes}/${series.size}`)
    console.log('największe serie:')
    for (const r of rows.sort((a, b) => b.nums.length - a.nums.length).slice(0, 8)) {
      const price = r.priceMin === null ? 'brak ceny' : r.priceMin === r.priceMax ? `${r.priceMin} zł` : `${r.priceMin}-${r.priceMax} zł`
      console.log(
        `  ${r.title}${r.orig ? ` (${r.orig})` : ''}: tomy ${compress(r.nums)}${r.gaps.length ? ` | brak: ${compress(r.gaps.slice(0, 20))}` : ''} | ${price} | ${r.years}`
      )
    }
  }

  if (out) {
    writeFileSync(out, JSON.stringify(all, null, 2))
    console.log(`\nZapisano ${all.length} rekordów do ${out}`)
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
