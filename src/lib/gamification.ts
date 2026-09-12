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
    maxLevel: 2,
    minXP: 0,
    maxXP: 99,
    title: 'Czytelnik Nowicjusz',
    badgeIcon: '🌱',
    color: 'emerald',
    bgGradient: 'from-emerald-950/60 to-emerald-900/30',
    borderColor: 'border-emerald-500/40',
    textColor: 'text-emerald-400',
    description: 'Rozpoczęcie pięknej przygody ze światem mangi i komiksów.',
  },
  {
    minLevel: 3,
    maxLevel: 5,
    minXP: 100,
    maxXP: 299,
    title: 'Entuzjasta Mangi',
    badgeIcon: '📘',
    color: 'blue',
    bgGradient: 'from-blue-950/60 to-cyan-900/30',
    borderColor: 'border-blue-500/40',
    textColor: 'text-blue-400',
    description: 'Pierwsze tomy zasilają domowy regał. Pasja szybko rozkwita!',
  },
  {
    minLevel: 6,
    maxLevel: 8,
    minXP: 300,
    maxXP: 699,
    title: 'Kolekcjoner w Rytmie',
    badgeIcon: '⚡',
    color: 'cyan',
    bgGradient: 'from-cyan-950/60 to-purple-900/30',
    borderColor: 'border-cyan-500/40',
    textColor: 'text-cyan-300',
    description: 'Systematyczne czytanie i dodawanie nowych tomów co tydzień.',
  },
  {
    minLevel: 9,
    maxLevel: 11,
    minXP: 700,
    maxXP: 1499,
    title: 'Znawca Regału',
    badgeIcon: '🎨',
    color: 'amber',
    bgGradient: 'from-amber-950/60 to-amber-900/30',
    borderColor: 'border-amber-500/40',
    textColor: 'text-amber-400',
    description: 'Doskonała znajomość polskich wydawnictw i cen rynkowych.',
  },
  {
    minLevel: 12,
    maxLevel: 14,
    minXP: 1500,
    maxXP: 2999,
    title: 'Strażnik Kolekcji',
    badgeIcon: '💎',
    color: 'purple',
    bgGradient: 'from-purple-950/60 to-indigo-900/30',
    borderColor: 'border-purple-500/50',
    textColor: 'text-purple-300',
    description: 'Imponujący zbiór serii, dziesiątki przeczytanych historii.',
  },
  {
    minLevel: 15,
    maxLevel: 18,
    minXP: 3000,
    maxXP: 5999,
    title: 'Arcy-Kolekcjoner',
    badgeIcon: '👑',
    color: 'pink',
    bgGradient: 'from-pink-950/60 to-purple-950/40',
    borderColor: 'border-pink-500/50',
    textColor: 'text-pink-300',
    description: 'Setki tomów, ukończone serie i статус prawdziwego magnata!',
  },
  {
    minLevel: 19,
    maxLevel: 99,
    minXP: 6000,
    maxXP: 99999,
    title: 'Legenda Mangowa',
    badgeIcon: '🐲',
    color: 'rose',
    bgGradient: 'from-rose-950/70 to-amber-950/50',
    borderColor: 'border-rose-500/60',
    textColor: 'text-rose-400',
    description: 'Absolutny mistrz i żywa legenda społeczności otaku!',
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
  if (xp < 100) return 1 + Math.floor(xp / 50)
  if (xp < 300) return 3 + Math.floor((xp - 100) / 66)
  if (xp < 700) return 6 + Math.floor((xp - 300) / 133)
  if (xp < 1500) return 9 + Math.floor((xp - 700) / 266)
  if (xp < 3000) return 12 + Math.floor((xp - 1500) / 500)
  if (xp < 6000) return 15 + Math.floor((xp - 3000) / 1000)
  return 19 + Math.floor((xp - 6000) / 2000)
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
