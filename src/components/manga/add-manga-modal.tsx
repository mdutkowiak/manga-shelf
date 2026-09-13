'use client'

import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Search,
  Plus,
  Check,
  Sparkles,
  Edit2,
  CheckCheck,
  XSquare,
  BookmarkCheck,
  Loader2,
  Tag,
  ArrowLeft,
  X,
  TrendingUp,
} from 'lucide-react'
import { searchManga, getTrendingManga, type AniListManga } from '@/lib/anilist'
import { CoverEditModal } from '@/components/manga/cover-edit-modal'
import type { SeriesDetailData } from '@/components/manga/series-detail-modal'

export interface SelectedMangaState {
  id: string
  title: string
  polishTitle?: string | null
  publisher: string
  coverUrl: string
  totalVolumes: number
  totalVolumesJapan?: number | null
  description: string
}

interface AddMangaModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onAddVolumes: (seriesInfo: {
    mangaId: string
    title: string
    polishTitle?: string | null
    publisher: string
    coverUrl: string
    totalVolumes?: number
    totalVolumesJapan?: number | null
    selectedVolumes: number[]
    volumePrices: Record<number, number>
    defaultPrice: number
  }) => void
  initialSeries?: SeriesDetailData | null
  isAdmin?: boolean
}

const POPULAR_SUGGESTIONS = [
  'Chainsaw Man',
  'Berserk',
  'Jujutsu Kaisen',
  'One Piece',
  'Frieren',
  'Attack on Titan',
  'Dandadan',
  'Oshi no Ko',
  'Spy x Family',
  'Tokyo Ghoul',
  'Solo Leveling',
  'Demon Slayer',
]

const PUBLISHERS = [
  'Waneko',
  'J.P.Fantastica',
  'Studio JG',
  'Kotori',
  'Dango',
  'Hanami',
  'Yatta',
  'Egmont',
  'Inne',
]

export function AddMangaModal({
  open,
  onOpenChange,
  onAddVolumes,
  initialSeries = null,
  isAdmin = true,
}: AddMangaModalProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<any[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [trendingManga, setTrendingManga] = useState<AniListManga[]>([])
  const [isLoadingTrending, setIsLoadingTrending] = useState(false)

  // Step 2 Selected Manga state - defaults to null so Step 1 Search is shown!
  const [selectedManga, setSelectedManga] = useState<SelectedMangaState | null>(null)

  // Selected volume numbers set & custom per-volume prices dictionary
  const [selectedVolumes, setSelectedVolumes] = useState<Set<number>>(new Set())
  const [defaultPrice, setDefaultPrice] = useState('34.99')
  const [volumePrices, setVolumePrices] = useState<Record<number, number>>({})

  // Range controls
  const [rangeStart, setRangeStart] = useState('1')
  const [rangeEnd, setRangeEnd] = useState('10')
  const [rangePrice, setRangePrice] = useState('29.99')

  // Editing individual volume price modal/popover
  const [editingVolPriceNum, setEditingVolPriceNum] = useState<number | null>(null)
  const [editingVolPriceVal, setEditingVolPriceVal] = useState('')

  // Cover Edit Modal for Admin
  const [coverEditOpen, setCoverEditOpen] = useState(false)

  // Reset or initialize state whenever modal opens or initialSeries changes
  useEffect(() => {
    if (open) {
      if (initialSeries) {
        setSelectedManga({
          id: initialSeries.mangaId,
          title: initialSeries.title,
          polishTitle: (initialSeries as any).polishTitle || null,
          publisher: initialSeries.publisher || 'Waneko',
          coverUrl: initialSeries.coverUrl,
          totalVolumes: initialSeries.totalVolumes || 20,
          totalVolumesJapan: (initialSeries as any).totalVolumesJapan ?? null,
          description: initialSeries.description || `Oficjalne wydanie ${initialSeries.title}.`,
        })

        const defaultSet = new Set<number>()
        for (let i = 1; i <= Math.min(5, initialSeries.totalVolumes || 20); i++) {
          defaultSet.add(i)
        }
        setSelectedVolumes(defaultSet)
        setSearchQuery('')
        setSearchResults([])
      } else {
        // Clear all selected manga and volumes so user starts fresh in Step 1 Search
        setSelectedManga(null)
        setSelectedVolumes(new Set())
        setVolumePrices({})
        setSearchQuery('')
        setSearchResults([])
      }
    }
  }, [open, initialSeries])

  // Load trending manga for quick suggestions when modal opens without a selected manga
  useEffect(() => {
    if (open && !selectedManga && trendingManga.length === 0) {
      setIsLoadingTrending(true)
      getTrendingManga(1, 6)
        .then((res) => {
          setTrendingManga(res.data?.Page?.media || [])
        })
        .catch((err) => {
          console.error('Błąd ładowania popularnych mang:', err)
        })
        .finally(() => {
          setIsLoadingTrending(false)
        })
    }
  }, [open, selectedManga, trendingManga.length])

  // Live search handler with debounce using unified /api/manga/search endpoint
  useEffect(() => {
    if (!searchQuery.trim() || searchQuery.trim().length < 2) {
      const resetTimer = setTimeout(() => {
        setSearchResults([])
      }, 0)
      return () => clearTimeout(resetTimer)
    }

    const timer = setTimeout(async () => {
      setIsSearching(true)
      try {
        const res = await fetch(`/api/manga/search?q=${encodeURIComponent(searchQuery.trim())}`)
        if (res.ok) {
          const data = await res.json()
          setSearchResults(data.mangas || [])
        } else {
          const results = await searchManga(searchQuery.trim(), 1, 9)
          setSearchResults((results.data?.Page?.media || []) as any)
        }
      } catch (err) {
        console.error('Błąd wyszukiwania:', err)
      } finally {
        setIsSearching(false)
      }
    }, 280)

    return () => clearTimeout(timer)
  }, [searchQuery])

  const handleSelectSearchResult = (manga: any) => {
    const rawTitle = manga.title?.romaji || manga.title?.english || manga.title?.native || (typeof manga.title === 'string' ? manga.title : 'Manga')
    const polishTitle = manga.polishTitle || null
    const total = manga.totalVolumes || (manga.volumes && manga.volumes > 0 ? manga.volumes : 1)
    const totalJP = manga.totalVolumesJapan || (manga.volumes && manga.volumes > 0 ? manga.volumes : null)
    const cover =
      manga.coverUrl ||
      manga.coverImage?.extraLarge ||
      manga.coverImage?.large ||
      ''

    setSelectedManga({
      id: String(manga.id),
      title: rawTitle,
      polishTitle: polishTitle,
      publisher: manga.publisher || 'Inne',
      coverUrl: cover,
      totalVolumes: total,
      totalVolumesJapan: totalJP,
      description: (typeof manga.description === 'string' ? manga.description : '')?.replace(/<[^>]+>/g, '') || 'Opis serii mangi.',
    })

    // Start with empty volume set so user explicitly marks what they own
    setSelectedVolumes(new Set())
    setVolumePrices({})
    setSearchQuery('')
    setSearchResults([])
    setRangeStart('1')
    setRangeEnd(String(Math.min(10, total)))
  }

  const toggleVolume = (volNum: number) => {
    setSelectedVolumes((prev) => {
      const next = new Set(prev)
      if (next.has(volNum)) {
        next.delete(volNum)
      } else {
        next.add(volNum)
      }
      return next
    })
  }

  const selectAllVolumes = () => {
    if (!selectedManga) return
    const all = new Set<number>()
    for (let i = 1; i <= selectedManga.totalVolumes; i++) {
      all.add(i)
    }
    setSelectedVolumes(all)
  }

  const deselectAllVolumes = () => {
    setSelectedVolumes(new Set())
  }

  // 1. Select Range ONLY
  const handleSelectRangeOnly = () => {
    if (!selectedManga) return
    const start = parseInt(rangeStart, 10) || 1
    const end = parseInt(rangeEnd, 10) || selectedManga.totalVolumes

    const nextVolumes = new Set(selectedVolumes)
    for (let i = Math.min(start, end); i <= Math.max(start, end); i++) {
      if (i >= 1 && i <= selectedManga.totalVolumes) {
        nextVolumes.add(i)
      }
    }

    setSelectedVolumes(nextVolumes)
  }

  // 2. Set Custom Price for Range ONLY
  const handleSetRangePriceOnly = () => {
    if (!selectedManga) return
    const start = parseInt(rangeStart, 10) || 1
    const end = parseInt(rangeEnd, 10) || selectedManga.totalVolumes
    const priceVal = parseFloat(rangePrice.replace(',', '.')) || parseFloat(defaultPrice.replace(',', '.')) || 34.99

    const nextPrices = { ...volumePrices }
    for (let i = Math.min(start, end); i <= Math.max(start, end); i++) {
      if (i >= 1 && i <= selectedManga.totalVolumes) {
        nextPrices[i] = priceVal
      }
    }

    setVolumePrices(nextPrices)
  }

  // Set single volume price
  const handleSaveSingleVolumePrice = (volNum: number) => {
    const pVal = parseFloat(editingVolPriceVal.replace(',', '.'))
    if (!isNaN(pVal) && pVal >= 0) {
      setVolumePrices((prev) => ({ ...prev, [volNum]: pVal }))
    }
    setEditingVolPriceNum(null)
  }

  const handleSaveToCollection = () => {
    if (!selectedManga) return
    const parsedDefaultPrice = parseFloat(defaultPrice.replace(',', '.')) || 34.99
    onAddVolumes({
      mangaId: selectedManga.id,
      title: selectedManga.title,
      polishTitle: selectedManga.polishTitle || null,
      publisher: selectedManga.publisher,
      coverUrl: selectedManga.coverUrl,
      totalVolumes: selectedManga.totalVolumes,
      totalVolumesJapan: selectedManga.totalVolumesJapan || selectedManga.totalVolumes,
      selectedVolumes: Array.from(selectedVolumes).sort((a, b) => a - b),
      volumePrices,
      defaultPrice: parsedDefaultPrice,
    })
    onOpenChange(false)
  }

  const volumesArray = selectedManga
    ? Array.from({ length: selectedManga.totalVolumes }, (_, i) => i + 1)
    : []
  const fallbackDefPrice = parseFloat(defaultPrice.replace(',', '.')) || 34.99

  // Calculate total price based on individual volume prices or default fallback price
  const totalPrice = Array.from(selectedVolumes)
    .reduce((sum, volNum) => sum + (volumePrices[volNum] ?? fallbackDefPrice), 0)
    .toFixed(2)

  return (
    <>
      {/* Admin Cover Edit Modal with Cropping (only when a manga is selected) */}
      {selectedManga && (
        <CoverEditModal
          open={coverEditOpen}
          onOpenChange={setCoverEditOpen}
          currentCoverUrl={selectedManga.coverUrl}
          title={selectedManga.title}
          volumeNumber={1}
          publisher={selectedManga.publisher}
          onCoverUpdated={(newCover) => {
            setSelectedManga((prev) => (prev ? { ...prev, coverUrl: newCover } : null))
          }}
        />
      )}

      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl sm:max-w-5xl bg-[#090D18]/95 border-white/15 text-white backdrop-blur-3xl shadow-2xl rounded-3xl p-0 overflow-hidden max-h-[92vh] flex flex-col">
          {/* HEADER */}
          <div className="p-6 pb-4 border-b border-white/10 bg-gradient-to-r from-cyan-950/40 via-[#0B1020] to-purple-950/30 shrink-0">
            <DialogHeader>
              <div className="flex items-center justify-between gap-2 mb-1">
                <div className="inline-flex items-center gap-1.5 rounded-full border border-cyan-500/30 bg-cyan-500/10 px-3 py-0.5 text-[11px] font-bold text-cyan-300">
                  <Sparkles className="h-3 w-3" />
                  <span>
                    {selectedManga
                      ? 'Krok 2 z 2 • Wybór Posiadanych Tomów'
                      : 'Krok 1 z 2 • Wyszukaj Serię Mangi'}
                  </span>
                </div>

                {selectedManga && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setSelectedManga(null)
                      setSearchQuery('')
                    }}
                    className="h-7 px-2.5 text-[11px] font-bold text-cyan-300 hover:text-white hover:bg-cyan-500/20 rounded-xl gap-1.5 border border-cyan-500/30"
                  >
                    <ArrowLeft className="h-3.5 w-3.5" />
                    <span>Zmień serię</span>
                  </Button>
                )}
              </div>

              <DialogTitle className="text-xl sm:text-2xl font-extrabold text-white">
                {selectedManga ? selectedManga.title : 'Dodaj Nową Mangę do Półki'}
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                {selectedManga
                  ? 'Zaznacz tomy, które posiadasz, dostosuj domyślną cenę i wydawcę'
                  : 'Wpisz tytuł mangi, aby dynamicznie przeszukać bazę AniList'}
              </DialogDescription>
            </DialogHeader>

            {/* Step 1: Live Search Input Bar */}
            {!selectedManga && (
              <div className="relative mt-4">
                <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-cyan-400" />
                <Input
                  autoFocus
                  placeholder="Wpisz tytuł mangi (np. Chainsaw Man, Berserk, Frieren, Dandadan)..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="bg-white/5 border-white/20 text-white pl-10 pr-10 text-sm h-11 rounded-2xl placeholder:text-muted-foreground/70 focus-visible:ring-cyan-500/40 focus-visible:border-cyan-400"
                />
                {isSearching ? (
                  <Loader2 className="absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-cyan-400" />
                ) : searchQuery ? (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchQuery('')
                      setSearchResults([])
                    }}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-white"
                  >
                    <X className="h-4 w-4" />
                  </button>
                ) : null}
              </div>
            )}
          </div>

          {/* ========================================================= */}
          {/* STEP 1: MANGA SEARCH & SELECTION VIEW                    */}
          {/* ========================================================= */}
          {!selectedManga ? (
            <div className="p-6 overflow-y-auto space-y-6 flex-1">
              {/* If user is typing and results are present */}
              {searchQuery.trim().length >= 2 ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                      Wyniki wyszukiwania dla &quot;{searchQuery}&quot;
                    </span>
                    {searchResults.length > 0 && (
                      <span className="text-xs text-cyan-400 font-semibold">
                        Znaleziono {searchResults.length}
                      </span>
                    )}
                  </div>

                  {isSearching ? (
                    <div className="py-16 flex flex-col items-center justify-center text-center space-y-3">
                      <Loader2 className="h-8 w-8 animate-spin text-cyan-400" />
                      <p className="text-xs text-muted-foreground">Przeszukiwanie bazy AniList...</p>
                    </div>
                  ) : searchResults.length > 0 ? (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {searchResults.map((manga) => {
                        const primaryTitle = manga.primaryTitle || manga.polishTitle || manga.title?.english || manga.title?.romaji || (typeof manga.title === 'string' ? manga.title : 'Manga')
                        const secondaryTitle = manga.secondaryTitle || (manga.polishTitle && manga.polishTitle !== manga.title ? (typeof manga.title === 'string' ? manga.title : manga.title?.romaji) : null)
                        const cover = manga.coverUrl || manga.coverImage?.extraLarge || manga.coverImage?.large || ''
                        const vols = manga.totalVolumes ? `${manga.totalVolumes} tomów w PL` : (manga.volumes ? `${manga.volumes} tomów` : 'W trakcie')
                        const statusLabel =
                          manga.status === 'FINISHED'
                            ? 'Zakończona'
                            : manga.status === 'RELEASING'
                            ? 'Wydawana'
                            : manga.publisher || manga.status || 'Manga'

                        return (
                          <button
                            key={manga.id}
                            type="button"
                            onClick={() => handleSelectSearchResult(manga)}
                            className={`group relative flex flex-col overflow-hidden rounded-2xl border p-2.5 text-left transition-all duration-200 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-cyan-400 ${
                              manga.polishTitle
                                ? 'border-rose-500/40 bg-rose-950/10 hover:border-rose-400 hover:bg-rose-950/20 hover:shadow-rose-500/10'
                                : 'border-white/10 bg-white/[0.03] hover:border-cyan-400/60 hover:bg-cyan-950/30 hover:shadow-cyan-500/10'
                            }`}
                          >
                            <div className="relative aspect-[2/3] w-full overflow-hidden rounded-xl bg-black/40 shadow-inner">
                              {cover ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                  src={cover}
                                  alt={primaryTitle}
                                  className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                                />
                              ) : (
                                <div className="flex h-full w-full items-center justify-center text-muted-foreground text-xs">
                                  Brak okładki
                                </div>
                              )}
                              <div className="absolute top-2 right-2 rounded-full bg-black/75 backdrop-blur-md px-2 py-0.5 text-[9px] font-extrabold text-cyan-300 border border-white/10">
                                {vols}
                              </div>
                              {manga.polishTitle && (
                                <div className="absolute top-2 left-2 rounded-full bg-rose-950/80 backdrop-blur-md px-2 py-0.5 text-[9px] font-extrabold text-rose-300 border border-rose-500/30">
                                  🇵🇱 PL
                                </div>
                              )}
                            </div>

                            <div className="mt-2.5 flex-1 min-w-0">
                              <h4 className="font-extrabold text-xs text-white line-clamp-1 group-hover:text-cyan-300 transition-colors">
                                {primaryTitle}
                              </h4>
                              {secondaryTitle && (
                                <p className="text-[10px] text-muted-foreground/80 truncate mt-0.5">
                                  {secondaryTitle}
                                </p>
                              )}
                              <p className="text-[10px] text-cyan-400/80 font-medium truncate mt-0.5">
                                {manga.publisher ? `Wydawnictwo: ${manga.publisher}` : statusLabel}
                              </p>
                            </div>

                            <div className="mt-2 flex items-center justify-between pt-1.5 border-t border-white/5 text-[10px] font-bold text-cyan-400 group-hover:translate-x-0.5 transition-transform">
                              <span>Wybierz serię</span>
                              <span>→</span>
                            </div>
                          </button>
                        )
                      })}
                    </div>
                  ) : (
                    <div className="py-16 text-center space-y-2">
                      <p className="text-sm font-semibold text-white">
                        Brak wyników dla &quot;{searchQuery}&quot;
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Spróbuj wpisać angielski lub oficjalny tytuł mangi (np. One Piece, Jujutsu
                        Kaisen).
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                /* Search input empty: show suggestions & popular titles */
                <div className="space-y-6">
                  {/* Quick Clickable Suggestions */}
                  <div className="space-y-2.5">
                    <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block">
                      Szybkie propozycje (kliknij aby wyszukać):
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {POPULAR_SUGGESTIONS.map((tag) => (
                        <button
                          key={tag}
                          type="button"
                          onClick={() => setSearchQuery(tag)}
                          className="rounded-xl bg-white/5 hover:bg-cyan-500/20 hover:border-cyan-500/40 border border-white/10 px-3 py-1.5 text-xs font-semibold text-white/90 hover:text-cyan-300 transition-all shadow-sm"
                        >
                          {tag}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Trending Manga Grid */}
                  <div className="space-y-3">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-white uppercase tracking-wider">
                      <TrendingUp className="h-4 w-4 text-cyan-400" />
                      <span>Popularne i polecane mangi</span>
                    </div>

                    {isLoadingTrending ? (
                      <div className="py-10 flex justify-center">
                        <Loader2 className="h-6 w-6 animate-spin text-cyan-400" />
                      </div>
                    ) : trendingManga.length > 0 ? (
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                        {trendingManga.map((manga) => {
                          const title =
                            manga.title.romaji || manga.title.english || manga.title.native || 'Manga'
                          const cover =
                            manga.coverImage?.extraLarge || manga.coverImage?.large || ''
                          const vols = manga.volumes
                            ? `${manga.volumes} tomów`
                            : 'W trakcie'

                          return (
                            <button
                              key={manga.id}
                              type="button"
                              onClick={() => handleSelectSearchResult(manga)}
                              className="group relative flex flex-col overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] p-2.5 text-left transition-all duration-200 hover:border-cyan-400/60 hover:bg-cyan-950/30 hover:shadow-lg hover:shadow-cyan-500/10 focus:outline-none focus:ring-2 focus:ring-cyan-400"
                            >
                              <div className="relative aspect-[2/3] w-full overflow-hidden rounded-xl bg-black/40 shadow-inner">
                                {cover && (
                                  // eslint-disable-next-line @next/next/no-img-element
                                  <img
                                    src={cover}
                                    alt={title}
                                    className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                                  />
                                )}
                                <div className="absolute top-2 right-2 rounded-full bg-black/75 backdrop-blur-md px-2 py-0.5 text-[9px] font-extrabold text-cyan-300 border border-white/10">
                                  {vols}
                                </div>
                              </div>

                              <div className="mt-2 flex-1 min-w-0">
                                <h4 className="font-extrabold text-xs text-white truncate group-hover:text-cyan-300 transition-colors">
                                  {title}
                                </h4>
                                <p className="text-[10px] text-muted-foreground truncate mt-0.5">
                                  {manga.status === 'FINISHED' ? 'Zakończona' : 'Wydawana'}
                                </p>
                              </div>

                              <div className="mt-2 flex items-center justify-between pt-1.5 border-t border-white/5 text-[10px] font-bold text-cyan-400 group-hover:translate-x-0.5 transition-transform">
                                <span>Wybierz serię</span>
                                <span>→</span>
                              </div>
                            </button>
                          )
                        })}
                      </div>
                    ) : null}
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* ========================================================= */
            /* STEP 2: VOLUME SELECTION & PRICING VIEW                  */
            /* ========================================================= */
            <div className="p-6 overflow-y-auto space-y-5 flex-1">
              {/* Selected Manga Info Card */}
              <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 p-4 rounded-2xl bg-white/[0.03] border border-white/10">
                {/* Cover with Admin Pencil Icon */}
                <div className="relative aspect-[2/3] w-24 shrink-0 overflow-hidden rounded-xl border border-white/15 bg-black shadow-xl group">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={selectedManga.coverUrl}
                    alt={selectedManga.title}
                    className="h-full w-full object-cover"
                  />

                  {/* Admin Pencil Button */}
                  {isAdmin && (
                    <button
                      type="button"
                      onClick={() => setCoverEditOpen(true)}
                      className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-white gap-1 text-[10px] font-bold"
                      title="Zmień lub wykadruj okładkę"
                    >
                      <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-white shadow-md">
                        <Edit2 className="h-3.5 w-3.5" />
                      </div>
                      <span>Zmień</span>
                    </button>
                  )}
                </div>

                {/* Series Details */}
                <div className="space-y-2 flex-1 min-w-0 text-center sm:text-left">
                  <div className="flex items-center justify-center sm:justify-start gap-2 flex-wrap">
                    <Badge className="bg-primary/20 text-primary border-primary/30 text-[10px]">
                      {selectedManga.publisher}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      Tomów w serii: {selectedManga.totalVolumes}
                    </span>
                    {isAdmin && (
                      <button
                        onClick={() => setCoverEditOpen(true)}
                        className="text-[10px] text-cyan-300 hover:underline inline-flex items-center gap-1 font-semibold"
                      >
                        <Edit2 className="h-2.5 w-2.5" /> Edytuj okładkę (Admin)
                      </button>
                    )}
                  </div>

                  <h3 className="text-base font-extrabold text-white truncate">
                    {selectedManga.title}
                  </h3>
                  <p className="text-xs text-muted-foreground line-clamp-2">
                    {selectedManga.description}
                  </p>

                  {/* Publisher, Total Volumes & Default Price per volume inputs */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-2">
                    <div>
                      <Label className="text-[10px] text-muted-foreground block mb-1">
                        Polski Wydawca
                      </Label>
                      <select
                        value={selectedManga.publisher}
                        onChange={(e) =>
                          setSelectedManga({ ...selectedManga, publisher: e.target.value })
                        }
                        className="w-full h-8 rounded-xl bg-white/5 border border-white/15 text-xs text-white px-2.5 focus:outline-none focus:border-primary"
                      >
                        {PUBLISHERS.map((pub) => (
                          <option key={pub} value={pub} className="bg-[#090D18]">
                            {pub}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <Label className="text-[10px] text-muted-foreground block mb-1">
                        Liczba tomów w serii
                      </Label>
                      <Input
                        type="number"
                        min="1"
                        max="300"
                        value={selectedManga.totalVolumes}
                        onChange={(e) => {
                          const val = parseInt(e.target.value, 10)
                          if (!isNaN(val) && val > 0) {
                            setSelectedManga({ ...selectedManga, totalVolumes: val })
                          }
                        }}
                        className="h-8 bg-white/5 border-white/15 text-xs rounded-xl text-white font-bold"
                      />
                    </div>

                    <div>
                      <Label className="text-[10px] text-muted-foreground block mb-1">
                        Domyślna cena tomu (PLN)
                      </Label>
                      <Input
                        type="text"
                        inputMode="decimal"
                        value={defaultPrice}
                        onChange={(e) => setDefaultPrice(e.target.value)}
                        className="h-8 bg-white/5 border-white/15 text-xs rounded-xl text-white font-bold"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Quick Multi-Volume Selection Actions */}
              <div className="space-y-3 pt-1">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <Label className="text-xs font-extrabold text-white uppercase tracking-wider flex items-center gap-1.5">
                    <BookmarkCheck className="h-4 w-4 text-cyan-400" />
                    Zaklikaj posiadane tomy ({selectedVolumes.size} / {selectedManga.totalVolumes})
                  </Label>

                  <div className="flex items-center gap-1.5 flex-wrap">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const s = new Set<number>()
                        for (let i = 1; i <= Math.min(5, selectedManga.totalVolumes); i++) s.add(i)
                        setSelectedVolumes(s)
                      }}
                      className="h-7 px-2 text-[10px] bg-white/5 border-white/15 hover:bg-white/10 text-white font-bold rounded-lg"
                    >
                      1–5
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const s = new Set<number>()
                        for (let i = 1; i <= Math.min(10, selectedManga.totalVolumes); i++) s.add(i)
                        setSelectedVolumes(s)
                      }}
                      className="h-7 px-2 text-[10px] bg-white/5 border-white/15 hover:bg-white/10 text-white font-bold rounded-lg"
                    >
                      1–10
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={selectAllVolumes}
                      className="h-7 px-2 text-[10px] bg-white/5 border-white/15 hover:bg-white/10 text-white font-bold rounded-lg"
                    >
                      <CheckCheck className="h-3 w-3 mr-1 text-cyan-400" />
                      Wszystkie
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={deselectAllVolumes}
                      className="h-7 px-2 text-[10px] bg-white/5 border-white/15 hover:bg-white/10 text-white font-bold rounded-lg"
                    >
                      <XSquare className="h-3 w-3 mr-1 text-rose-400" />
                      Odznacz
                    </Button>
                  </div>
                </div>

                {/* Range Selector & Range Price Setter */}
                <div className="p-3 rounded-xl bg-white/[0.03] border border-white/10 text-xs space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-extrabold text-cyan-300 flex items-center gap-1">
                      <Tag className="h-3.5 w-3.5" />
                      Ustaw zaklikanie i cenę dla zakresu tomów:
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <div className="flex items-center gap-1">
                      <span className="text-[10px] text-muted-foreground">Od:</span>
                      <Input
                        type="number"
                        min="1"
                        max={selectedManga.totalVolumes}
                        value={rangeStart}
                        onChange={(e) => setRangeStart(e.target.value)}
                        className="h-7 w-14 bg-white/5 border-white/15 text-center text-xs p-0 rounded-lg text-white"
                      />
                    </div>

                    <div className="flex items-center gap-1">
                      <span className="text-[10px] text-muted-foreground">do:</span>
                      <Input
                        type="number"
                        min="1"
                        max={selectedManga.totalVolumes}
                        value={rangeEnd}
                        onChange={(e) => setRangeEnd(e.target.value)}
                        className="h-7 w-14 bg-white/5 border-white/15 text-center text-xs p-0 rounded-lg text-white"
                      />
                    </div>

                    <div className="flex items-center gap-1">
                      <span className="text-[10px] text-muted-foreground">Cena (zł):</span>
                      <Input
                        type="text"
                        inputMode="decimal"
                        value={rangePrice}
                        onChange={(e) => setRangePrice(e.target.value)}
                        className="h-7 w-20 bg-white/5 border-white/15 text-center text-xs font-bold p-0 rounded-lg text-emerald-400"
                      />
                    </div>

                    <div className="flex items-center gap-1.5 ml-auto">
                      <Button
                        type="button"
                        size="sm"
                        onClick={handleSelectRangeOnly}
                        className="h-7 text-xs bg-cyan-600 hover:bg-cyan-500 text-white px-3 font-bold rounded-lg shadow-md"
                      >
                        Zaznacz Zakres
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        onClick={handleSetRangePriceOnly}
                        className="h-7 text-xs bg-emerald-600 hover:bg-emerald-500 text-white px-3 font-bold rounded-lg shadow-md"
                      >
                        Ustaw Cenę Zakresu
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Interactive Volume Tiles Grid (Zaklikiwanie & Cena per Tom) */}
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-7 gap-3 pt-1">
                  {volumesArray.map((volNum) => {
                    const isChecked = selectedVolumes.has(volNum)
                    const vPrice = volumePrices[volNum] ?? fallbackDefPrice
                    const isEditingThis = editingVolPriceNum === volNum

                    return (
                      <div key={volNum} className="relative group">
                        <button
                          type="button"
                          onClick={() => toggleVolume(volNum)}
                          className={`relative flex w-full flex-col items-center justify-center p-3 py-3.5 rounded-2xl border-2 min-h-[86px] transition-all duration-200 focus:outline-none ${
                            isChecked
                              ? 'border-cyan-400 bg-cyan-950/60 text-white ring-2 ring-cyan-400/40 shadow-lg shadow-cyan-500/20 scale-[1.02]'
                              : 'border-white/10 bg-white/[0.03] text-muted-foreground hover:text-white hover:border-white/30 hover:bg-white/[0.06]'
                          }`}
                        >
                          {/* Check badge */}
                          <div
                            className={`absolute top-1.5 right-1.5 flex h-4 w-4 items-center justify-center rounded-full text-[8px] font-black transition-all ${
                              isChecked
                                ? 'bg-cyan-400 text-black shadow-md'
                                : 'bg-white/10 text-white/40'
                            }`}
                          >
                            {isChecked ? <Check className="h-2.5 w-2.5 stroke-[3]" /> : volNum}
                          </div>

                          <span className="text-[11px] font-semibold text-muted-foreground block">
                            Tom
                          </span>
                          <span className="text-lg font-black text-white leading-tight">{volNum}</span>
                          <span className="text-[11px] font-bold text-emerald-400 mt-0.5 tracking-tight whitespace-nowrap">
                            {vPrice.toFixed(2)} zł
                          </span>
                        </button>

                        {/* Quick Single-Volume Price Edit trigger */}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            setEditingVolPriceNum(volNum)
                            setEditingVolPriceVal(String(vPrice))
                          }}
                          className="absolute bottom-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity p-1 bg-black/80 rounded-md border border-white/20 text-[9px] text-cyan-300 hover:text-white"
                          title="Zmień cenę tego tomu"
                        >
                          <Edit2 className="h-2.5 w-2.5" />
                        </button>

                        {/* Single volume price inline popup input */}
                        {isEditingThis && (
                          <div className="absolute inset-0 z-30 bg-[#090D18] rounded-2xl border-2 border-cyan-400 p-2 flex flex-col justify-between shadow-2xl">
                            <span className="text-[9px] font-bold text-cyan-300 text-center">
                              Cena T.{volNum}
                            </span>
                            <Input
                              type="number"
                              step="0.01"
                              value={editingVolPriceVal}
                              onChange={(e) => setEditingVolPriceVal(e.target.value)}
                              className="h-6 text-center text-xs p-0 bg-white/10 text-emerald-400 font-bold"
                            />
                            <div className="flex gap-1">
                              <Button
                                size="sm"
                                onClick={() => handleSaveSingleVolumePrice(volNum)}
                                className="h-5 w-full text-[8px] p-0 bg-emerald-600 font-bold"
                              >
                                OK
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          )}

          {/* FOOTER */}
          <div className="p-4 border-t border-white/10 bg-[#070A12] flex items-center justify-between shrink-0">
            {selectedManga ? (
              <>
                <div>
                  <span className="text-xs text-muted-foreground block">
                    Zaznaczono:{' '}
                    <strong className="text-cyan-300 font-extrabold">
                      {selectedVolumes.size} tomów
                    </strong>
                  </span>
                  <span className="text-xs text-muted-foreground">
                    Szacowana wartość:{' '}
                    <strong className="text-emerald-400 font-extrabold">
                      {totalPrice} PLN
                    </strong>
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    onClick={() => {
                      setSelectedManga(null)
                      setSearchQuery('')
                    }}
                    className="text-xs text-muted-foreground hover:text-white"
                  >
                    Wróć do wyszukiwania
                  </Button>
                  <Button
                    onClick={handleSaveToCollection}
                    disabled={selectedVolumes.size === 0}
                    className="text-xs font-bold bg-gradient-to-r from-primary to-cyan-500 hover:from-primary/90 text-white px-6 rounded-xl shadow-lg shadow-primary/30 disabled:opacity-50"
                  >
                    <Plus className="mr-1.5 h-3.5 w-3.5" />
                    Dodaj ({selectedVolumes.size}) do Kolekcji
                  </Button>
                </div>
              </>
            ) : (
              <div className="flex items-center justify-between w-full">
                <span className="text-xs text-muted-foreground">
                  Wybierz mangę z listy powyżej lub wpisz tytuł w wyszukiwarce
                </span>
                <Button
                  variant="ghost"
                  onClick={() => onOpenChange(false)}
                  className="text-xs text-muted-foreground hover:text-white"
                >
                  Zamknij
                </Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
