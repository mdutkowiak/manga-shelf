const NEUTRAL_PLACEHOLDER = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="300" height="450" viewBox="0 0 300 450"><rect width="300" height="450" fill="%230f172a"/><g fill="%23475569" transform="translate(110, 175)"><path d="M40 0H10C4.48 0 0 4.48 0 10v60c0 5.52 4.48 10 10 10h30c5.52 0 10-4.48 10-10V10c0-5.52-4.48-10-10-10zm-4 66H14c-2.21 0-4-1.79-4-4V14c0-2.21 1.79-4 4-4h22c2.21 0 4 1.79 4 4v48c0 2.21-1.79 4-4 4z"/><circle cx="25" cy="40" r="10"/></g><text x="50%" y="65%" dominant-baseline="middle" text-anchor="middle" fill="%2364748b" font-family="system-ui,sans-serif" font-size="14" font-weight="600">Brak okładki</text></svg>`

export function getCoverUrl(url: string | null | undefined): string {
  if (!url) return NEUTRAL_PLACEHOLDER
  if (url.startsWith('/api/covers') || url.startsWith('data:')) return url
  return `/api/covers?url=${encodeURIComponent(url)}`
}


/** Hosty serwisów z okładkami wydań japońskich i międzynarodowych (nie są polskim wydaniem). */
const FOREIGN_COVER_HOSTS = ['anilist.co', 'mangadex.org', 'myanimelist.net', 'cdn.myanimelist.net']

/** Czy adres okładki wskazuje na AniList/MangaDex/MAL, czyli nie na polskie wydanie. */
export function isForeignCover(url: string | null | undefined): boolean {
  if (!url) return false
  try {
    const host = new URL(url, 'http://local').hostname.toLowerCase()
    return FOREIGN_COVER_HOSTS.some((h) => host === h || host.endsWith('.' + h))
  } catch {
    return false
  }
}

/**
 * Okładka tomu ustawiona z polskiego źródła. Okładka zagraniczna (AniList/MangaDex) liczy się tylko wtedy,
 * gdy seria nie ma żadnej polskiej okładki, bo inaczej przykrywałaby okładkę serii.
 */
export function pickVolumeCover(
  candidates: (string | null | undefined)[],
  seriesHasPolishCover: boolean
): string | null {
  const present = candidates.filter((c): c is string => Boolean(c && c.trim()))
  const polish = present.find((c) => !isForeignCover(c))
  if (polish) return polish
  return seriesHasPolishCover ? null : present[0] || null
}
