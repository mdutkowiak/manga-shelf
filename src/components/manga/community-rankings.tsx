'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  Trophy,
  Flame,
  Star,
  BookOpen,
  Sparkles,
  Loader2,
  ChevronRight,
  Crown,
} from 'lucide-react'
import { getCoverUrl } from '@/lib/cover-utils'
import { AddMangaModal } from '@/components/manga/add-manga-modal'
import {
  SeriesCollectionDetailModal,
  type CollectionSeriesItem,
} from '@/components/manga/series-collection-detail-modal'
import {
  getSavedCollection,
  saveCollectionToStorage,
  addOrUpdateSeriesInCollection,
} from '@/lib/collection-store'
import { areSameSeries } from '@/lib/title-utils'

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
  totalVolumes?: number
  totalVolumesJapan?: number | null
  description?: string
}

export function CommunityRankings() {
  const [category, setCategory] = useState<RankingCategory>('popular')
  const [timeframe, setTimeframe] = useState<RankingTimeframe>('all')
  const [items, setItems] = useState<RankingItem[]>([])
  const [loading, setLoading] = useState(true)

  // Modals state for clicking a manga
  const [selectedDetailSeries, setSelectedDetailSeries] = useState<CollectionSeriesItem | null>(null)
  const [detailModalOpen, setDetailModalOpen] = useState(false)
  const [addModalOpen, setAddModalOpen] = useState(false)
  const [initialAddSeries, setInitialAddSeries] = useState<any | null>(null)

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

  const handleMangaClick = (item: RankingItem) => {
    if (category === 'collectors') return

    const collection = getSavedCollection()
    const existing = collection.find((s) =>
      areSameSeries(
        { id: item.id, mangaId: item.id, title: item.title, polishTitle: item.originalTitle },
        { id: s.id, mangaId: s.mangaId, title: s.title, polishTitle: s.polishTitle }
      )
    )

    if (existing) {
      setSelectedDetailSeries(existing)
      setDetailModalOpen(true)
    } else {
      setInitialAddSeries({
        mangaId: item.id,
        title: item.title || '',
        polishTitle: item.originalTitle || null,
        publisher: item.publisher || 'Waneko',
        coverUrl: item.coverUrl || '',
        totalVolumes: item.totalVolumes || 20,
        totalVolumesJapan: item.totalVolumesJapan ?? null,
        description: item.description || `Oficjalne wydanie ${item.title}.`,
      })
      setAddModalOpen(true)
    }
  }

  const handleUpdateSeries = (updatedSeries: CollectionSeriesItem) => {
    const list = getSavedCollection()
    const newList = list.map((s) => (s.id === updatedSeries.id ? updatedSeries : s))
    saveCollectionToStorage(newList)
    setSelectedDetailSeries(updatedSeries)
  }

  const handleAddVolumes = (seriesInfo: any) => {
    addOrUpdateSeriesInCollection(seriesInfo)
  }

  const top3 = items.slice(0, 3)
  const rest = items.slice(3)

  // Reorder for podium display: [2nd place, 1st place, 3rd place]
  const podium = [
    top3[1] || null, // 2nd place
    top3[0] || null, // 1st place
    top3[2] || null, // 3rd place
  ]

  // Split rest into two columns for places 4-10 (4-7 on left, 8-10 on right)
  const half = Math.ceil(rest.length / 2)
  const col1 = rest.slice(0, half)
  const col2 = rest.slice(half)

  const renderCompactItem = (item: RankingItem) => {
    const content = (
      <div className="flex items-center justify-between p-2 rounded-xl bg-white/[0.03] border border-white/5 hover:border-white/20 hover:bg-white/[0.07] transition-all cursor-pointer text-left w-full h-[52px]">
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          <span className="text-xs font-black text-muted-foreground w-5 text-center shrink-0">
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

          <div className="min-w-0 flex-1">
            <h6 className="text-xs font-bold text-white group-hover:text-cyan-300 transition-colors truncate leading-tight">
              {category === 'collectors' ? item.displayName : item.title}
            </h6>
            <p className="text-[10px] text-muted-foreground truncate leading-tight mt-0.5">
              {item.subtext}
            </p>
          </div>
        </div>

        <ChevronRight className="h-3.5 w-3.5 text-muted-foreground group-hover:text-white shrink-0 ml-1.5 transition-transform group-hover:translate-x-0.5" />
      </div>
    )

    if (category === 'collectors') {
      return (
        <Link
          key={item.id}
          href={`/users/${encodeURIComponent(item.username || '')}`}
          className="block group"
        >
          {content}
        </Link>
      )
    }

    return (
      <button
        key={item.id}
        type="button"
        onClick={() => handleMangaClick(item)}
        className="block group w-full"
      >
        {content}
      </button>
    )
  }

  const renderPodiumCard = (item: RankingItem | null) => {
    if (!item) return null
    const isFirst = item.rank === 1
    const isSecond = item.rank === 2

    const borderGlow = isFirst
      ? 'border-2 border-amber-400/90 shadow-[0_0_25px_rgba(251,191,36,0.35)] bg-gradient-to-t from-amber-950/40 via-[#101524] to-amber-950/20'
      : isSecond
      ? 'border border-slate-300/70 shadow-[0_0_15px_rgba(203,213,225,0.15)] bg-gradient-to-t from-slate-900/50 via-[#0E1322] to-transparent'
      : 'border border-amber-700/70 shadow-[0_0_15px_rgba(180,83,9,0.15)] bg-gradient-to-t from-orange-950/40 via-[#0E1322] to-transparent'

    const crownIcon = isFirst ? '👑' : isSecond ? '🥈' : '🥉'
    const heightClass = isFirst
      ? 'sm:-translate-y-2 pb-4 pt-4 min-h-[290px]'
      : 'pb-3.5 pt-3 min-h-[275px]'

    const innerCard = (
      <div
        className={`group relative flex flex-col items-center justify-between text-center rounded-3xl p-3 sm:p-4 transition-all duration-300 hover:scale-[1.02] w-full h-full cursor-pointer ${borderGlow} ${heightClass}`}
      >
        {/* Crown / Medal Top Badge */}
        <div className="text-2xl mb-1 drop-shadow-md">
          {crownIcon}
        </div>

        {/* Image: Cover or Avatar */}
        <div className="relative mb-2">
          {category === 'collectors' ? (
            <div className="h-16 w-16 sm:h-20 sm:w-20 rounded-full overflow-hidden border-2 border-white/20 shadow-md">
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
            <div className="relative aspect-[2/3] w-16 sm:w-20 overflow-hidden rounded-xl shadow-lg border border-white/10">
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
        <div className="w-full px-1">
          <h4 className="text-xs sm:text-sm font-black text-white group-hover:text-cyan-300 transition-colors line-clamp-2 leading-tight">
            {category === 'collectors' ? item.displayName : item.title}
          </h4>

          {category === 'collectors' && (
            <span className="text-[10px] text-cyan-400 font-semibold block truncate">@{item.username}</span>
          )}

          {category !== 'collectors' && item.publisher && (
            <span className="text-[10px] text-muted-foreground mt-0.5 block truncate">{item.publisher}</span>
          )}
        </div>

        {/* Score / Count Badge */}
        <div className="mt-2 text-[10px] sm:text-[11px] font-extrabold text-amber-300 bg-black/50 border border-white/10 px-2.5 py-0.5 rounded-full text-center max-w-full truncate">
          {category === 'rating' ? `⭐ ${item.score} / 10` : item.subtext}
        </div>
      </div>
    )

    if (category === 'collectors') {
      return (
        <Link
          key={item.id}
          href={`/users/${encodeURIComponent(item.username || '')}`}
          className="h-full flex"
        >
          {innerCard}
        </Link>
      )
    }

    return (
      <button
        key={item.id}
        type="button"
        onClick={() => handleMangaClick(item)}
        className="h-full flex w-full text-left"
      >
        {innerCard}
      </button>
    )
  }

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
        <div className="pt-5">
          {rest.length > 0 ? (
            /* 2-Column Layout on lg screens: Left = Top 3 Podium, Right = Places 4-10 */
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
              {/* LEFT COLUMN: PODIUM (Top 3) */}
              <div className="lg:col-span-6 flex flex-col justify-end">
                <div className="grid grid-cols-3 gap-2 sm:gap-3 items-end h-full">
                  {podium.map((item) => renderPodiumCard(item))}
                </div>
              </div>

              {/* RIGHT COLUMN: PLACES 4 - 10 */}
              <div className="lg:col-span-6 flex flex-col justify-between">
                <div className="flex items-center justify-between pb-2 mb-3 border-b border-white/10">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-3.5 w-3.5 text-cyan-400" />
                    <h5 className="text-[11px] font-extrabold uppercase tracking-wider text-muted-foreground">
                      Pozostałe Pozycje (Miejsca 4 - 10)
                    </h5>
                  </div>
                  <span className="text-[10px] text-muted-foreground font-medium">
                    {rest.length} {rest.length === 1 ? 'pozycja' : rest.length < 5 ? 'pozycje' : 'pozycji'}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 flex-1">
                  <div className="space-y-2">
                    {col1.map((item) => renderCompactItem(item))}
                  </div>
                  <div className="space-y-2">
                    {col2.map((item) => renderCompactItem(item))}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* Podium Only when <= 3 items */
            <div className="max-w-2xl mx-auto">
              <div className="grid grid-cols-3 gap-3 sm:gap-4 items-end">
                {podium.map((item) => renderPodiumCard(item))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Series Detail Modal (if user already has the manga) */}
      <SeriesCollectionDetailModal
        open={detailModalOpen}
        onOpenChange={setDetailModalOpen}
        series={selectedDetailSeries}
        onUpdateSeries={handleUpdateSeries}
        isAdmin={true}
      />

      {/* Add Manga Modal (if user doesn't have the manga yet) */}
      <AddMangaModal
        open={addModalOpen}
        onOpenChange={setAddModalOpen}
        initialSeries={initialAddSeries}
        onAddVolumes={handleAddVolumes}
        isAdmin={true}
      />
    </div>
  )
}
