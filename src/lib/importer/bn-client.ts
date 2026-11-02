import type { BnBib } from './bn-parser'

const API = 'https://data.bn.org.pl/api/institutions/bibs.json'
export const BN_PAGE_SIZE = 100

/**
 * Strumienie zapytań do API. Każdy ma własny kursor (sinceId), więc kolejne uruchomienia
 * pobierają tylko nowe rekordy. Gatunek "Komiks" łączymy z językiem oryginału, bo wiele
 * mang (np. One Piece) nie ma w BN gatunku "Manga".
 */
export const BN_STREAMS: { id: string; params: Record<string, string> }[] = [
  { id: 'manga', params: { genre: 'Manga' } },
  { id: 'manhwa', params: { genre: 'Manhwa' } },
  { id: 'manhua', params: { genre: 'Manhua' } },
  { id: 'komiks-jpn', params: { genre: 'Komiks', languageOfOriginal: 'japonski' } },
  { id: 'komiks-kor', params: { genre: 'Komiks', languageOfOriginal: 'koreanski' } },
  { id: 'komiks-chi', params: { genre: 'Komiks', languageOfOriginal: 'chinski' } },
]

export interface BnPage {
  bibs: BnBib[]
  /** Wartość sinceId dla następnej strony albo null, gdy to ostatnia strona. */
  nextSinceId: number | null
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

export async function fetchBnPage(params: Record<string, string>, sinceId: number): Promise<BnPage> {
  const query = new URLSearchParams({ ...params, limit: String(BN_PAGE_SIZE) })
  if (sinceId > 0) query.set('sinceId', String(sinceId))
  const url = `${API}?${query}`

  let lastError: unknown
  for (let attempt = 0; attempt < 4; attempt++) {
    try {
      const res = await fetch(url, {
        headers: { 'User-Agent': 'MangOwO-importer (manga catalog; contact via site)' },
        signal: AbortSignal.timeout(60_000),
      })
      if (res.status === 429 || res.status >= 500) throw new Error(`BN API ${res.status}`)
      if (!res.ok) throw new Error(`BN API ${res.status} dla ${url}`)
      const json = (await res.json()) as { bibs?: BnBib[]; nextPage?: string }
      const bibs = json.bibs ?? []
      let nextSinceId: number | null = null
      if (json.nextPage && bibs.length > 0) {
        const next = Number(new URL(json.nextPage).searchParams.get('sinceId'))
        nextSinceId = Number.isFinite(next) && next > sinceId ? next : null
      }
      return { bibs, nextSinceId }
    } catch (error) {
      lastError = error
      await sleep(1000 * 2 ** attempt)
    }
  }
  throw lastError instanceof Error ? lastError : new Error('Nie udało się pobrać danych z BN')
}
