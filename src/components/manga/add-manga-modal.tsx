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
} from 'lucide-react'
import { searchManga, type AniListManga } from '@/lib/anilist'
import { CoverEditModal } from '@/components/manga/cover-edit-modal'
import type { SeriesDetailData } from '@/components/manga/series-detail-modal'

interface AddMangaModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onAddVolumes: (seriesInfo: {
    mangaId: string
    title: string
    publisher: string
    coverUrl: string
    selectedVolumes: number[]
    volumePrices: Record<number, number>
    defaultPrice: number
  }) => void
  initialSeries?: SeriesDetailData | null
  isAdmin?: boolean
}

export function AddMangaModal({
  open,
  onOpenChange,
  onAddVolumes,
  initialSeries = null,
  isAdmin = true,
}: AddMangaModalProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<AniListManga[]>([])
  const [isSearching, setIsSearching] = useState(false)

  // Selected Manga state
  const [selectedManga, setSelectedManga] = useState<{
    id: string
    title: string
    publisher: string
    coverUrl: string
    totalVolumes: number
    description: string
  }>({
    id: '132182',
    title: 'Bleach',
    publisher: 'J.P.Fantastica',
    coverUrl: 'https://s4.anilist.co/file/anilistcdn/media/manga/cover/large/bx30012-7Uo49q0iX6qX.jpg',
    totalVolumes: 74,
    description: 'Przygodowa historia Ichigo Kurosaki, który staje się Zastępczym Shinigami.',
  })

  // Selected volume numbers set & custom per-volume prices dictionary
  const [selectedVolumes, setSelectedVolumes] = useState<Set<number>>(new Set([1, 2, 3, 4, 5]))
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

  // Sync initialSeries prop whenever modal opens or initialSeries changes!
  useEffect(() => {
    if (open && initialSeries) {
      const timer = setTimeout(() => {
        setSelectedManga({
          id: initialSeries.mangaId,
          title: initialSeries.title,
          publisher: initialSeries.publisher || 'J.P.Fantastica',
          coverUrl: initialSeries.coverUrl,
          totalVolumes: initialSeries.totalVolumes || 20,
          description: initialSeries.description || `Oficjalne wydanie ${initialSeries.title}.`,
        })

        // Select first 5 volumes by default
        const defaultSet = new Set<number>()
        for (let i = 1; i <= Math.min(5, initialSeries.totalVolumes); i++) {
          defaultSet.add(i)
        }
        setSelectedVolumes(defaultSet)
        setSearchQuery('')
      }, 0)
      return () => clearTimeout(timer)
    }
  }, [open, initialSeries])

  // Live search handler
  useEffect(() => {
    if (!searchQuery.trim() || searchQuery.length < 2) {
      const resetTimer = setTimeout(() => {
        setSearchResults([])
      }, 0)
      return () => clearTimeout(resetTimer)
    }

    const timer = setTimeout(async () => {
      setIsSearching(true)
      try {
        const results = await searchManga(searchQuery, 1, 6)
        setSearchResults(results.data?.Page?.media || [])
      } catch (err) {
        console.error('Error searching:', err)
      } finally {
        setIsSearching(false)
      }
    }, 300)

    return () => clearTimeout(timer)
  }, [searchQuery])

  const handleSelectSearchResult = (manga: AniListManga) => {
    const title = manga.title.romaji || manga.title.english || manga.title.native || 'Manga'
    const total = manga.volumes || 20
    const cover = manga.coverImage?.extraLarge || manga.coverImage?.large || 'https://s4.anilist.co/file/anilistcdn/media/manga/cover/large/bx30012-7Uo49q0iX6qX.jpg'

    setSelectedManga({
      id: String(manga.id),
      title,
      publisher: 'Waneko',
      coverUrl: cover,
      totalVolumes: total > 0 ? total : 20,
      description: manga.description?.replace(/<[^>]+>/g, '') || 'Opis serii mangi.',
    })

    // Default select first volume
    setSelectedVolumes(new Set([1]))
    setSearchQuery('')
    setSearchResults([])
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
    const all = new Set<number>()
    for (let i = 1; i <= selectedManga.totalVolumes; i++) {
      all.add(i)
    }
    setSelectedVolumes(all)
  }

  const deselectAllVolumes = () => {
    setSelectedVolumes(new Set())
  }

  // 1. Select Range ONLY (without changing prices)
  const handleSelectRangeOnly = () => {
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
    const start = parseInt(rangeStart, 10) || 1
    const end = parseInt(rangeEnd, 10) || selectedManga.totalVolumes
    const priceVal = parseFloat(rangePrice) || parseFloat(defaultPrice) || 34.99

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
    const pVal = parseFloat(editingVolPriceVal)
    if (!isNaN(pVal) && pVal >= 0) {
      setVolumePrices((prev) => ({ ...prev, [volNum]: pVal }))
    }
    setEditingVolPriceNum(null)
  }

  const handleSaveToCollection = () => {
    onAddVolumes({
      mangaId: selectedManga.id,
      title: selectedManga.title,
      publisher: selectedManga.publisher,
      coverUrl: selectedManga.coverUrl,
      selectedVolumes: Array.from(selectedVolumes).sort((a, b) => a - b),
      volumePrices,
      defaultPrice: parseFloat(defaultPrice) || 34.99,
    })
    onOpenChange(false)
  }

  const volumesArray = Array.from({ length: selectedManga.totalVolumes }, (_, i) => i + 1)
  const fallbackDefPrice = parseFloat(defaultPrice) || 34.99

  // Calculate total price based on individual volume prices or default fallback price
  const totalPrice = Array.from(selectedVolumes)
    .reduce((sum, volNum) => sum + (volumePrices[volNum] ?? fallbackDefPrice), 0)
    .toFixed(2)

  return (
    <>
      {/* Admin Cover Edit Modal with Cropping */}
      <CoverEditModal
        open={coverEditOpen}
        onOpenChange={setCoverEditOpen}
        currentCoverUrl={selectedManga.coverUrl}
        title={selectedManga.title}
        volumeNumber={1}
        publisher={selectedManga.publisher}
        onCoverUpdated={(newCover) => {
          setSelectedManga((prev) => ({ ...prev, coverUrl: newCover }))
        }}
      />

      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-3xl bg-[#090D18]/95 border-white/15 text-white backdrop-blur-3xl shadow-2xl rounded-3xl p-0 overflow-hidden sm:max-w-3xl">
          {/* Header */}
          <div className="p-6 pb-4 border-b border-white/10 bg-gradient-to-r from-cyan-950/40 via-[#0B1020] to-purple-950/30">
            <DialogHeader>
              <div className="inline-flex items-center gap-1.5 rounded-full border border-cyan-500/30 bg-cyan-500/10 px-3 py-0.5 text-[11px] font-bold text-cyan-300 mb-1">
                <Sparkles className="h-3 w-3" />
                <span>Kolekcja • Dodawanie i Zaklikiwanie Tomów</span>
              </div>
              <DialogTitle className="text-xl sm:text-2xl font-extrabold text-white">
                Dodaj Mangę: {selectedManga.title}
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Zaklikaj posiadane tomy, ustaw cenę domyślną lub zdefiniuj zakres cen dla konkretnych wydań
              </DialogDescription>
            </DialogHeader>

            {/* Live Search Input with Autocomplete */}
            <div className="relative mt-3">
              <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Zmień serię lub wyszukaj inną mangę (np. Chainsaw Man, Frieren, Bleach)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-white/5 border-white/15 text-white pl-10 text-xs h-10 rounded-xl placeholder:text-muted-foreground"
              />
              {isSearching && (
                <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-primary" />
              )}

              {/* Autocomplete Dropdown */}
              {searchResults.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1.5 rounded-2xl bg-[#0D1222] border border-white/15 shadow-2xl z-50 overflow-hidden max-h-60 overflow-y-auto">
                  {searchResults.map((manga) => (
                    <button
                      key={manga.id}
                      type="button"
                      onClick={() => handleSelectSearchResult(manga)}
                      className="flex w-full items-center gap-3 p-2.5 hover:bg-white/10 transition-colors text-left border-b border-white/5 last:border-0"
                    >
                      <div className="h-10 w-7 shrink-0 overflow-hidden rounded bg-black">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={manga.coverImage?.large || ''}
                          alt={manga.title.romaji || ''}
                          className="h-full w-full object-cover"
                        />
                      </div>
                      <div className="min-w-0">
                        <h5 className="text-xs font-bold text-white truncate">
                          {manga.title.romaji || manga.title.english}
                        </h5>
                        <p className="text-[10px] text-muted-foreground">
                          {manga.volumes ? `${manga.volumes} tomów` : 'W trakcie wydawania'} • {manga.status}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Scrollable Modal Body */}
          <div className="p-6 max-h-[58vh] overflow-y-auto space-y-5">
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
              <div className="space-y-1.5 flex-1 min-w-0 text-center sm:text-left">
                <div className="flex items-center justify-center sm:justify-start gap-2 flex-wrap">
                  <Badge className="bg-primary/20 text-primary border-primary/30 text-[10px]">
                    {selectedManga.publisher}
                  </Badge>
                  <span className="text-xs text-muted-foreground">Łącznie tomów: {selectedManga.totalVolumes}</span>
                  {isAdmin && (
                    <button
                      onClick={() => setCoverEditOpen(true)}
                      className="text-[10px] text-cyan-300 hover:underline inline-flex items-center gap-1 font-semibold"
                    >
                      <Edit2 className="h-2.5 w-2.5" /> Edytuj okładkę (Admin)
                    </button>
                  )}
                </div>

                <h3 className="text-base font-extrabold text-white truncate">{selectedManga.title}</h3>
                <p className="text-xs text-muted-foreground line-clamp-2">{selectedManga.description}</p>

                {/* Publisher & Default Price per volume inputs */}
                <div className="grid grid-cols-2 gap-2 pt-2">
                  <div>
                    <Label className="text-[10px] text-muted-foreground block mb-1">Polski Wydawca</Label>
                    <select
                      value={selectedManga.publisher}
                      onChange={(e) => setSelectedManga({ ...selectedManga, publisher: e.target.value })}
                      className="w-full h-8 rounded-xl bg-white/5 border border-white/15 text-xs text-white px-2.5 focus:outline-none focus:border-primary"
                    >
                      <option value="J.P.Fantastica" className="bg-[#090D18]">J.P.Fantastica</option>
                      <option value="Waneko" className="bg-[#090D18]">Waneko</option>
                      <option value="Studio JG" className="bg-[#090D18]">Studio JG</option>
                      <option value="Kotori" className="bg-[#090D18]">Kotori</option>
                      <option value="Dango" className="bg-[#090D18]">Dango</option>
                      <option value="Hanami" className="bg-[#090D18]">Hanami</option>
                    </select>
                  </div>

                  <div>
                    <Label className="text-[10px] text-muted-foreground block mb-1">Domyślna cena tomu (PLN)</Label>
                    <Input
                      type="number"
                      step="0.01"
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
                      type="number"
                      step="0.01"
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
              <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2.5 pt-1">
                {volumesArray.map((volNum) => {
                  const isChecked = selectedVolumes.has(volNum)
                  const vPrice = volumePrices[volNum] ?? fallbackDefPrice
                  const isEditingThis = editingVolPriceNum === volNum

                  return (
                    <div key={volNum} className="relative group">
                      <button
                        type="button"
                        onClick={() => toggleVolume(volNum)}
                        className={`relative flex w-full flex-col items-center justify-center p-3 rounded-2xl border-2 transition-all duration-200 focus:outline-none ${
                          isChecked
                            ? 'border-cyan-400 bg-cyan-950/60 text-white ring-2 ring-cyan-400/40 shadow-lg shadow-cyan-500/20 scale-[1.02]'
                            : 'border-white/10 bg-white/[0.03] text-muted-foreground hover:text-white hover:border-white/30 hover:bg-white/[0.06]'
                        }`}
                      >
                        {/* Check badge */}
                        <div
                          className={`absolute top-1.5 right-1.5 flex h-4 w-4 items-center justify-center rounded-full text-[8px] font-black transition-all ${
                            isChecked ? 'bg-cyan-400 text-black shadow-md' : 'bg-white/10 text-white/40'
                          }`}
                        >
                          {isChecked ? <Check className="h-2.5 w-2.5 stroke-[3]" /> : volNum}
                        </div>

                        <span className="text-[10px] font-semibold text-muted-foreground block mt-1">Tom</span>
                        <span className="text-base font-black text-white">{volNum}</span>
                        <span className="text-[9px] font-bold text-emerald-400 mt-0.5">
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
                          <span className="text-[9px] font-bold text-cyan-300 text-center">Cena T.{volNum}</span>
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

          {/* Sticky Footer */}
          <div className="p-4 border-t border-white/10 bg-[#070A12] flex items-center justify-between">
            <div>
              <span className="text-xs text-muted-foreground block">
                Zaznaczono: <strong className="text-cyan-300 font-extrabold">{selectedVolumes.size} tomów</strong>
              </span>
              <span className="text-xs text-muted-foreground">
                Szacowana wartość: <strong className="text-emerald-400 font-extrabold">{totalPrice} PLN</strong>
              </span>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                onClick={() => onOpenChange(false)}
                className="text-xs text-muted-foreground hover:text-white"
              >
                Anuluj
              </Button>
              <Button
                onClick={handleSaveToCollection}
                disabled={selectedVolumes.size === 0}
                className="text-xs font-bold bg-gradient-to-r from-primary to-cyan-500 hover:from-primary/90 text-white px-6 rounded-xl shadow-lg shadow-primary/30"
              >
                <Plus className="mr-1.5 h-3.5 w-3.5" />
                Dodaj ({selectedVolumes.size}) do Kolekcji
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
