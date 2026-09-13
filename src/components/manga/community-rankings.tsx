'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  Trophy,
  Flame,
  Star,
  BookOpen,
  Users,
  Calendar,
  Sparkles,
  Loader2,
  Crown,
  Medal,
  ChevronRight,
  TrendingUp,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { getCoverUrl } from '@/lib/cover-utils'

type RankingCategory = 'popular' | 'rating' | 'readers' | 'collectors'
type RankingTimeframe = 'all' | 'month' | 'week'

interface RankingItem {
  rank: number
  id: string
  title?: string
  originalTitle?: string
  username?: string
  displayName?: string
  avatar?: string | null
  coverUrl?: string | null
  publisher?: string
  score?: string
  count?: number
  subtext: string
}

export function CommunityRankings() {
  const [category, setCategory] = useState<RankingCategory>('popular')
  const [timeframe, setTimeframe] = useState<RankingTimeframe>('all')
  const [items, setItems] = useState<RankingItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let isMounted = true
    setLoading(true)

    fetch(`/api/rankings?category=${category}&timeframe=${timeframe}`)
      .then((res) => (res.ok ? res.json() : Promise.reject(res)))
      .then((data) => {
        if (isMounted && data.items) {
          setItems(data.items)
        }
      })
      .catch((err) => {
        console.warn('Error fetching rankings:', err)
      })
      .finally(() => {
        if (isMounted) setLoading(false)
      })

    return () => {
      isMounted = false
    }
  }, [category, timeframe])

  const top3 = items.slice(0, 3)
  const rest = items.slice(3)

  // Reorder for podium: [2nd, 1st, 3rd]
  const podium = [
    top3[1] || null, // 2nd place
    top3[0] || null, // 1st place
    top3[2] || null, // 3rd place
  ]

  return (
    <div className="rounded-3xl border border-white/10 bg-[#0C101D]/90 p-5 sm:p-7 shadow-2xl relative overflow-hidden backdrop-blur-xl">
      {/* Background ambient lighting */}
      <div className="absolute -right-16 -top-16 h-48 w-48 rounded-full bg-cyan-500/10 blur-3xl pointer-events-none" />
      <div className="absolute -left-16 -bottom-16 h-48 w-48 rounded-full bg-purple-500/10 blur-3xl pointer-events-none" />

      {/* Header with Title & Timeframe Selector */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-white/10 pb-5">
        <div>
          <div className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/40 bg-amber-500/10 px-3 py-0.5 text-[11px] font-bold text-amber-300 mb-1">
            <Trophy className="h-3.5 w-3.5 text-amber-400" />
            <span>Rankingi Społeczności Manga-Shelf</span>
          </div>
          <h3 className="text-xl font-black text-white tracking-tight">
            Top Mangi i Liderzy Kolekcji
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Odkryj co najchętniej czyta, zbiera i ocenia polska społeczność
          </p>
        </div>

        {/* Timeframe selector pills */}
        <div className="flex items-center gap-1.5 bg-white/5 p-1 rounded-2xl border border-white/10 self-start lg:self-auto">
          <button
            type="button"
            onClick={() => setTimeframe('all')}
            className={`px-3 py-1 rounded-xl text-xs font-bold transition-all ${
              timeframe === 'all'
                ? 'bg-primary text-white shadow-md'
                : 'text-muted-foreground hover:text-white'
            }`}
          >
            Wszystko
          </button>
          <button
            type="button"
            onClick={() => setTimeframe('month')}
            className={`px-3 py-1 rounded-xl text-xs font-bold transition-all ${
              timeframe === 'month'
                ? 'bg-primary text-white shadow-md'
                : 'text-muted-foreground hover:text-white'
            }`}
          >
            Ten Miesiąc
          </button>
          <button
            type="button"
            onClick={() => setTimeframe('week')}
            className={`px-3 py-1 rounded-xl text-xs font-bold transition-all ${
              timeframe === 'week'
                ? 'bg-primary text-white shadow-md'
                : 'text-muted-foreground hover:text-white'
            }`}
          >
            Ten Tydzień
          </button>
        </div>
      </div>

      {/* Category Pills Navigation */}
      <div className="flex items-center gap-2 overflow-x-auto scrollbar-none py-3 border-b border-white/5">
        <button
          type="button"
          onClick={() => setCategory('popular')}
          className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-extrabold whitespace-nowrap transition-all ${
            category === 'popular'
              ? 'bg-cyan-400 text-black shadow-md shadow-cyan-400/30'
              : 'bg-white/5 text-muted-foreground border border-white/10 hover:text-white'
          }`}
        >
          <Flame className="h-3.5 w-3.5" />
          <span>Najpopularniejsze Serie</span>
        </button>

        <button
          type="button"
          onClick={() => setCategory('rating')}
          className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-extrabold whitespace-nowrap transition-all ${
            category === 'rating'
              ? 'bg-amber-400 text-black shadow-md shadow-amber-400/30'
              : 'bg-white/5 text-muted-foreground border border-white/10 hover:text-white'
          }`}
        >
          <Star className="h-3.5 w-3.5" />
          <span>Najwyżej Oceniane</span>
        </button>

        <button
          type="button"
          onClick={() => setCategory('readers')}
          className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-extrabold whitespace-nowrap transition-all ${
            category === 'readers'
              ? 'bg-purple-500 text-white shadow-md shadow-purple-500/30'
              : 'bg-white/5 text-muted-foreground border border-white/10 hover:text-white'
          }`}
        >
          <BookOpen className="h-3.5 w-3.5" />
          <span>Najwięcej Czytających</span>
        </button>

        <button
          type="button"
          onClick={() => setCategory('collectors')}
          className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-extrabold whitespace-nowrap transition-all ${
            category === 'collectors'
              ? 'bg-pink-500 text-white shadow-md shadow-pink-500/30'
              : 'bg-white/5 text-muted-foreground border border-white/10 hover:text-white'
          }`}
        >
          <Crown className="h-3.5 w-3.5" />
          <span>Najwięksi Kolekcjonerzy</span>
        </button>
      </div>

      {/* Main Content Area */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-16 gap-2">
          <Loader2 className="h-7 w-7 animate-spin text-cyan-400" />
          <span className="text-xs text-muted-foreground">Obliczanie rankingu społeczności...</span>
        </div>
      ) : items.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground text-xs">
          Brak danych dla wybranego okresu i kategorii.
        </div>
      ) : (
        <div className="space-y-6 pt-5">
          {/* PODIUM (Top 3) */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end max-w-3xl mx-auto pt-4">
            {podium.map((item, idx) => {
              if (!item) return null
              const isFirst = item.rank === 1
              const isSecond = item.rank === 2
              const isThird = item.rank === 3

              const borderGlow = isFirst
                ? 'border-2 border-amber-400 shadow-[0_0_25px_rgba(251,191,36,0.35)] bg-gradient-to-t from-amber-950/30 via-[#101524] to-amber-950/20'
                : isSecond
                ? 'border border-slate-300 shadow-[0_0_15px_rgba(203,213,225,0.2)] bg-gradient-to-t from-slate-900/40 via-[#0E1322] to-transparent'
                : 'border border-amber-700/60 shadow-[0_0_15px_rgba(180,83,9,0.2)] bg-gradient-to-t from-orange-950/30 via-[#0E1322] to-transparent'

              const crownIcon = isFirst ? '👑' : isSecond ? '🥈' : '🥉'
              const heightClass = isFirst ? 'sm:-translate-y-2.5 pb-5 pt-4' : 'pb-4 pt-3'

              const targetLink =
                category === 'collectors'
                  ? `/users/${encodeURIComponent(item.username || '')}`
                  : `/search?q=${encodeURIComponent(item.title || '')}`

              return (
                <Link
                  key={item.id}
                  href={targetLink}
                  className={`group relative flex flex-col items-center text-center rounded-3xl p-4 transition-all duration-300 hover:scale-[1.02] ${borderGlow} ${heightClass}`}
                >
                  {/* Crown / Medal Top Badge */}
                  <div className="text-2xl mb-1 drop-shadow-md animate-bounce-subtle">
                    {crownIcon}
                  </div>

                  {/* Image: Cover or Avatar */}
                  <div className="relative mb-3">
                    {category === 'collectors' ? (
                      <div className="h-16 w-16 rounded-full overflow-hidden border-2 border-white/20 shadow-md">
                        {item.avatar ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={item.avatar}
                            alt={item.displayName || ''}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="h-full w-full flex items-center justify-center bg-gradient-to-tr from-purple-600 to-cyan-600 text-white font-extrabold text-xl">
                            {(item.username?.[0] || 'U').toUpperCase()}
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="relative aspect-[2/3] w-20 sm:w-24 overflow-hidden rounded-xl shadow-lg border border-white/10">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={getCoverUrl(item.coverUrl || '')}
                          alt={item.title || ''}
                          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                        />
                      </div>
                    )}

                    {/* Rank Number Pill */}
                    <div
                      className={`absolute -bottom-2 -right-2 flex h-6 w-6 items-center justify-center rounded-full text-xs font-black shadow-md ${
                        isFirst
                          ? 'bg-amber-400 text-black ring-2 ring-amber-300'
                          : isSecond
                          ? 'bg-slate-300 text-black ring-2 ring-slate-200'
                          : 'bg-amber-700 text-white ring-2 ring-amber-600'
                      }`}
                    >
                      #{item.rank}
                    </div>
                  </div>

                  {/* Title / Name */}
                  <h4 className="text-xs font-black text-white group-hover:text-cyan-300 transition-colors line-clamp-1 max-w-[180px]">
                    {category === 'collectors' ? item.displayName : item.title}
                  </h4>

                  {category === 'collectors' && (
                    <span className="text-[10px] text-cyan-400 font-semibold">@{item.username}</span>
                  )}

                  {category !== 'collectors' && item.publisher && (
                    <span className="text-[10px] text-muted-foreground mt-0.5">{item.publisher}</span>
                  )}

                  {/* Score / Count Badge */}
                  <div className="mt-2 text-[11px] font-extrabold text-amber-300 bg-black/40 border border-white/10 px-2.5 py-0.5 rounded-full">
                    {category === 'rating' ? `⭐ ${item.score} / 10` : item.subtext}
                  </div>
                </Link>
              )
            })}
          </div>

          {/* LIST FOR PLACES 4 - 10 */}
          {rest.length > 0 && (
            <div className="space-y-2 pt-3 border-t border-white/10">
              <h5 className="text-[11px] font-extrabold uppercase tracking-wider text-muted-foreground px-2">
                Pozostałe Pozycje (Miejsca 4 - 10)
              </h5>

              <div className="grid gap-2 sm:grid-cols-2">
                {rest.map((item) => {
                  const targetLink =
                    category === 'collectors'
                      ? `/users/${encodeURIComponent(item.username || '')}`
                      : `/search?q=${encodeURIComponent(item.title || '')}`

                  return (
                    <Link
                      key={item.id}
                      href={targetLink}
                      className="group flex items-center justify-between p-2.5 rounded-2xl bg-white/[0.02] border border-white/5 hover:border-white/15 hover:bg-white/[0.05] transition-all"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="text-xs font-black text-muted-foreground w-6 text-center shrink-0">
                          #{item.rank}
                        </span>

                        {category === 'collectors' ? (
                          <div className="h-8 w-8 rounded-full overflow-hidden border border-white/10 shrink-0">
                            {item.avatar ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={item.avatar}
                                alt={item.displayName || ''}
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <div className="h-full w-full flex items-center justify-center bg-white/10 text-white font-bold text-xs">
                                {(item.username?.[0] || 'U').toUpperCase()}
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="relative aspect-[2/3] h-9 shrink-0 overflow-hidden rounded-md border border-white/10">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={getCoverUrl(item.coverUrl || '')}
                              alt={item.title || ''}
                              className="h-full w-full object-cover"
                            />
                          </div>
                        )}

                        <div className="min-w-0">
                          <h6 className="text-xs font-bold text-white group-hover:text-cyan-300 transition-colors truncate">
                            {category === 'collectors' ? item.displayName : item.title}
                          </h6>
                          <p className="text-[10px] text-muted-foreground truncate">{item.subtext}</p>
                        </div>
                      </div>

                      <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-white shrink-0 ml-2" />
                    </Link>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
