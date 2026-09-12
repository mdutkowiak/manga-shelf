'use client'

import { useState, useMemo, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  BookOpen,
  Sparkles,
  Plus,
  Star,
  Layers,
  Search,
  Download,
  LayoutGrid,
  Library,
} from 'lucide-react'
import { AddMangaModal } from '@/components/manga/add-manga-modal'
import { CollectionExportModal } from '@/components/manga/collection-export-modal'
import { ShelfSpineView } from '@/components/manga/shelf-spine-view'
import { MangaCardSkeleton } from '@/components/ui/manga-card-skeleton'
import {
  SeriesCollectionDetailModal,
  type CollectionSeriesItem,
} from '@/components/manga/series-collection-detail-modal'
import {
  getSavedCollection,
  saveCollectionToStorage,
  addOrUpdateSeriesInCollection,
  autoEnhanceAllCollectionSeries,
  defaultCollectionSeries,
} from '@/lib/collection-store'
import { getCoverUrl } from '@/lib/cover-utils'

const popularPublishers = ['Wszystkie', 'Waneko', 'Studio JG', 'J.P.Fantastica', 'Kotori', 'Dango', 'Hanami']

export default function CollectionPage() {
  const [seriesList, setSeriesList] = useState<CollectionSeriesItem[]>(defaultCollectionSeries)
  const [searchFilter, setSearchFilter] = useState('')
  const [selectedPublisher, setSelectedPublisher] = useState('Wszystkie')
  const [activeTab, setActiveTab] = useState('all')
  const [displayMode, setDisplayMode] = useState<'grid' | 'shelf'>('grid')
  const [isLoading, setIsLoading] = useState(true)

  // Add Manga Modal state
  const [addModalOpen, setAddModalOpen] = useState(false)

  // Series Collection Detail Modal state
  const [selectedSeriesDetail, setSelectedSeriesDetail] = useState<CollectionSeriesItem | null>(null)
  const [detailModalOpen, setDetailModalOpen] = useState(false)

  // Export / Import Modal state
  const [exportModalOpen, setExportModalOpen] = useState(false)

  // Sync state with localStorage on mount & listen to updates from anywhere in app
  useEffect(() => {
    const timer = setTimeout(() => {
      setSeriesList(getSavedCollection())
      setIsLoading(false)
    }, 0)

    // Automatically enhance series & volume covers from MangaDex / AniList
    autoEnhanceAllCollectionSeries().then(() => {
      setSeriesList(getSavedCollection())
    })

    // Fetch from database if user is logged in
    fetch('/api/collection')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.series && Array.isArray(data.series) && data.series.length > 0) {
          saveCollectionToStorage(data.series)
          setSeriesList(getSavedCollection())
        }
      })
      .catch(() => {})

    const handleStorageUpdate = () => {
      setSeriesList(getSavedCollection())
    }

    window.addEventListener('mangowo_collection_updated', handleStorageUpdate)
    return () => {
      clearTimeout(timer)
      window.removeEventListener('mangowo_collection_updated', handleStorageUpdate)
    }
  }, [])

  // Filter series list
  const filteredSeries = useMemo(() => {
    return seriesList.filter((series) => {
      const matchesSearch = series.title.toLowerCase().includes(searchFilter.toLowerCase().trim())
      const matchesPublisher = selectedPublisher === 'Wszystkie' || series.publisher === selectedPublisher

      let matchesTab = true
      if (activeTab === 'OWNED') {
        matchesTab = series.volumes.some((v) => v.status === 'OWNED')
      } else if (activeTab === 'READ') {
        matchesTab = series.volumes.some((v) => v.status === 'READ')
      } else if (activeTab === 'WISHLIST') {
        matchesTab = series.volumes.some((v) => v.status === 'WISHLIST')
      }

      return matchesSearch && matchesPublisher && matchesTab
    })
  }, [seriesList, searchFilter, selectedPublisher, activeTab])

  // Total Statistics calculated across all series
  const stats = useMemo(() => {
    let ownedVols = 0
    let totalSpent = 0

    seriesList.forEach((s) => {
      s.volumes.forEach((v) => {
        if (v.status === 'OWNED' || v.status === 'READ') {
          ownedVols += 1
          totalSpent += v.purchasePrice ?? 34.99
        }
      })
    })

    return {
      totalSeries: seriesList.length,
      ownedVolumes: ownedVols,
      totalSpent: totalSpent.toFixed(2),
    }
  }, [seriesList])

  // Handle adding new series from AddMangaModal
  const handleAddMangaVolumes = (newSeriesInfo: {
    mangaId: string
    title: string
    publisher: string
    coverUrl: string
    totalVolumes?: number
    totalVolumesJapan?: number | null
    selectedVolumes: number[]
    volumePrices: Record<number, number>
    defaultPrice: number
  }) => {
    const updated = addOrUpdateSeriesInCollection(newSeriesInfo)
    setSeriesList(updated)
  }

  // Handle updating series (ratings, volume prices, custom volume covers)
  const handleUpdateSeries = (updatedSeries: CollectionSeriesItem) => {
    const newList = seriesList.map((s) => (s.id === updatedSeries.id ? updatedSeries : s))
    setSeriesList(newList)
    saveCollectionToStorage(newList)
    setSelectedSeriesDetail(updatedSeries)
  }

  return (
    <div className="space-y-6 animate-in fade-in-50 duration-300 pb-12">
      {/* Detail Modal for Selected Series */}
      <SeriesCollectionDetailModal
        open={detailModalOpen}
        onOpenChange={setDetailModalOpen}
        series={selectedSeriesDetail}
        onUpdateSeries={handleUpdateSeries}
        isAdmin={true}
      />

      {/* Add Manga Modal */}
      <AddMangaModal
        open={addModalOpen}
        onOpenChange={setAddModalOpen}
        onAddVolumes={handleAddMangaVolumes}
        isAdmin={true}
      />

      {/* Export / Import Modal */}
      <CollectionExportModal
        open={exportModalOpen}
        onOpenChange={setExportModalOpen}
        onCollectionImported={() => setSeriesList(getSavedCollection())}
      />

      {/* Top Banner & Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-white/10 pb-5">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-bold text-primary mb-1">
            <Sparkles className="h-3 w-3" />
            <span>Półka Kolekcjonerska • Serie Mangi</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">Moja Półka Mangi</h1>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Zarządzaj swoimi seriami, oceniaj je ogólnie oraz edytuj okładki i ceny poszczególnych tomów
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap shrink-0">
          <Button
            type="button"
            variant="outline"
            onClick={() => setExportModalOpen(true)}
            className="h-11 px-4 text-xs font-bold bg-white/5 hover:bg-white/10 border-white/15 text-white rounded-2xl gap-2 transition-all"
          >
            <Download className="h-4 w-4 text-cyan-400" />
            Eksport / Kopia
          </Button>

          <Button
            onClick={() => setAddModalOpen(true)}
            className="h-11 px-5 text-xs font-bold bg-gradient-to-r from-primary to-cyan-500 hover:from-primary/90 text-white rounded-2xl shadow-lg shadow-primary/25 gap-2"
          >
            <Plus className="h-4 w-4" />
            Dodaj Nową Serię do Półki
          </Button>
        </div>
      </div>

      {/* Overview Stats Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="p-4 rounded-2xl bg-[#0E1324] border border-white/10 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-500/20 text-purple-400 font-bold">
            <BookOpen className="h-5 w-5" />
          </div>
          <div>
            <span className="text-xs text-muted-foreground font-semibold block">Posiadane Serie</span>
            <span className="text-lg font-black text-white">{stats.totalSeries} serii</span>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-[#0E1324] border border-white/10 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-500/20 text-cyan-400 font-bold">
            <Layers className="h-5 w-5" />
          </div>
          <div>
            <span className="text-xs text-muted-foreground font-semibold block">Posiadane Tomy</span>
            <span className="text-lg font-black text-white">{stats.ownedVolumes} tomów</span>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-[#0E1324] border border-white/10 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-400 font-bold">
            <Sparkles className="h-5 w-5" />
          </div>
          <div>
            <span className="text-xs text-muted-foreground font-semibold block">Łączne Wydatki</span>
            <span className="text-lg font-black text-emerald-400">{stats.totalSpent} PLN</span>
          </div>
        </div>
      </div>

      {/* Filters Bar: Search, Publishers & Status Tabs */}
      <div className="space-y-3 bg-[#0C101D] p-3.5 rounded-2xl border border-white/10">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Szukaj serii w kolekcji..."
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              className="h-9 bg-white/5 border-white/10 text-xs pl-9 rounded-xl text-white placeholder:text-muted-foreground/60"
            />
          </div>

          {/* Status Tabs (Wszystkie, Posiadane, Przeczytane, Chcę kupić) */}
          <div className="flex items-center gap-1.5 p-1 rounded-xl bg-white/5 border border-white/10 w-full sm:w-auto overflow-x-auto scrollbar-none">
            {[
              { id: 'all', label: 'Wszystkie' },
              { id: 'OWNED', label: 'Posiadane' },
              { id: 'READ', label: 'Przeczytane' },
              { id: 'WISHLIST', label: 'Lista życzeń' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-3 py-1 text-xs font-bold rounded-lg transition-all whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'bg-primary text-white shadow-md shadow-primary/30'
                    : 'text-muted-foreground hover:text-white hover:bg-white/5'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Publishers Filter */}
        <div className="flex items-center gap-1.5 overflow-x-auto w-full scrollbar-none pt-1 border-t border-white/5">
          <span className="text-[11px] font-semibold text-muted-foreground mr-1 shrink-0">Wydawca:</span>
          {popularPublishers.map((pub) => {
            const isSelected = selectedPublisher === pub
            return (
              <button
                key={pub}
                onClick={() => setSelectedPublisher(pub)}
                className={`shrink-0 rounded-full px-3 py-0.5 text-[11px] font-bold transition-all ${
                  isSelected
                    ? 'bg-cyan-500 text-black shadow-md shadow-cyan-500/30'
                    : 'bg-white/5 text-muted-foreground hover:text-white border border-white/10'
                }`}
              >
                {pub}
              </button>
            )
          })}
        </div>
      </div>

      {/* MAIN COLLECTION HEADER & VIEW MODE SWITCH */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-2">
        <h3 className="text-sm font-black text-white uppercase tracking-wider">
          Serie w Mojej Kolekcji ({filteredSeries.length})
        </h3>

        {/* Display Mode Toggle (Grid vs Shelf) */}
        <div className="flex items-center gap-1 bg-white/5 p-1 rounded-xl border border-white/10 shrink-0">
          <button
            type="button"
            onClick={() => setDisplayMode('grid')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold transition-all ${
              displayMode === 'grid'
                ? 'bg-primary text-white shadow-sm shadow-primary/30'
                : 'text-muted-foreground hover:text-white'
            }`}
          >
            <LayoutGrid className="h-3.5 w-3.5" />
            <span>Siatka Okładek</span>
          </button>
          <button
            type="button"
            onClick={() => setDisplayMode('shelf')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold transition-all ${
              displayMode === 'shelf'
                ? 'bg-gradient-to-r from-purple-600 to-cyan-500 text-white shadow-sm shadow-purple-600/30'
                : 'text-muted-foreground hover:text-white'
            }`}
          >
            <Library className="h-3.5 w-3.5" />
            <span>Regał (Grzbiety)</span>
          </button>
        </div>
      </div>

      {/* RENDER SHELF VIEW OR GRID VIEW */}
      {isLoading ? (
        <MangaCardSkeleton count={10} />
      ) : filteredSeries.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 px-4 text-center rounded-2xl border border-white/10 bg-[#0C101D]/80 space-y-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 shadow-lg shadow-cyan-500/10">
            <BookOpen className="h-8 w-8" />
          </div>
          <div className="space-y-1 max-w-md">
            <h3 className="text-lg font-bold text-white">
              {seriesList.length === 0 ? 'Twoja półka jest pusta' : 'Brak wyników wyszukiwania'}
            </h3>
            <p className="text-xs text-muted-foreground">
              {seriesList.length === 0
                ? 'Rozpocznij tworzenie swojej kolekcji! Dodaj pierwszą serię mangi i oznacz tomy, które posiadasz lub przeczytałeś.'
                : 'Nie znaleziono serii pasujących do wpisanych kryteriów wyszukiwania.'}
            </p>
          </div>
          {seriesList.length === 0 ? (
            <Button
              onClick={() => setAddModalOpen(true)}
              className="bg-primary hover:bg-primary/90 text-white text-xs font-bold gap-1.5 shadow-md shadow-primary/30"
            >
              <Plus className="h-4 w-4" />
              Dodaj pierwszą mangę
            </Button>
          ) : (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setSearchFilter('')
                setSelectedPublisher('Wszystkie')
                setActiveTab('all')
              }}
              className="text-xs border-white/10 text-muted-foreground hover:text-white"
            >
              Wyczyść filtry
            </Button>
          )}
        </div>
      ) : displayMode === 'shelf' ? (
        <ShelfSpineView
          seriesList={filteredSeries}
          onSelectSeries={(series) => {
            setSelectedSeriesDetail(series)
            setDetailModalOpen(true)
          }}
        />
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {filteredSeries.map((series) => {
            const ownedVolumes = series.volumes.filter((v) => v.status === 'OWNED' || v.status === 'READ')
            const ownedCount = ownedVolumes.length
            const targetTotal = series.totalVolumes > 0 ? series.totalVolumes : series.volumes.length
            const percent = targetTotal > 0 ? Math.min(100, Math.round((ownedCount / targetTotal) * 100)) : 0
            const seriesCost = ownedVolumes
              .reduce((sum, v) => sum + (v.purchasePrice ?? 34.99), 0)
              .toFixed(2)
            const missingCount = Math.max(0, targetTotal - ownedCount)
            const estMissingCost = (missingCount * 34.99).toFixed(0)

            // Series Display Cover is ALWAYS Volume 1 cover (Tom 1)
            const vol1Obj = series.volumes.find((v) => v.volumeNumber === 1)
            const seriesDisplayCover = vol1Obj?.customCoverUrl || vol1Obj?.coverUrl || series.coverUrl

            return (
              <div
                key={series.id}
                onClick={() => {
                  setSelectedSeriesDetail(series)
                  setDetailModalOpen(true)
                }}
                className="group relative flex flex-col rounded-2xl bg-[#0E1424] p-2.5 border border-purple-500/30 shadow-lg shadow-purple-500/10 hover:border-cyan-400 hover:shadow-cyan-500/20 transition-all duration-300 hover:-translate-y-1 cursor-pointer"
              >
                {/* Series Cover Card with referrerPolicy="no-referrer" */}
                <div className="relative aspect-[2/3] w-full overflow-hidden rounded-xl bg-black border border-white/10 shadow-xl">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={getCoverUrl(seriesDisplayCover)}
                    alt={series.title}
                    referrerPolicy="no-referrer"
                    crossOrigin="anonymous"
                    onError={(e) => {
                      ;(e.target as HTMLImageElement).src = 'https://s4.anilist.co/file/anilistcdn/media/manga/cover/large/bx30012-7Uo49q0iX6qX.jpg'
                    }}
                    className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />

                  {/* Publisher Tag */}
                  <div className="absolute top-2 left-2 rounded-md bg-black/80 backdrop-blur-xs px-2 py-0.5 text-[9px] font-extrabold text-cyan-300 border border-cyan-500/30 z-10">
                    {series.publisher}
                  </div>

                  {/* Rating Tag */}
                  {series.userSeriesRating && (
                    <div className="absolute top-2 right-2 rounded-md bg-black/80 backdrop-blur-xs px-1.5 py-0.5 text-[9px] font-black text-amber-400 flex items-center gap-0.5 border border-amber-500/30 z-10">
                      <Star className="h-2.5 w-2.5 fill-amber-400" />
                      {series.userSeriesRating}/10
                    </div>
                  )}

                  {/* Progress overlay bar */}
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/95 via-black/80 to-transparent p-2 z-10">
                    <div className="flex items-center justify-between text-[9px] font-bold text-white mb-1">
                      <span className="text-white/80">{ownedCount} / {series.totalVolumes} tomów</span>
                      <span className="text-cyan-300 font-extrabold">{percent}%</span>
                    </div>
                    <div className="h-1.5 w-full rounded-full bg-white/20 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-purple-400 shadow-sm"
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                  </div>
                </div>

                {/* Series Title, Cost & Completion Cost Estimator */}
                <div className="mt-2.5 px-0.5 space-y-1">
                  <h4 className="font-extrabold text-sm text-white truncate group-hover:text-cyan-300 transition-colors">
                    {series.title}
                  </h4>
                  <div className="flex items-center justify-between text-[10px] text-muted-foreground font-semibold">
                    <span>Wydano:</span>
                    <span className="text-emerald-400 font-extrabold">{seriesCost} zł</span>
                  </div>
                  <div className="text-[10px] font-semibold truncate pt-1 border-t border-white/5">
                    {missingCount > 0 ? (
                      <span className="text-amber-400/90 font-bold">
                        Brakuje {missingCount} tomów (~{estMissingCost} zł)
                      </span>
                    ) : (
                      <span className="text-emerald-400 font-bold">🎉 Seria Kompletna!</span>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
