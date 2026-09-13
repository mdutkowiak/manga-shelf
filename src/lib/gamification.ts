import type { CollectionSeriesItem } from '@/lib/collection-store'

export interface RankTier {
  minLevel: number
  maxLevel: number
  minXP: number
  maxXP: number
  title: string
  badgeIcon: string
  color: string
  bgGradient: string
  borderColor: string
  textColor: string
  description: string
}

export const RANK_TIERS: RankTier[] = [
  {
    minLevel: 1,
    maxLevel: 5,
    minXP: 0,
    maxXP: 249,
    title: 'Nowicjusz Mangi',
    badgeIcon: '🌱',
    color: 'emerald',
    bgGradient: 'from-emerald-950/60 to-emerald-900/30',
    borderColor: 'border-emerald-500/40',
    textColor: 'text-emerald-400',
    description: 'Pierwsze tomy zasilają domowy regał. Początek wielkiej przygody!',
  },
  {
    minLevel: 6,
    maxLevel: 10,
    minXP: 250,
    maxXP: 599,
    title: 'Młody Czytelnik',
    badgeIcon: '📘',
    color: 'blue',
    bgGradient: 'from-blue-950/60 to-cyan-900/30',
    borderColor: 'border-blue-500/40',
    textColor: 'text-blue-400',
    description: 'Systematyczne czytanie i poznawanie pierwszych mangowych uniwersów.',
  },
  {
    minLevel: 11,
    maxLevel: 15,
    minXP: 600,
    maxXP: 1199,
    title: 'Pasjonat Kadru',
    badgeIcon: '⚡',
    color: 'cyan',
    bgGradient: 'from-cyan-950/60 to-purple-900/30',
    borderColor: 'border-cyan-500/40',
    textColor: 'text-cyan-300',
    description: 'Regularne zakupy i śledzenie cotygodniowych zapowiedzi tomów.',
  },
  {
    minLevel: 16,
    maxLevel: 20,
    minXP: 1200,
    maxXP: 1999,
    title: 'Tropiciel Nowości',
    badgeIcon: '🎯',
    color: 'amber',
    bgGradient: 'from-amber-950/60 to-amber-900/30',
    borderColor: 'border-amber-500/40',
    textColor: 'text-amber-400',
    description: 'Żadna premiera nie umknie Twojej uwadze. Preordery składane w locie!',
  },
  {
    minLevel: 21,
    maxLevel: 25,
    minXP: 2000,
    maxXP: 3199,
    title: 'Znawca Regałów',
    badgeIcon: '📚',
    color: 'indigo',
    bgGradient: 'from-indigo-950/60 to-purple-900/30',
    borderColor: 'border-indigo-500/50',
    textColor: 'text-indigo-300',
    description: 'Doskonałe rozeznanie w formatach wydań, obwolutach i liniach wydawniczych.',
  },
  {
    minLevel: 26,
    maxLevel: 30,
    minXP: 3200,
    maxXP: 4799,
    title: 'Poszukiwacz Wydań',
    badgeIcon: '🧭',
    color: 'violet',
    bgGradient: 'from-violet-950/60 to-fuchsia-900/30',
    borderColor: 'border-violet-500/50',
    textColor: 'text-violet-300',
    description: 'Polowanie na białe kruki i wyprzedane tomy staje się codzienną sztuką.',
  },
  {
    minLevel: 31,
    maxLevel: 37,
    minXP: 4800,
    maxXP: 6999,
    title: 'Strażnik Kolekcji',
    badgeIcon: '💎',
    color: 'purple',
    bgGradient: 'from-purple-950/60 to-indigo-900/30',
    borderColor: 'border-purple-500/50',
    textColor: 'text-purple-300',
    description: 'Dziesiątki przeczytanych tomów ułożone z aptekarską precyzją.',
  },
  {
    minLevel: 38,
    maxLevel: 44,
    minXP: 7000,
    maxXP: 9999,
    title: 'Obrońca Woluminów',
    badgeIcon: '🛡️',
    color: 'sky',
    bgGradient: 'from-sky-950/60 to-blue-900/30',
    borderColor: 'border-sky-500/50',
    textColor: 'text-sky-300',
    description: 'Troskliwa ochrona grzbietów przed promieniami słońca i wilgocią.',
  },
  {
    minLevel: 45,
    maxLevel: 52,
    minXP: 10000,
    maxXP: 13999,
    title: 'Kustosz Biblioteki',
    badgeIcon: '🏛️',
    color: 'teal',
    bgGradient: 'from-teal-950/60 to-emerald-900/30',
    borderColor: 'border-teal-500/50',
    textColor: 'text-teal-300',
    description: 'Twój pokój zaczyna przypominać profesjonalną bibliotekę w Tokio.',
  },
  {
    minLevel: 53,
    maxLevel: 60,
    minXP: 14000,
    maxXP: 18999,
    title: 'Mistrz Archiwum',
    badgeIcon: '🔮',
    color: 'fuchsia',
    bgGradient: 'from-fuchsia-950/60 to-purple-950/40',
    borderColor: 'border-fuchsia-500/50',
    textColor: 'text-fuchsia-300',
    description: 'Bezbłędna pamięć do autorów, dat wydań i numerów ISBN.',
  },
  {
    minLevel: 61,
    maxLevel: 70,
    minXP: 19000,
    maxXP: 25999,
    title: 'Magnat Mangowy',
    badgeIcon: '👑',
    color: 'pink',
    bgGradient: 'from-pink-950/60 to-rose-950/40',
    borderColor: 'border-pink-500/50',
    textColor: 'text-pink-300',
    description: 'Setki tomów, ukończone serie i статус prawdziwego arystokraty mangi.',
  },
  {
    minLevel: 71,
    maxLevel: 80,
    minXP: 26000,
    maxXP: 35999,
    title: 'Tytan Kolekcjonerstwa',
    badgeIcon: '⚡',
    color: 'amber',
    bgGradient: 'from-amber-950/70 to-orange-950/40',
    borderColor: 'border-amber-500/60',
    textColor: 'text-amber-300',
    description: 'Potęga kolekcji budząca podziw i szacunek każdego gościa.',
  },
  {
    minLevel: 81,
    maxLevel: 90,
    minXP: 36000,
    maxXP: 49999,
    title: 'Władca Półek',
    badgeIcon: '🌌',
    color: 'purple',
    bgGradient: 'from-purple-950/80 to-blue-950/50',
    borderColor: 'border-purple-400/60',
    textColor: 'text-purple-200',
    description: 'Półki uginają się pod ciężarem arcydzieł komiksu japońskiego.',
  },
  {
    minLevel: 91,
    maxLevel: 99,
    minXP: 50000,
    maxXP: 74999,
    title: 'Żywa Legenda Otaku',
    badgeIcon: '🐲',
    color: 'rose',
    bgGradient: 'from-rose-950/80 to-amber-950/60',
    borderColor: 'border-rose-500/70',
    textColor: 'text-rose-300',
    description: 'Autorytet w społeczności. Człowiek, który przeczytał wszystko.',
  },
  {
    minLevel: 100,
    maxLevel: 110,
    minXP: 75000,
    maxXP: 99999,
    title: 'Boski Demiurg Mangi',
    badgeIcon: '☀️',
    color: 'yellow',
    bgGradient: 'from-yellow-950/80 via-amber-900/50 to-orange-950/60',
    borderColor: 'border-yellow-400/80',
    textColor: 'text-yellow-300',
    description: 'Poziom 100 osiągnięty! Istota ponadczasowa, serce całej mangowej kultury.',
  },
  {
    minLevel: 111,
    maxLevel: 999,
    minXP: 100000,
    maxXP: 9999999,
    title: 'Nieskończony Asceta',
    badgeIcon: '♾️',
    color: 'cyan',
    bgGradient: 'from-cyan-950/90 via-purple-950/60 to-pink-950/80',
    borderColor: 'border-cyan-400/80',
    textColor: 'text-cyan-200',
    description: 'Przekroczono wszelkie granice ziemskich kolekcji. Wieczna chwała!',
  },
]

export interface XPActivity {
  id: string
  action: string
  xp: number
  date: string
}

export function getRankTier(xp: number): RankTier {
  const tier = RANK_TIERS.find((t) => xp >= t.minXP && xp <= t.maxXP)
  return tier || RANK_TIERS[RANK_TIERS.length - 1]
}

export function calculateLevel(xp: number): number {
  if (xp <= 0) return 1
  for (const tier of RANK_TIERS) {
    if (xp >= tier.minXP && xp <= tier.maxXP) {
      const levelSpan = tier.maxLevel - tier.minLevel + 1
      const xpSpan = tier.maxXP - tier.minXP + 1
      const progressRatio = (xp - tier.minXP) / xpSpan
      return Math.min(tier.maxLevel, tier.minLevel + Math.floor(progressRatio * levelSpan))
    }
  }
  return 111 + Math.floor((xp - 100000) / 2500)
}

export function getLevelProgress(xp: number) {
  const currentTier = getRankTier(xp)
  const range = currentTier.maxXP - currentTier.minXP + 1
  const progressInTier = Math.max(0, xp - currentTier.minXP)
  const percentage = Math.min(100, Math.round((progressInTier / range) * 100))
  const remainingXP = Math.max(0, currentTier.maxXP + 1 - xp)

  return {
    currentTier,
    percentage,
    remainingXP,
    nextXP: currentTier.maxXP + 1,
  }
}

// ==========================================
// ACHIEVEMENTS SYSTEM (16 Badges)
// ==========================================
export interface AchievementDef {
  id: string
  title: string
  description: string
  icon: string
  category: 'collection' | 'reading' | 'curation' | 'mastery'
  target: number
  unit: string
  xpReward: number
}

export const ACHIEVEMENTS: AchievementDef[] = [
  {
    id: 'first_step',
    title: 'Pierwszy Krok',
    description: 'Dodaj swój pierwszy tom do kolekcji.',
    icon: '🏁',
    category: 'collection',
    target: 1,
    unit: 'tom',
    xpReward: 30,
  },
  {
    id: 'bookshelf_starter',
    title: 'Pierwszy Regalik',
    description: 'Zgromadź co najmniej 10 tomów na swojej półce.',
    icon: '📚',
    category: 'collection',
    target: 10,
    unit: 'tomów',
    xpReward: 75,
  },
  {
    id: 'serious_collector',
    title: 'Poważny Zbiór',
    description: 'Posiadaj minimum 50 tomów w domowej bibliotece.',
    icon: '🏰',
    category: 'collection',
    target: 50,
    unit: 'tomów',
    xpReward: 150,
  },
  {
    id: 'centurion',
    title: 'Centurion Mangi',
    description: 'Przekrocz barierę 100 posiadanych tomów!',
    icon: '🏛️',
    category: 'collection',
    target: 100,
    unit: 'tomów',
    xpReward: 300,
  },
  {
    id: 'manga_hoarder',
    title: 'Skarbiec Smoka',
    description: 'Zgromadź imponującą kolekcję 250 tomów.',
    icon: '🐲',
    category: 'collection',
    target: 250,
    unit: 'tomów',
    xpReward: 600,
  },
  {
    id: 'bookworm',
    title: 'Mól Książkowy',
    description: 'Oznacz przynajmniej 10 tomów jako przeczytane.',
    icon: '🐛',
    category: 'reading',
    target: 10,
    unit: 'tomów',
    xpReward: 50,
  },
  {
    id: 'avid_reader',
    title: 'Pochłaniacz Stron',
    description: 'Przeczytaj 50 tomów ze swojego zbioru.',
    icon: '📖',
    category: 'reading',
    target: 50,
    unit: 'tomów',
    xpReward: 150,
  },
  {
    id: 'master_reader',
    title: 'Encyklopedia Mangi',
    description: 'Przeczytaj 100 tomów w swojej kolekcji.',
    icon: '🧠',
    category: 'reading',
    target: 100,
    unit: 'tomów',
    xpReward: 350,
  },
  {
    id: 'series_finisher',
    title: 'Zwieńczone Dzieło',
    description: 'Skompletuj i przeczytaj całą zakończoną serię mangi.',
    icon: '🏆',
    category: 'reading',
    target: 1,
    unit: 'seria',
    xpReward: 120,
  },
  {
    id: 'waneko_fan',
    title: 'Klub Waneko',
    description: 'Posiadaj minimum 15 tomów wydawnictwa Waneko.',
    icon: '🔴',
    category: 'curation',
    target: 15,
    unit: 'tomów',
    xpReward: 80,
  },
  {
    id: 'studio_jg_fan',
    title: 'Entuzjasta Studio JG',
    description: 'Posiadaj minimum 15 tomów wydawnictwa Studio JG.',
    icon: '🟣',
    category: 'curation',
    target: 15,
    unit: 'tomów',
    xpReward: 80,
  },
  {
    id: 'jpf_fan',
    title: 'Kolekcjoner J.P.Fantastica',
    description: 'Posiadaj minimum 10 tomów wydawnictwa JPF.',
    icon: '🔵',
    category: 'curation',
    target: 10,
    unit: 'tomów',
    xpReward: 70,
  },
  {
    id: 'budget_master',
    title: 'Ekonomista Otaku',
    description: 'Uzupełnij ceny zakupu dla co najmniej 15 tomów.',
    icon: '💰',
    category: 'curation',
    target: 15,
    unit: 'tomów z ceną',
    xpReward: 60,
  },
  {
    id: 'critic',
    title: 'Surowy Krytyk',
    description: 'Oceń gwiazdkami przynajmniej 5 tomów lub serii.',
    icon: '⭐',
    category: 'curation',
    target: 5,
    unit: 'ocen',
    xpReward: 50,
  },
  {
    id: 'level_10_veteran',
    title: 'Weteran Poziomu 10',
    description: 'Osiągnij 10. poziom doświadczenia kolekcjonerskiego.',
    icon: '🎖️',
    category: 'mastery',
    target: 10,
    unit: 'poziom',
    xpReward: 100,
  },
  {
    id: 'level_25_master',
    title: 'Mistrz Regału Poziom 25',
    description: 'Osiągnij 25. poziom doświadczenia na portalu.',
    icon: '👑',
    category: 'mastery',
    target: 25,
    unit: 'poziom',
    xpReward: 250,
  },
]

export interface EvaluatedAchievement extends AchievementDef {
  current: number
  percentage: number
  completed: boolean
}

export function evaluateAchievements(
  collection: CollectionSeriesItem[],
  userXP: number
): EvaluatedAchievement[] {
  let ownedCount = 0
  let readCount = 0
  let completedSeriesCount = 0
  let wanekoCount = 0
  let sjgCount = 0
  let jpfCount = 0
  let pricedCount = 0
  let ratedCount = 0

  collection.forEach((series) => {
    let seriesOwned = 0
    let seriesRead = 0

    series.volumes?.forEach((vol) => {
      if (vol.status === 'OWNED' || vol.status === 'READ') {
        ownedCount++
        seriesOwned++
        const pub = (series.publisher || '').toLowerCase()
        if (pub.includes('waneko')) wanekoCount++
        if (pub.includes('studio jg') || pub.includes('jg')) sjgCount++
        if (pub.includes('jpf') || pub.includes('fantastica')) jpfCount++
        if (vol.purchasePrice && vol.purchasePrice > 0) pricedCount++
        if (vol.userRating && vol.userRating > 0) ratedCount++
      }
      if (vol.status === 'READ') {
        readCount++
        seriesRead++
      }
    })

    if (
      series.statusInPoland === 'FINISHED' &&
      series.totalVolumes &&
      series.totalVolumes > 0 &&
      seriesRead >= series.totalVolumes
    ) {
      completedSeriesCount++
    }
  })

  const currentLevel = calculateLevel(userXP)

  return ACHIEVEMENTS.map((ach) => {
    let current = 0
    switch (ach.id) {
      case 'first_step':
      case 'bookshelf_starter':
      case 'serious_collector':
      case 'centurion':
      case 'manga_hoarder':
        current = ownedCount
        break
      case 'bookworm':
      case 'avid_reader':
      case 'master_reader':
        current = readCount
        break
      case 'series_finisher':
        current = completedSeriesCount
        break
      case 'waneko_fan':
        current = wanekoCount
        break
      case 'studio_jg_fan':
        current = sjgCount
        break
      case 'jpf_fan':
        current = jpfCount
        break
      case 'budget_master':
        current = pricedCount
        break
      case 'critic':
        current = ratedCount
        break
      case 'level_10_veteran':
      case 'level_25_master':
        current = currentLevel
        break
      default:
        current = 0
    }

    const completed = current >= ach.target
    const percentage = Math.min(100, Math.round((current / ach.target) * 100))

    return {
      ...ach,
      current,
      percentage,
      completed,
    }
  })
}
