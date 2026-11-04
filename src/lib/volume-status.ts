/**
 * Posiadanie i przeczytanie to dwie niezależne cechy tomu:
 *  - `status` opisuje posiadanie: OWNED, WISHLIST, ORDERED, PREORDER albo NONE (brak),
 *  - `read` (i `readAt`) mówi, czy tom został przeczytany, także gdy go nie posiadamy.
 * Dawny status `READ` oznaczał „posiadany i przeczytany”. Nadal jest poprawnie rozumiany, a przy wczytaniu
 * i zapisie zamieniany na OWNED + read (`normalizeLegacyVolume`).
 */
export interface VolumeStateLike {
  status?: string | null
  read?: boolean | null
  /** Nazwa pola w odpowiedziach serwera (UserCollection.isRead). */
  isRead?: boolean | null
}

export function isOwnedVolume(v: VolumeStateLike): boolean {
  return v.status === 'OWNED' || v.status === 'READ'
}

export function isReadVolume(v: VolumeStateLike): boolean {
  return Boolean(v.read) || Boolean(v.isRead) || v.status === 'READ'
}

/** Tom, który coś znaczy dla użytkownika (posiadany, na liście życzeń, zamówiony lub przeczytany). */
export function isTrackedVolume(v: VolumeStateLike): boolean {
  return Boolean(v.status && v.status !== 'NONE') || isReadVolume(v)
}

/** Zamienia dawny status READ na OWNED + read. Inne wartości zostają bez zmian. */
export function normalizeLegacyVolume<T extends { status?: string | null; read?: boolean | null }>(v: T): T {
  if (v.status === 'READ') return { ...v, status: 'OWNED', read: true }
  return v
}
