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

// Subseries / prequel / spin-off tag extractor
export function extractSubseriesTag(title?: string | null): string {
  if (!title) return ''
  const t = title.toLowerCase().trim()

  // 1. Check for Tom 0 / Zero / 00 (e.g. Jujutsu Kaisen 0, Fate/Zero)
  if (/\b(0|zero|00)\b/.test(t)) {
    return 'zero'
  }

  // 2. Check for :re / re: / re (e.g. Tokyo Ghoul:re)
  if (/(\b|:)re(\b|$)/.test(t)) {
    return 're'
  }

  // 3. Specific subseries & spin-off keywords (e.g. "Attack on Titan: Before the Fall", "MHA: Vigilantes", "Solo Leveling: Ragnarok")
  const keywords = [
    'ragnarok',
    'shippuden',
    'boruto',
    'vigilantes',
    'gaiden',
    'side story',
    'side stories',
    'spin off',
    'spinoff',
    'anthology',
    'fanbook',
    'official fanbook',
    'buddy stories',
    'before the fall',
    'no regrets',
    'lost girls',
    'junior high',
    'light novel',
    'short stories',
    'school briefs',
  ]
  for (const kw of keywords) {
    if (t.includes(kw)) {
      return kw.replace(/\s+/g, '-')
    }
  }

  return ''
}

// Canonical alias patterns (for cross-language titles: Romaji <-> English <-> Polish)
const ALIAS_RULES: Array<{ match: string[]; canonical: string }> = [
  {
    match: [
      'kaoru hana wa rin to saku',
      'kaoru hana',
      'the fragrant flower blooms with dignity',
      'fragrant flower',
      'kaoru i rin rozkwitajac z toba',
      'kaoru i rin',
      'rozkwitajac z toba',
      'kaoruhanawarintosaku',
      'thefragrantflower',
    ],
    canonical: 'kaoru-hana-wa-rin-to-saku',
  },
  {
    match: [
      'sono bisque doll wa koi wo suru',
      'sono bisque doll',
      'my dress up darling',
      'my dress-up darling',
      'projekt cosplay',
      'bisque doll',
    ],
    canonical: 'sono-bisque-doll',
  },
  {
    match: [
      'haitatsusaki wa buchou',
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
      'kuchibiru ni kimi no kaori',
      'kuchibiru ni kimi',
      'barwa twoich ust',
      'kuchibirunikiminointro',
    ],
    canonical: 'kuchibiru-ni-kimi',
  },
  {
    match: [
      'tonari no kanata',
      'tonari no furi renai',
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
    match: ['oshi no ko', 'moje gwiazdy'],
    canonical: 'oshi-no-ko',
  },
  {
    match: ['spy x family', 'spyxfamily', 'spy family'],
    canonical: 'spy-x-family',
  },
  {
    match: ['jujutsu kaisen', 'jujutsu-kaisen', 'jujutsukaisen', 'czary i walka'],
    canonical: 'jujutsu-kaisen',
  },
  {
    match: [
      'seihantai na kimi to boku',
      'you and i are polar opposites',
      'ty i ja na przeciwleglych biegunach',
      'ty i ja na przeciwległych biegunach',
      'przeciwienstwa sie przyciagaja',
      'przeciwieństwa się przyciągają',
      'przeciwienstwa sie przyciagaja!',
      'przeciwieństwa się przyciągają!',
    ],
    canonical: 'seihantai-na-kimi-to-boku',
  },
  {
    match: [
      'solo leveling',
      'na honjaman level up',
      'only i level up',
    ],
    canonical: 'solo-leveling',
  },
  {
    match: [
      'chainsaw man',
      'chainsaw-man',
      'chainsawman',
      'czlowiek pilarka',
      'człowiek pilarka',
    ],
    canonical: 'chainsaw-man',
  },
]

// In-memory dynamic aliases registered from database / API
const dynamicAliases = new Map<string, string>()

export function registerDynamicAlias(phrase: string, canonical: string) {
  const clean = cleanTitleString(phrase)
  if (clean && clean.length >= 2 && canonical) {
    dynamicAliases.set(clean, canonical)
  }
}

export function getDynamicAliases(): Map<string, string> {
  return dynamicAliases
}

/**
 * Normalizes any manga title (Romaji, English, or Polish) into a canonical key.
 * Preserves distinct subseries, volume 0, and spin-off tags so they are never merged into the parent series.
 */
export function normalizeTitleKey(t: string | null | undefined): string {
  if (!t) return ''
  const clean = cleanTitleString(t)
  if (!clean || clean.length < 2) return ''

  const subTag = extractSubseriesTag(t)

  // Extract base title before subtitles (e.g. "Jujutsu Kaisen 0: Tokyo..." -> "Jujutsu Kaisen 0")
  const mainPart = t.split(/[:\-–—]/)[0]?.trim() || t
  const cleanMain = cleanTitleString(mainPart)

  // 1. Check dynamic aliases registered from database overrides at runtime
  if (dynamicAliases.has(clean)) {
    const canon = dynamicAliases.get(clean)!
    return subTag ? `${canon}--sub-${subTag}` : canon
  }
  if (cleanMain && dynamicAliases.has(cleanMain)) {
    const canon = dynamicAliases.get(cleanMain)!
    return subTag ? `${canon}--sub-${subTag}` : canon
  }

  // 2. Check built-in canonical alias rules
  for (const rule of ALIAS_RULES) {
    for (const phrase of rule.match) {
      const cleanPhrase = cleanTitleString(phrase)
      // Strict guard: clean phrase must be valid and at least 3 characters long
      if (!cleanPhrase || cleanPhrase.length < 3) continue

      // Match exact equality or whole-word prefix with space delimiter
      if (
        clean === cleanPhrase ||
        cleanMain === cleanPhrase ||
        clean.startsWith(cleanPhrase + ' ') ||
        cleanMain.startsWith(cleanPhrase + ' ')
      ) {
        return subTag ? `${rule.canonical}--sub-${subTag}` : rule.canonical
      }
    }
  }

  const baseKey = (cleanMain || clean).replace(/\s+/g, '-')
  return subTag ? `${baseKey}--sub-${subTag}` : baseKey
}

/**
 * Determines whether two series references represent the same manga series,
 * checking database IDs, Anilist IDs, Romaji titles, English titles, and Polish titles.
 * Distinct subseries (e.g. Jujutsu Kaisen vs Jujutsu Kaisen 0) will NEVER be treated as the same series.
 */
export function areSameSeries(
  a: { id?: string | null; mangaId?: string | null; title?: string | null; polishTitle?: string | null } | null | undefined,
  b: { id?: string | null; mangaId?: string | null; title?: string | null; polishTitle?: string | null } | null | undefined
): boolean {
  if (!a || !b) return false

  // 1. If BOTH items have distinct numeric AniList IDs -> they are mathematically separate works!
  const aAni = (a.id && /^\d+$/.test(a.id)) ? a.id : (a.mangaId && /^\d+$/.test(a.mangaId)) ? a.mangaId : null
  const bAni = (b.id && /^\d+$/.test(b.id)) ? b.id : (b.mangaId && /^\d+$/.test(b.mangaId)) ? b.mangaId : null
  if (aAni && bAni && aAni !== bAni) {
    return false
  }

  // 2. Direct ID matches (cuid, uuid, or matching numeric anilistId)
  if (a.id && b.id && a.id === b.id) return true
  if (a.mangaId && b.mangaId && a.mangaId === b.mangaId) return true
  if (a.id && b.mangaId && a.id === b.mangaId) return true
  if (a.mangaId && b.id && a.mangaId === b.id) return true

  // 3. Subseries disparity check: if one is a prequel / Tom 0 / spin-off and the other is not -> separate series!
  const subA = extractSubseriesTag(a.title || '') || extractSubseriesTag(a.polishTitle || '')
  const subB = extractSubseriesTag(b.title || '') || extractSubseriesTag(b.polishTitle || '')
  if (subA !== subB) {
    return false
  }

  // 4. Normalized Title match (canonical alias or exact slug match)
  const aNorm = a.title ? normalizeTitleKey(a.title) : ''
  const bNorm = b.title ? normalizeTitleKey(b.title) : ''
  if (aNorm && bNorm && aNorm === bNorm) return true

  // 5. Polish Title cross-matches
  const aPol = a.polishTitle ? normalizeTitleKey(a.polishTitle) : ''
  const bPol = b.polishTitle ? normalizeTitleKey(b.polishTitle) : ''
  if (aPol && bPol && aPol === bPol) return true
  if (aPol && bNorm && aPol === bNorm) return true
  if (aNorm && bPol && aNorm === bPol) return true

  // 6. Main title before subtitle exact match when subseries tags match
  if (subA === subB) {
    const aMain = (a.title || '').split(/[:\-–—]/)[0]?.trim() || ''
    const bMain = (b.title || '').split(/[:\-–—]/)[0]?.trim() || ''
    const aMainClean = cleanTitleString(aMain)
    const bMainClean = cleanTitleString(bMain)
    if (aMainClean && bMainClean && aMainClean.length >= 4 && aMainClean === bMainClean) {
      return true
    }
  }

  return false
}

/**
 * Formats volume numbers with proper Polish grammatical declension:
 * 1 tom, 2-4 tomy, 5-21 tomów, 22-24 tomy...
 */
export function formatVolumeCount(count: number): string {
  if (count === 1) return '1 tom'
  const abs = Math.abs(count)
  const mod10 = abs % 10
  const mod100 = abs % 100
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) {
    return `${count} tomy`
  }
  return `${count} tomów`
}
