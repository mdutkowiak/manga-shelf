// Title normalization, alias mapping, and series equivalence helpers

export function cleanTitleString(str: string): string {
  if (!str) return ''
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // remove diacritics / Polish accents (ą, ć, ę, ł, ń, ó, ś, ź, ż)
    .replace(/[^a-z0-9]/g, ' ')
    .trim()
    .replace(/\s+/g, ' ')
}

// Canonical alias patterns
const ALIAS_RULES: Array<{ match: string[]; canonical: string }> = [
  {
    match: [
      'kaoru hana',
      'the fragrant flower blooms with dignity',
      'fragrant flower',
      'kaoru i rin',
      'rozkwitajac z toba',
      'kaoruhanawarintosaku',
      'thefragrantflower',
    ],
    canonical: 'kaoru-hana-wa-rin-to-saku',
  },
  {
    match: [
      'sono bisque doll',
      'my dress up darling',
      'my dress-up darling',
      'projekt cosplay',
      'projekt: cosplay',
      'bisque doll',
    ],
    canonical: 'sono-bisque-doll',
  },
  {
    match: [
      'haitatsu saki',
      'haitatsu-saki',
      'haitatsusaki',
      'milosc na dowoz',
      'milosc na dowóz',
    ],
    canonical: 'haitatsu-saki',
  },
  {
    match: [
      'kuchibiru ni kimi',
      'barwa twoich ust',
      'kuchibirunikiminointro',
    ],
    canonical: 'kuchibiru-ni-kimi',
  },
  {
    match: [
      'tonari no kanata',
      'tak blisko tak daleko',
      'tak blisko, tak daleko',
    ],
    canonical: 'tonari-no-kanata',
  },
  {
    match: [
      'shingeki no kyojin',
      'attack on titan',
      'atak tytanow',
      'atak tytanów',
    ],
    canonical: 'attack-on-titan',
  },
  {
    match: [
      'kimetsu no yaiba',
      'demon slayer',
      'miecz zabojcy demonow',
      'miecz zabójcy demonów',
    ],
    canonical: 'demon-slayer',
  },
  {
    match: ['chainsaw man', 'chainsawman'],
    canonical: 'chainsaw-man',
  },
  {
    match: ['jujutsu kaisen'],
    canonical: 'jujutsu-kaisen',
  },
  {
    match: ['one piece'],
    canonical: 'one-piece',
  },
  {
    match: ['bleach'],
    canonical: 'bleach',
  },
  {
    match: ['oshi no ko', 'moje gwiazdy'],
    canonical: 'oshi-no-ko',
  },
  {
    match: ['spy x family', 'spyxfamily', 'spy family'],
    canonical: 'spy-x-family',
  },
  {
    match: ['frieren'],
    canonical: 'frieren',
  },
  {
    match: ['sakamoto days'],
    canonical: 'sakamoto-days',
  },
  {
    match: ['dandadan'],
    canonical: 'dandadan',
  },
  {
    match: ['solo leveling'],
    canonical: 'solo-leveling',
  },
  {
    match: ['tokyo ghoul'],
    canonical: 'tokyo-ghoul',
  },
  {
    match: ['berserk'],
    canonical: 'berserk',
  },
]

/**
 * Normalizes any manga title (Romaji, English, or Polish) into a canonical key
 */
export function normalizeTitleKey(t: string | null | undefined): string {
  if (!t) return ''
  const clean = cleanTitleString(t)
  if (!clean) return ''

  for (const rule of ALIAS_RULES) {
    for (const phrase of rule.match) {
      const cleanPhrase = cleanTitleString(phrase)
      if (clean.includes(cleanPhrase)) {
        return rule.canonical
      }
    }
  }

  // General fallback: return continuous lowercase alphanumeric string
  return clean.replace(/\s+/g, '')
}

/**
 * Determines whether two series references represent the same manga series,
 * checking database IDs, Anilist IDs, Romaji titles, English titles, and Polish titles.
 */
export function areSameSeries(
  a: { id?: string | null; mangaId?: string | null; title?: string | null; polishTitle?: string | null } | null | undefined,
  b: { id?: string | null; mangaId?: string | null; title?: string | null; polishTitle?: string | null } | null | undefined
): boolean {
  if (!a || !b) return false

  // 1. Direct ID matches (cuid, uuid, or numeric anilistId)
  if (a.id && b.id && a.id === b.id) return true
  if (a.mangaId && b.mangaId && a.mangaId === b.mangaId) return true
  if (a.id && b.mangaId && a.id === b.mangaId) return true
  if (a.mangaId && b.id && a.mangaId === b.id) return true

  // 2. Normalized Title match
  const aNorm = a.title ? normalizeTitleKey(a.title) : ''
  const bNorm = b.title ? normalizeTitleKey(b.title) : ''
  if (aNorm && bNorm && aNorm === bNorm) return true

  // 3. Polish Title cross-matches
  const aPol = a.polishTitle ? normalizeTitleKey(a.polishTitle) : ''
  const bPol = b.polishTitle ? normalizeTitleKey(b.polishTitle) : ''
  if (aPol && bPol && aPol === bPol) return true
  if (aPol && bNorm && aPol === bNorm) return true
  if (aNorm && bPol && aNorm === bPol) return true

  return false
}
