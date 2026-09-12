'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  CalendarDays,
  CalendarRange,
  LayoutGrid,
  Sparkles,
  RefreshCw,
  Download,
  Search,
  X,
  Heart,
  Check,
  PiggyBank,
  Clock,
  RotateCcw,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import type { PolishRelease } from '@/app/api/releases/route'
import type { VolumeDetailData } from '@/components/manga/volume-detail-modal'
import {
  cleanReleaseTitle,
  matchPublisher,
} from '@/lib/publisher-scraper'
import {
  getSavedCollection,
  quickToggleVolumeStatus,
  normalizeTitleKey,
  type CollectionSeriesItem,
} from '@/lib/collection-store'

export type CalendarViewMode = 'month' | 'grid' | 'week' | 'quarter'

interface CalendarViewProps {
  allReleases: PolishRelease[]
  currentMonth: string
  monthIndex: number
  year: number
  onPrevMonth: () => void
  onNextMonth: () => void
  onPrevQuarter: () => void
  onNextQuarter: () => void
  onSelectVolume: (volume: VolumeDetailData) => void
  onOpenSyncModal?: () => void
  onResetToToday?: () => void
  isFullScreen?: boolean
}

const publishersList = [
  'Wszystkie',
  'Waneko',
  'Studio JG',
  'J.P.Fantastica',
  'Kotori',
  'Dango',
  'Hanami',
]

const polishMonths = [
  'Styczeń',
  'Luty',
  'Marzec',
  'Kwiecień',
  'Maj',
  'Czerwiec',
  'Lipiec',
  'Sierpień',
  'Wrzesień',
  'Październik',
  'Listopad',
  'Grudzień',
]

const weekDayNames = ['Pon', 'Wt', 'Śr', 'Czw', 'Pt', 'Sob', 'Nie']

export function CalendarView({
  allReleases = [],
  currentMonth,
  monthIndex,
  year,
  onPrevMonth,
  onNextMonth,
  onPrevQuarter,
  onNextQuarter,
  onSelectVolume,
  onOpenSyncModal,
  onResetToToday,
  isFullScreen = false,
}: CalendarViewProps) {
  const [viewMode, setViewMode] = useState<CalendarViewMode>('month')
  const [selectedPublisher, setSelectedPublisher] = useState('Wszystkie')
  const [searchQuery, setSearchQuery] = useState('')
  const [onlyMySeries, setOnlyMySeries] = useState(false)
  const [exportModalOpen, setExportModalOpen] = useState(false)

  // Local user collection state for immediate 1-click status checking & toggling
  const [userCollection, setUserCollection] = useState<CollectionSeriesItem[]>([])

  useEffect(() => {
    const timer = setTimeout(() => {
      setUserCollection(getSavedCollection())
    }, 0)
    const handleCollectionUpdate = () => setUserCollection(getSavedCollection())
    window.addEventListener('mangowo_collection_updated', handleCollectionUpdate)
    return () => {
      clearTimeout(timer)
      window.removeEventListener('mangowo_collection_updated', handleCollectionUpdate)
    }
  }, [])

  // Normalized list of titles user currently tracks (owned, reading, or wishlist)
  const trackedSeriesKeys = useMemo(() => {
    return new Set(userCollection.map((s) => normalizeTitleKey(s.title)))
  }, [userCollection])

  // Helper to check volume status in user collection
  const getVolumeStatus = (rel: PolishRelease): 'OWNED' | 'READ' | 'WISHLIST' | 'ORDERED' | 'NONE' => {
    const cleanTitle = cleanReleaseTitle(rel.title)
    const key = normalizeTitleKey(cleanTitle)

    const series = userCollection.find(
      (s) => s.mangaId === rel.mangaId || normalizeTitleKey(s.title) === key
    )
    if (!series) return 'NONE'

    const vol = series.volumes.find((v) => v.volumeNumber === rel.volumeNumber)
    return vol?.status || 'NONE'
  }

  // 1-Click quick toggle handler
  const handleQuickToggle = (
    e: React.MouseEvent,
    rel: PolishRelease,
    targetStatus: 'OWNED' | 'WISHLIST'
  ) => {
    e.stopPropagation()
    const seriesTitle = cleanReleaseTitle(rel.title)
    quickToggleVolumeStatus(
      rel.mangaId,
      seriesTitle,
      rel.volumeNumber,
      targetStatus,
      rel.publisher,
      rel.coverUrl,
      rel.pricePLN
    )
    setUserCollection(getSavedCollection())
  }

  // Filter releases by publisher, search query, and "only my series"
  const isMatchFilter = useCallback(
    (rel: PolishRelease) => {
      // 1. Publisher filter
      if (!matchPublisher(rel.publisher, selectedPublisher)) return false

      // 2. Search query filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim()
        const titleClean = cleanReleaseTitle(rel.title).toLowerCase()
        const titleRaw = rel.title.toLowerCase()
        const pub = rel.publisher.toLowerCase()
        const vol = String(rel.volumeNumber)
        const matches =
          titleClean.includes(q) ||
          titleRaw.includes(q) ||
          pub.includes(q) ||
          vol === q ||
          `tom ${vol}`.includes(q)
        if (!matches) return false
      }

      // 3. "Only My Series" filter
      if (onlyMySeries) {
        const cleanTitle = cleanReleaseTitle(rel.title)
        const key = normalizeTitleKey(cleanTitle)
        const isTracked =
          trackedSeriesKeys.has(key) ||
          userCollection.some(
            (s) =>
              s.mangaId === rel.mangaId ||
              key.includes(normalizeTitleKey(s.title)) ||
              normalizeTitleKey(s.title).includes(key)
          )
        if (!isTracked) return false
      }

      return true
    },
    [selectedPublisher, searchQuery, onlyMySeries, trackedSeriesKeys, userCollection]
  )

  // Filtered releases for the current month & year
  const currentMonthReleases = useMemo(() => {
    return allReleases.filter((rel) => {
      const matchesDate =
        rel.month.toLowerCase() === currentMonth.toLowerCase() && rel.year === year
      return matchesDate && isMatchFilter(rel)
    })
  }, [allReleases, currentMonth, year, isMatchFilter])

  // Count of user's releases in current month and estimated spend
  const userMonthStats = useMemo(() => {
    const userVols = allReleases.filter((rel) => {
      if (rel.month.toLowerCase() !== currentMonth.toLowerCase() || rel.year !== year) {
        return false
      }
      const cleanTitle = cleanReleaseTitle(rel.title)
      const key = normalizeTitleKey(cleanTitle)
      return (
        trackedSeriesKeys.has(key) ||
        userCollection.some((s) => s.mangaId === rel.mangaId)
      )
    })

    const totalPLN = userVols.reduce((acc, curr) => acc + (curr.pricePLN || 34.99), 0)
    return {
      count: userVols.length,
      totalPLN,
    }
  }, [allReleases, currentMonth, year, trackedSeriesKeys, userCollection])

  // Quarter months calculation (3 consecutive months)
  const quarterMonths = useMemo(() => {
    return [0, 1, 2].map((offset) => {
      const rawIndex = monthIndex + offset
      const mIdx = ((rawIndex % 12) + 12) % 12
      const mYear = year + Math.floor(rawIndex / 12)
      const mName = polishMonths[mIdx]
      const mReleases = allReleases.filter((rel) => {
        const matchesDate = rel.month.toLowerCase() === mName.toLowerCase() && rel.year === mYear
        return matchesDate && isMatchFilter(rel)
      })

      return {
        name: mName,
        year: mYear,
        releases: mReleases,
      }
    })
  }, [allReleases, monthIndex, year, isMatchFilter])

  const quarterLabel = `${quarterMonths[0].name} ${quarterMonths[0].year} — ${quarterMonths[2].name} ${quarterMonths[2].year}`

  // Days in selected month for the Wall Calendar Grid view
  const gridData = useMemo(() => {
    const daysInMonth = new Date(year, monthIndex + 1, 0).getDate()
    // 0 = Sunday in JS, so convert to 0 = Monday, 6 = Sunday
    const firstDayOfWeek = (new Date(year, monthIndex, 1).getDay() + 6) % 7

    const days = []
    // Empty cells before day 1
    for (let i = 0; i < firstDayOfWeek; i++) {
      days.push({ dayNumber: null, releases: [] })
    }

    // Days 1 to daysInMonth
    for (let d = 1; d <= daysInMonth; d++) {
      const dayReleases = currentMonthReleases.filter((rel) => {
        if (rel.date) {
          const parts = rel.date.split('-')
          if (parts.length === 3 && parseInt(parts[2], 10) === d) return true
        }
        const parsedDay = parseInt(rel.day, 10)
        return parsedDay === d
      })
      days.push({ dayNumber: d, releases: dayReleases })
    }

    return days
  }, [year, monthIndex, currentMonthReleases])

  // Week view sections (1-7, 8-14, 15-21, 22-end)
  const weekSections = useMemo(() => {
    const daysInMonth = new Date(year, monthIndex + 1, 0).getDate()
    const ranges = [
      { label: `1 – 7 ${currentMonth}`, start: 1, end: 7 },
      { label: `8 – 14 ${currentMonth}`, start: 8, end: 14 },
      { label: `15 – 21 ${currentMonth}`, start: 15, end: 21 },
      { label: `22 – ${daysInMonth} ${currentMonth}`, start: 22, end: daysInMonth },
    ]

    return ranges.map((r) => {
      const rels = currentMonthReleases.filter((rel) => {
        let d = 0
        if (rel.date) {
          const parts = rel.date.split('-')
          if (parts.length === 3) d = parseInt(parts[2], 10)
        }
        if (!d) d = parseInt(rel.day, 10)
        return d >= r.start && d <= r.end
      })
      return {
        ...r,
        releases: rels,
      }
    })
  }, [year, monthIndex, currentMonth, currentMonthReleases])

  // Check if current view is not current real month (for "Today" button)
  const now = new Date()
  const isCurrentMonthNow = now.getFullYear() === year && now.getMonth() === monthIndex

  const handleVolumeClick = (rel: PolishRelease) => {
    onSelectVolume({
      mangaId: rel.mangaId,
      volumeNumber: rel.volumeNumber,
      title: cleanReleaseTitle(rel.title),
      coverUrl: rel.coverUrl,
      publisher: rel.publisher,
      pricePLN: rel.pricePLN,
      polishReleaseDate: rel.date,
      description: rel.description,
      status: getVolumeStatus(rel) === 'OWNED' ? 'OWNED' : 'WISHLIST',
    })
  }

  // Personal iCal download URL
  const userSeriesTitles = useMemo(() => {
    return userCollection.map((s) => s.title).join(',')
  }, [userCollection])

  return (
    <div className={`flex flex-col text-white ${isFullScreen ? 'space-y-6' : 'space-y-4'}`}>
      {/* 1. Header Toolbar */}
      <div className="p-4 sm:p-6 pb-4 border-b border-white/10 bg-gradient-to-r from-purple-950/30 via-[#0B1020] to-cyan-950/20 rounded-2xl">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <div className="inline-flex items-center gap-1.5 rounded-full border border-cyan-500/30 bg-cyan-500/10 px-3 py-0.5 text-[11px] font-bold text-cyan-300 mb-1.5">
              <Sparkles className="h-3 w-3" />
              <span>Harmonogram Polskich Wydań Mangi</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-extrabold text-white flex items-center gap-2">
              {viewMode === 'quarter' ? (
                <>Kwartał: {quarterLabel}</>
              ) : (
                <>
                  Kalendarz Premier — {currentMonth} {year}
                </>
              )}
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Oficjalne zapowiedzi polskich wydawnictw: Waneko, Studio JG, J.P.Fantastica, Kotori, Dango, Hanami
            </p>
          </div>

          {/* Action Buttons: Sync & iCal Export */}
          <div className="flex items-center gap-2 flex-wrap">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setExportModalOpen(true)}
              className="bg-white/5 border-white/15 text-xs text-purple-300 hover:text-white font-bold h-8 gap-1.5 rounded-xl hover:bg-purple-950/40"
            >
              <Download className="h-3.5 w-3.5" />
              Eksportuj (.ics)
            </Button>

            {onOpenSyncModal && (
              <Button
                variant="outline"
                size="sm"
                onClick={onOpenSyncModal}
                className="bg-white/5 border-white/15 text-xs text-cyan-300 hover:text-white font-bold h-8 gap-1.5 rounded-xl hover:bg-cyan-950/40"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                Synchronizuj z wydawcami
              </Button>
            )}
          </div>
        </div>

        {/* 2. Sub-Toolbar: View Mode, Navigation & Search */}
        <div className="mt-4 flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 pt-3 border-t border-white/5">
          {/* View Mode Selector (Siatka ścienna, Lista, Tydzień, Kwartał) */}
          <div className="flex items-center gap-1 bg-white/5 p-1 rounded-xl border border-white/10 overflow-x-auto scrollbar-none">
            <button
              type="button"
              onClick={() => setViewMode('month')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition-all shrink-0 ${
                viewMode === 'month'
                  ? 'bg-primary text-white shadow-md shadow-primary/30'
                  : 'text-muted-foreground hover:text-white'
              }`}
            >
              <CalendarIcon className="h-3.5 w-3.5" />
              Karty Miesiąca
            </button>
            <button
              type="button"
              onClick={() => setViewMode('grid')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition-all shrink-0 ${
                viewMode === 'grid'
                  ? 'bg-primary text-white shadow-md shadow-primary/30'
                  : 'text-muted-foreground hover:text-white'
              }`}
            >
              <LayoutGrid className="h-3.5 w-3.5" />
              Siatka Dni (Ścienny)
            </button>
            <button
              type="button"
              onClick={() => setViewMode('week')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition-all shrink-0 ${
                viewMode === 'week'
                  ? 'bg-primary text-white shadow-md shadow-primary/30'
                  : 'text-muted-foreground hover:text-white'
              }`}
            >
              <CalendarDays className="h-3.5 w-3.5" />
              Tygodnie
            </button>
            <button
              type="button"
              onClick={() => setViewMode('quarter')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition-all shrink-0 ${
                viewMode === 'quarter'
                  ? 'bg-primary text-white shadow-md shadow-primary/30'
                  : 'text-muted-foreground hover:text-white'
              }`}
            >
              <CalendarRange className="h-3.5 w-3.5" />
              3 Miesiące
            </button>
          </div>

          {/* Month / Year Navigator */}
          <div className="flex items-center gap-1.5 justify-between sm:justify-start">
            <Button
              variant="ghost"
              size="icon"
              onClick={viewMode === 'quarter' ? onPrevQuarter : onPrevMonth}
              className="h-8 w-8 rounded-lg bg-white/5 text-muted-foreground hover:text-white hover:bg-white/10"
              title={viewMode === 'quarter' ? 'Poprzedni kwartał' : 'Poprzedni miesiąc'}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>

            <span className="text-xs font-extrabold text-white px-2 min-w-[130px] text-center">
              {viewMode === 'quarter' ? quarterLabel : `${currentMonth} ${year}`}
            </span>

            <Button
              variant="ghost"
              size="icon"
              onClick={viewMode === 'quarter' ? onNextQuarter : onNextMonth}
              className="h-8 w-8 rounded-lg bg-white/5 text-muted-foreground hover:text-white hover:bg-white/10"
              title={viewMode === 'quarter' ? 'Następny kwartał' : 'Następny miesiąc'}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>

            {!isCurrentMonthNow && onResetToToday && (
              <Button
                variant="outline"
                size="sm"
                onClick={onResetToToday}
                className="h-8 px-2.5 rounded-lg text-[11px] font-bold border-cyan-500/40 bg-cyan-950/30 text-cyan-300 hover:bg-cyan-900/50 ml-1 gap-1"
                title="Wróć do bieżącego miesiąca"
              >
                <RotateCcw className="h-3 w-3" />
                <span>Dzisiaj</span>
              </Button>
            )}
          </div>

          {/* Live Search Input */}
          <div className="relative min-w-[200px] sm:w-64">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Szukaj mangi lub tomu..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-8.5 pl-8 pr-7 bg-white/5 border-white/10 rounded-xl text-xs text-white placeholder:text-muted-foreground focus-visible:ring-primary"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-white"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* 3. Filters: "Only My Series" Toggle & Publisher Tags */}
        <div className="mt-3 flex items-center justify-between flex-wrap gap-2 pt-2 border-t border-white/5">
          {/* Quick Publisher Filter Tags */}
          <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none py-1">
            <span className="text-[11px] font-bold text-muted-foreground mr-1 shrink-0">Wydawca:</span>
            {publishersList.map((pub) => {
              const isSelected = selectedPublisher === pub
              return (
                <button
                  key={pub}
                  type="button"
                  onClick={() => setSelectedPublisher(pub)}
                  className={`shrink-0 rounded-full px-2.5 py-0.5 text-[10px] font-bold transition-all ${
                    isSelected
                      ? 'bg-cyan-400 text-black shadow-md shadow-cyan-400/30 font-black'
                      : 'bg-white/5 text-muted-foreground border border-white/10 hover:text-white hover:bg-white/10'
                  }`}
                >
                  {pub}
                </button>
              )
            })}
          </div>

          {/* "Tylko z mojej półki" Toggle */}
          <button
            type="button"
            onClick={() => setOnlyMySeries(!onlyMySeries)}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold transition-all border ${
              onlyMySeries
                ? 'bg-purple-600 text-white border-purple-400 shadow-md shadow-purple-600/30'
                : 'bg-white/5 text-muted-foreground border-white/10 hover:text-white hover:bg-white/10'
            }`}
          >
            <Heart className={`h-3.5 w-3.5 ${onlyMySeries ? 'fill-white text-white' : 'text-purple-400'}`} />
            <span>Tylko z mojej półki</span>
            {userMonthStats.count > 0 && (
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
                onlyMySeries ? 'bg-black/40 text-white' : 'bg-purple-500/20 text-purple-300'
              }`}>
                {userMonthStats.count}
              </span>
            )}
          </button>
        </div>

        {/* 4. Monthly Spend & Budget Bar */}
        <div className="mt-3 flex items-center justify-between flex-wrap gap-2 px-3 py-2 rounded-xl bg-white/[0.02] border border-white/5 text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <span>
              W tym miesiącu: <strong className="text-white">{currentMonthReleases.length} wydań</strong>
            </span>
            {onlyMySeries && (
              <Badge variant="outline" className="text-[10px] bg-purple-950/40 text-purple-300 border-purple-500/30">
                Filtr mojej półki aktywny
              </Badge>
            )}
          </div>

          {userMonthStats.count > 0 ? (
            <div className="flex items-center gap-1.5 text-emerald-300 font-bold">
              <PiggyBank className="h-3.5 w-3.5 text-emerald-400" />
              <span>
                Twoje premiery: <strong className="text-white">{userMonthStats.count} tomów</strong> (~{userMonthStats.totalPLN.toFixed(2)} PLN)
              </span>
            </div>
          ) : (
            <span className="text-[11px]">Brak premier Twoich zbieranych serii w tym miesiącu.</span>
          )}
        </div>
      </div>

      {/* 5. Main Content Area according to viewMode */}
      <div className={isFullScreen ? '' : 'max-h-[60vh] overflow-y-auto px-1'}>
        {/* ======================================================== */}
        {/* A. WIDOK SIATKI ŚCIENNEJ (WALL CALENDAR GRID)            */}
        {/* ======================================================== */}
        {viewMode === 'grid' && (
          <div className="space-y-2">
            {/* Week days header */}
            <div className="grid grid-cols-7 gap-1 sm:gap-2 text-center text-xs font-bold text-muted-foreground pb-1">
              {weekDayNames.map((wName) => (
                <div key={wName} className="py-1 uppercase text-[11px] tracking-wider text-cyan-300/80">
                  {wName}
                </div>
              ))}
            </div>

            {/* Calendar grid cells */}
            <div className="grid grid-cols-7 gap-1 sm:gap-2">
              {gridData.map((cell, idx) => {
                if (!cell.dayNumber) {
                  return (
                    <div
                      key={`empty-${idx}`}
                      className="min-h-[85px] sm:min-h-[110px] rounded-xl bg-white/[0.01] border border-white/[0.03] opacity-30"
                    />
                  )
                }

                const isToday =
                  now.getFullYear() === year &&
                  now.getMonth() === monthIndex &&
                  now.getDate() === cell.dayNumber

                const hasReleases = cell.releases.length > 0

                return (
                  <div
                    key={`day-${cell.dayNumber}`}
                    className={`min-h-[85px] sm:min-h-[110px] p-1.5 rounded-xl border flex flex-col justify-between transition-all ${
                      isToday
                        ? 'border-cyan-400/80 bg-cyan-950/20 shadow-md shadow-cyan-500/10 ring-1 ring-cyan-400/40'
                        : hasReleases
                        ? 'border-white/10 bg-white/[0.03] hover:border-primary/50 hover:bg-white/[0.06]'
                        : 'border-white/5 bg-white/[0.01] hover:bg-white/[0.02]'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span
                        className={`text-xs font-bold rounded-md px-1.5 py-0.5 ${
                          isToday
                            ? 'bg-cyan-400 text-black font-black'
                            : 'text-muted-foreground'
                        }`}
                      >
                        {cell.dayNumber}
                      </span>
                      {hasReleases && (
                        <span className="text-[10px] font-extrabold text-primary">
                          {cell.releases.length}
                        </span>
                      )}
                    </div>

                    {/* Releases in this day */}
                    <div className="space-y-1 my-1">
                      {cell.releases.slice(0, 2).map((rel) => {
                        const status = getVolumeStatus(rel)
                        return (
                          <div
                            key={rel.id}
                            onClick={() => handleVolumeClick(rel)}
                            className="group/item flex items-center gap-1 p-1 rounded-lg bg-black/40 border border-white/10 hover:border-primary cursor-pointer transition-all"
                            title={`${cleanReleaseTitle(rel.title)} Tom ${rel.volumeNumber} (${rel.publisher})`}
                          >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={rel.coverUrl}
                              alt={rel.title}
                              className="h-5 w-3.5 object-cover rounded shrink-0"
                            />
                            <div className="min-w-0 flex-1">
                              <p className="text-[9px] font-bold text-white truncate group-hover/item:text-cyan-300">
                                {cleanReleaseTitle(rel.title)} {rel.volumeNumber}
                              </p>
                            </div>
                            {status === 'OWNED' ? (
                              <Check className="h-2.5 w-2.5 text-emerald-400 shrink-0" />
                            ) : status === 'WISHLIST' ? (
                              <Heart className="h-2.5 w-2.5 text-purple-400 fill-purple-400 shrink-0" />
                            ) : null}
                          </div>
                        )
                      })}

                      {cell.releases.length > 2 && (
                        <div className="text-[9px] text-center font-bold text-muted-foreground hover:text-white cursor-pointer">
                          +{cell.releases.length - 2} więcej
                        </div>
                      )}
                    </div>

                    <div />
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* B. WIDOK KART MIESIĄCA (MONTH LIST VIEW)                 */}
        {/* ======================================================== */}
        {viewMode === 'month' && (
          <div className="space-y-3">
            {currentMonthReleases.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
                {currentMonthReleases.map((rel) => {
                  const status = getVolumeStatus(rel)
                  const cleanTitle = cleanReleaseTitle(rel.title)

                  return (
                    <div
                      key={rel.id}
                      onClick={() => handleVolumeClick(rel)}
                      className="flex items-center justify-between p-3 rounded-2xl bg-white/[0.03] border border-white/10 hover:border-primary/50 hover:bg-white/[0.06] transition-all cursor-pointer group relative overflow-hidden"
                    >
                      <div className="flex items-center gap-3.5 min-w-0">
                        {/* Cover image */}
                        <div className="relative h-20 w-14 shrink-0 overflow-hidden rounded-xl bg-black border border-white/10 shadow-md">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={rel.coverUrl}
                            alt={rel.title}
                            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                          />
                          <div className="absolute top-1 right-1">
                            <div className={`flex h-4 w-4 items-center justify-center rounded-full ${rel.logoBg} text-[8px] font-black text-white shadow`}>
                              {rel.logoText}
                            </div>
                          </div>
                        </div>

                        {/* Details */}
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-xs font-extrabold text-cyan-300 px-1.5 py-0.5 rounded bg-cyan-950/60 border border-cyan-500/30">
                              {rel.day}
                            </span>
                            <span className="text-[11px] font-bold text-muted-foreground">
                              Tom {rel.volumeNumber}
                            </span>
                            <Badge variant="outline" className="text-[9px] px-1 py-0 border-white/20 text-muted-foreground">
                              {rel.publisher}
                            </Badge>
                          </div>

                          <h4 className="text-sm font-extrabold text-white truncate group-hover:text-primary transition-colors mt-1">
                            {cleanTitle}
                          </h4>

                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-xs text-emerald-400 font-black">
                              {rel.pricePLN.toFixed(2)} PLN
                            </span>

                            {/* Status Badges */}
                            {status === 'OWNED' ? (
                              <Badge className="bg-emerald-950 text-emerald-300 border-emerald-500/40 text-[9px] px-1.5 py-0 gap-1 font-bold">
                                <Check className="h-2.5 w-2.5" /> Posiadany
                              </Badge>
                            ) : status === 'WISHLIST' ? (
                              <Badge className="bg-purple-950 text-purple-300 border-purple-500/40 text-[9px] px-1.5 py-0 gap-1 font-bold">
                                <Heart className="h-2.5 w-2.5 fill-purple-300" /> Na Wishliście
                              </Badge>
                            ) : null}
                          </div>
                        </div>
                      </div>

                      {/* 1-Click Action Buttons */}
                      <div className="flex flex-col gap-1.5 shrink-0 ml-2">
                        <button
                          type="button"
                          onClick={(e) => handleQuickToggle(e, rel, 'WISHLIST')}
                          title={status === 'WISHLIST' ? 'Usuń z Wishlisty' : 'Dodaj do Wishlisty'}
                          className={`flex h-7 w-7 items-center justify-center rounded-xl border transition-all ${
                            status === 'WISHLIST'
                              ? 'bg-purple-600 text-white border-purple-400 shadow-md shadow-purple-600/30'
                              : 'bg-white/5 border-white/10 text-muted-foreground hover:text-white hover:bg-white/10'
                          }`}
                        >
                          <Heart className={`h-3.5 w-3.5 ${status === 'WISHLIST' ? 'fill-white' : ''}`} />
                        </button>

                        <button
                          type="button"
                          onClick={(e) => handleQuickToggle(e, rel, 'OWNED')}
                          title={status === 'OWNED' ? 'Oznacz jako nieposiadany' : 'Oznacz jako posiadany'}
                          className={`flex h-7 w-7 items-center justify-center rounded-xl border transition-all ${
                            status === 'OWNED'
                              ? 'bg-emerald-600 text-white border-emerald-400 shadow-md shadow-emerald-600/30'
                              : 'bg-white/5 border-white/10 text-muted-foreground hover:text-white hover:bg-white/10'
                          }`}
                        >
                          <Check className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="py-16 text-center text-sm text-muted-foreground bg-white/[0.01] rounded-2xl border border-white/5">
                Brak zapowiedzi spełniających wybrane kryteria w {currentMonth} {year}.
              </div>
            )}
          </div>
        )}

        {/* ======================================================== */}
        {/* C. WIDOK TYGODNI (WEEKS BREAKDOWN VIEW)                  */}
        {/* ======================================================== */}
        {viewMode === 'week' && (
          <div className="space-y-5">
            {weekSections.map((sec, sIdx) => (
              <div key={sIdx} className="space-y-3 rounded-2xl bg-white/[0.02] p-4 border border-white/5">
                <div className="flex items-center justify-between pb-2 border-b border-white/10">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-cyan-400" />
                    <h3 className="font-extrabold text-sm text-white">
                      Tydzień {sIdx + 1}: {sec.label}
                    </h3>
                  </div>
                  <Badge className="bg-primary/20 text-primary border-primary/30 text-[10px] font-bold">
                    {sec.releases.length} premier
                  </Badge>
                </div>

                {sec.releases.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                    {sec.releases.map((rel) => {
                      const cleanTitle = cleanReleaseTitle(rel.title)
                      const status = getVolumeStatus(rel)

                      return (
                        <div
                          key={rel.id}
                          onClick={() => handleVolumeClick(rel)}
                          className="p-3 rounded-2xl bg-white/[0.03] border border-white/10 hover:border-primary/50 hover:bg-white/[0.06] transition-all cursor-pointer group flex flex-col justify-between"
                        >
                          <div>
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-[11px] font-bold text-cyan-300 px-2 py-0.5 rounded bg-cyan-950/60 border border-cyan-500/30">
                                {rel.day}
                              </span>
                              <div className={`flex h-5 w-5 items-center justify-center rounded-full ${rel.logoBg} text-[8px] font-black text-white`}>
                                {rel.logoText}
                              </div>
                            </div>

                            <div className="relative aspect-[2/3] w-full overflow-hidden rounded-xl bg-black my-2 shadow">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={rel.coverUrl}
                                alt={rel.title}
                                className="h-full w-full object-cover transition-transform group-hover:scale-105"
                              />
                            </div>

                            <h4 className="font-extrabold text-xs text-white line-clamp-1 group-hover:text-primary transition-colors">
                              {cleanTitle}
                            </h4>
                            <p className="text-[10px] text-muted-foreground mt-0.5">
                              Tom {rel.volumeNumber} • {rel.publisher}
                            </p>
                          </div>

                          <div className="mt-3 flex items-center justify-between pt-2 border-t border-white/5">
                            <span className="text-xs font-black text-emerald-400">
                              {rel.pricePLN.toFixed(2)} PLN
                            </span>

                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={(e) => handleQuickToggle(e, rel, 'WISHLIST')}
                                className={`h-6 w-6 rounded-lg flex items-center justify-center border transition-all ${
                                  status === 'WISHLIST'
                                    ? 'bg-purple-600 text-white border-purple-400'
                                    : 'bg-white/5 text-muted-foreground border-white/10 hover:text-white'
                                }`}
                              >
                                <Heart className={`h-3 w-3 ${status === 'WISHLIST' ? 'fill-white' : ''}`} />
                              </button>

                              <button
                                type="button"
                                onClick={(e) => handleQuickToggle(e, rel, 'OWNED')}
                                className={`h-6 w-6 rounded-lg flex items-center justify-center border transition-all ${
                                  status === 'OWNED'
                                    ? 'bg-emerald-600 text-white border-emerald-400'
                                    : 'bg-white/5 text-muted-foreground border-white/10 hover:text-white'
                                }`}
                              >
                                <Check className="h-3 w-3" />
                              </button>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <div className="py-4 text-center text-xs text-muted-foreground">
                    Brak zaplanowanych premier w tym tygodniu.
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* ======================================================== */}
        {/* D. WIDOK KWARTAŁU (QUARTER 3-MONTHS VIEW)                */}
        {/* ======================================================== */}
        {viewMode === 'quarter' && (
          <div className="space-y-6">
            {quarterMonths.map((qm, qIdx) => (
              <div key={qIdx} className="space-y-3 rounded-2xl bg-white/[0.02] p-4 border border-white/5">
                <div className="flex items-center justify-between pb-2 border-b border-white/10">
                  <div className="flex items-center gap-2">
                    <h3 className="font-extrabold text-base text-white">
                      {qm.name} {qm.year}
                    </h3>
                    <Badge className="bg-primary/20 text-primary border-primary/30 text-[10px]">
                      {qm.releases.length} premier
                    </Badge>
                  </div>
                </div>

                {qm.releases.length > 0 ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
                    {qm.releases.map((rel) => {
                      const cleanTitle = cleanReleaseTitle(rel.title)
                      return (
                        <div
                          key={rel.id}
                          onClick={() => handleVolumeClick(rel)}
                          className="p-2.5 rounded-xl bg-white/[0.03] border border-white/5 hover:border-primary/50 transition-all cursor-pointer group flex flex-col justify-between"
                        >
                          <div className="relative aspect-[2/3] w-full overflow-hidden rounded-lg bg-black shadow-inner">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={rel.coverUrl}
                              alt={rel.title}
                              className="h-full w-full object-cover group-hover:scale-105 transition-transform"
                            />
                            <div className="absolute top-1 right-1">
                              <div className={`flex h-4 w-4 items-center justify-center rounded-full ${rel.logoBg} text-[7px] font-black text-white`}>
                                {rel.logoText}
                              </div>
                            </div>
                          </div>
                          <div className="mt-2">
                            <span className="text-[10px] font-bold text-cyan-300">{rel.day}</span>
                            <h5 className="text-[11px] font-bold text-white truncate group-hover:text-primary transition-colors">
                              {cleanTitle}
                            </h5>
                            <span className="text-[10px] font-semibold text-emerald-400">
                              {rel.pricePLN.toFixed(2)} PLN
                            </span>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <div className="py-4 text-center text-xs text-muted-foreground">
                    Brak zaplanowanych premier w {qm.name} {qm.year}.
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 6. Modal Wyboru Eksportu iCal */}
      <Dialog open={exportModalOpen} onOpenChange={setExportModalOpen}>
        <DialogContent className="max-w-md bg-[#090D18]/98 border-white/15 text-white backdrop-blur-2xl rounded-3xl p-6 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-extrabold flex items-center gap-2 text-white">
              <Download className="h-5 w-5 text-purple-400" />
              Eksport Kalendarza (.ics)
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Dodaj harmonogram premier do swojego Kalendarza Google, Apple Kalendarz lub Outlooka.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 my-4">
            <a
              href={`/api/releases/ical?series=${encodeURIComponent(userSeriesTitles)}`}
              download="moje-premiery-mangi.ics"
              className="block"
            >
              <Button
                type="button"
                className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 font-extrabold text-xs h-11 rounded-xl shadow-lg shadow-purple-600/25 flex items-center justify-between px-4 text-white"
              >
                <div className="flex items-center gap-2">
                  <Heart className="h-4 w-4 fill-white" />
                  <span>Tylko moje serie ({userCollection.length})</span>
                </div>
                <Badge className="bg-black/30 text-white border-0 text-[10px]">Rekomendowane</Badge>
              </Button>
            </a>

            <a
              href="/api/releases/ical"
              download="wszystkie-premiery-mangi.ics"
              className="block"
            >
              <Button
                type="button"
                variant="outline"
                className="w-full bg-white/5 border-white/10 hover:bg-white/10 text-xs font-bold h-11 rounded-xl flex items-center justify-between px-4 text-muted-foreground hover:text-white"
              >
                <div className="flex items-center gap-2">
                  <CalendarIcon className="h-4 w-4 text-cyan-400" />
                  <span>Wszystkie premiery w Polsce</span>
                </div>
                <span className="text-[10px] text-muted-foreground">{allReleases.length} pozycji</span>
              </Button>
            </a>
          </div>

          <div className="text-[11px] text-muted-foreground text-center pt-2 border-t border-white/5">
            Pobrany plik <code>.ics</code> wystarczy otworzyć na telefonie lub komputerze, aby zapisać wydarzenia w kalendarzu.
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
