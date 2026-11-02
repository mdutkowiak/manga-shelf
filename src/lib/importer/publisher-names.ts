// Sprowadzanie niespójnych nazw wydawców z Biblioteki Narodowej do jednej nazwy.
// Znani wydawcy mają stałe nazwy; nieznani dostają nazwę oczyszczoną z przedrostków i form prawnych.

const KNOWN_PUBLISHERS: { name: string; test: RegExp }[] = [
  { name: 'Waneko', test: /waneko/i },
  { name: 'Studio JG', test: /studio\s*j\.?\s*g\b|\bsjg\b/i },
  { name: 'J.P.Fantastica', test: /fantastica|\bj\.?\s?p\.?\s?f\b|japonica\s+polonica/i },
  { name: 'Kotori', test: /kotori/i },
  { name: 'Dango', test: /\bdango\b/i },
  { name: 'Hanami', test: /\bhanami\b/i },
]

const JUNK =
  /^(s\.?\s*n\.?|b\.?\s*w\.?|brak|nieznany|wydawca nieznany|nakładem autora|nakładem własnym|własnym nakładem|ilustracje|il\.?|ilustr\.?|fotografie|mapy|tabele|rysunki|portrety)$/i
const LEGAL_FORMS = /\b(sp\.?\s*z\s*o\.?\s*o\.?|sp\.?\s*k\.?|sp\.?\s*j\.?|s\.?\s*c\.?|s\.?\s*a\.?)(?=\s|$|,)/gi
const PREFIXES = /^(wydawnictwo|wyd\.?|oficyna wydawnicza|oficyna|agencja wydawnicza|dom wydawniczy)\s+/i

/** Klucz do porównywania nazw: małe litery, bez polskich znaków i interpunkcji. */
export function publisherKey(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/ł/g, 'l')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

/** Klucz niezależny od kolejności słów ("Story House Egmont" i "Story Egmont House" to ten sam wydawca). */
export function publisherMatchKey(name: string): string {
  return publisherKey(name).split(' ').sort().join(' ')
}

/** Zwraca nazwę wydawcy do wyświetlania albo null, gdy zapis jest pusty lub nic nie znaczy ("[s.n.]"). */
export function canonicalPublisherName(raw: string | null | undefined): string | null {
  const input = (raw ?? '').replace(/\s+/g, ' ').trim()
  if (!input) return null

  const known = KNOWN_PUBLISHERS.find((p) => p.test.test(input))
  if (known) return known.name

  let name = input
    .replace(/[\[\]()"„”“]/g, '')
    .replace(/[\s,;:./]+$/g, '')
    .trim()
  if (JUNK.test(name)) return null

  name = name.replace(PREFIXES, '').replace(LEGAL_FORMS, '').replace(/[\s,;:./]+$/g, '').trim()

  // "Nazwa Nazwa" -> "Nazwa" (BN często powtarza nazwę wydawcy)
  const words = name.split(' ')
  const deduped = words.filter((w, i) => i === 0 || w.toLowerCase() !== words[i - 1].toLowerCase())
  name = deduped.join(' ').trim()

  if (name.length < 2 || JUNK.test(name)) return null
  return name
}

/** Czy to jeden z wydawców, których znamy z góry (nie wymagają sprawdzenia przez admina). */
export function isKnownPublisher(name: string): boolean {
  return KNOWN_PUBLISHERS.some((p) => p.name === name)
}
