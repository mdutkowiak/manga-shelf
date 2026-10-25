'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { toastSuccess, hapticFeedback } from '@/lib/toast'
import {
  Search,
  Plus,
  Check,
  Sparkles,
  BookOpen,
  X,
  Loader2,
  BookmarkCheck,
} from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { AddMangaModal } from '@/components/manga/add-manga-modal'
import { searchMangaFromAniList } from '@/lib/actions/search'
import {
  getSavedCollection,
  addOrUpdateSeriesInCollection,
  formatVolumeCount,
  areSameSeries,
  type CollectionSeriesItem,
} from '@/lib/collection-store'

interface SearchItem {
  id: string | number
  title: {
    romaji: string
    english: string | null
  }
  polishTitle?: string | null
  primaryTitle: string
  secondaryTitle?: string | null
  description?: string | null
  coverImage: {
    large: string
  }
  status: string
  volumes: number | null
  publisher?: string | null
}

const POPULAR_SEARCH_CHIPS = [
  'Naruto',
  'Chainsaw Man',
  'Jujutsu Kaisen',
  'Berserk',
  'One Piece',
  'Dandadan',
  'Frieren',
  'Spy x Family',
]

export default function SearchPage() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchItem[]>([])
  const [loading, setLoading] = useState(false)
  const [collection, setCollection] = useState<CollectionSeriesItem[]>([])

  // Modal State for Adding Manga & Choosing Volumes
  const [addModalOpen, setAddModalOpen] = useState(false)
  const [selectedSeriesForAdd, setSelectedSeriesForAdd] = useState<any | null>(null)

  // Track active request to prevent race conditions
  const searchAbortRef = useRef<AbortController | null>(null)

  // Sync collection on mount and listen to updates
  useEffect(() => {
    setCollection(getSavedCollection())

    const handleColUpdate = () => {
      setCollection(getSavedCollection())
    }

    window.addEventListener('mangowo_collection_updated', handleColUpdate)
    return () => window.removeEventListener('mangowo_collection_updated', handleColUpdate)
  }, [])

  // Search function
  const executeSearch = useCallback(async (searchQuery: string) => {
    const trimmed = searchQuery.trim()
    if (!trimmed) {
      setResults([])
      setLoading(false)
      return
    }

    if (searchAbortRef.current) {
      searchAbortRef.current.abort()
    }
    const abortController = new AbortController()
    searchAbortRef.current = abortController

    setLoading(true)
    try {
      const res = await fetch(`/api/manga/search?q=${encodeURIComponent(trimmed)}`, {
        signal: abortController.signal,
      })

      if (res.ok) {
        const data = await res.json()
        const mapped: SearchItem[] = (data.mangas || []).map((m: any) => ({
          id: String(m.id),
          title: {
            romaji: m.title || m.romajiTitle || 'Manga',
            english: m.polishTitle || m.title || null,
          },
          polishTitle: m.polishTitle || null,
          primaryTitle: m.primaryTitle || m.polishTitle || m.title || 'Manga',
          secondaryTitle:
            m.secondaryTitle ||
            (m.polishTitle && m.polishTitle !== m.title ? m.title : null),
          coverImage: {
            large: m.coverUrl || '',
          },
          description: m.description || null,
          status: m.status || 'Wydawana',
          volumes: m.totalVolumes || m.volumes || 1,
          publisher: m.publisher && m.publisher !== 'Inne' ? m.publisher : 'Waneko',
        }))
        setResults(mapped)
      } else {
        const data = await searchMangaFromAniList(trimmed)
        setResults(((data.media as any[]) || []).map((m) => ({ ...m, id: String(m.id) })))
      }
    } catch (error: any) {
      if (error?.name !== 'AbortError') {
        console.error('Search error:', error)
      }
    } finally {
      setLoading(false)
    }
  }, [])

  // Debounced live search
  useEffect(() => {
    if (!query.trim() || query.trim().length < 2) {
      return
    }

    const timer = setTimeout(() => {
      executeSearch(query)
    }, 320)

    return () => clearTimeout(timer)
  }, [query, executeSearch])

  // Helper to check if a search item is already in user's collection
  const getCollectionStatus = (manga: SearchItem) => {
    const match = collection.find((c) =>
      areSameSeries(
        {
          id: String(manga.id),
          mangaId: String(manga.id),
          title: manga.primaryTitle || manga.title.romaji,
          polishTitle: manga.polishTitle,
        },
        c
      )
    )

    if (!match) {
      return { isOwned: false, count: 0, total: manga.volumes || 1, ownedVolumes: [], seriesItem: null }
    }

    const ownedVolumes = match.volumes
      .filter((v) => v.status === 'OWNED' || v.status === 'READ')
      .map((v) => v.volumeNumber)

    return {
      isOwned: ownedVolumes.length > 0,
      count: ownedVolumes.length,
      total: match.totalVolumes || manga.volumes || ownedVolumes.length || 1,
      ownedVolumes,
      seriesItem: match,
    }
  }

  // Open multi-volume AddMangaModal for the clicked series
  const handleOpenAddModal = (manga: SearchItem) => {
    const colStatus = getCollectionStatus(manga)
    const publisherToUse =
      colStatus.seriesItem?.publisher && colStatus.seriesItem.publisher !== 'Inne'
        ? colStatus.seriesItem.publisher
        : manga.publisher && manga.publisher !== 'Inne'
        ? manga.publisher
        : 'Waneko'

    const totalVols = colStatus.seriesItem?.totalVolumes || manga.volumes || 1

    setSelectedSeriesForAdd({
      mangaId: String(manga.id),
      title: manga.primaryTitle || manga.title.romaji,
      polishTitle: manga.polishTitle || manga.title.english || null,
      publisher: publisherToUse,
      coverUrl: manga.coverImage.large || colStatus.seriesItem?.coverUrl || '',
      totalVolumes: totalVols,
      totalVolumesJapan: manga.volumes || null,
      description: manga.description ? manga.description.replace(/<[^>]*>/g, '') : '',
      selectedVolumes: colStatus.isOwned ? colStatus.ownedVolumes : [1],
    })

    setAddModalOpen(true)
  }

  // Handle saving volumes from modal directly into collection store & DB
  const handleAddVolumes = (seriesInfo: {
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
  }) => {
    const updated = addOrUpdateSeriesInCollection(seriesInfo)
    setCollection(updated)
    const seriesTitle = seriesInfo.polishTitle || seriesInfo.title
    toastSuccess('Dodano do kolekcji! 🎉', `${seriesTitle} — ${formatVolumeCount(seriesInfo.selectedVolumes.length)}`)
    hapticFeedback()
  }

  return (
    <div className="space-y-6 animate-in fade-in-50 duration-300 pb-16">
      {/* Multi-Volume Add & Edit Modal */}
      <AddMangaModal
        open={addModalOpen}
        onOpenChange={setAddModalOpen}
        initialSeries={selectedSeriesForAdd}
        onAddVolumes={handleAddVolumes}
        isAdmin={true}
      />

      {/* Page Header */}
      <div>
        <div className="inline-flex items-center gap-1.5 rounded-full border border-cyan-500/30 bg-cyan-500/10 px-3 py-1 text-xs font-bold text-cyan-400 mb-1.5">
          <Sparkles className="h-3.5 w-3.5" />
          <span>Wyszukiwarka Mangi • Wybór Posiadanych Tomów</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
          Wyszukaj Mangę
        </h1>
        <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
          Wyszukaj dowolną serię, wybierz tomy, które masz na półce i dodaj je jednym kliknięciem
        </p>
      </div>

      {/* Search Input Bar with Clear Button */}
      <div className="flex gap-2 max-w-2xl">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Wpisz tytuł mangi (np. Naruto, Chainsaw Man, Berserk, Dandadan)..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && executeSearch(query)}
            className="pl-10 pr-9 text-sm glass-panel border-border/80 h-11 text-white rounded-2xl"
          />
          {query && (
            <button
              type="button"
              onClick={() => {
                setQuery('')
                setResults([])
              }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-white p-1 rounded-full transition-colors"
              aria-label="Wyczyść wyszukiwanie"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        <Button
          onClick={() => executeSearch(query)}
          disabled={loading}
          className="h-11 px-5 font-bold rounded-2xl shadow-md shadow-primary/25 shrink-0"
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
              <span>Szukanie...</span>
            </>
          ) : (
            'Szukaj'
          )}
        </Button>
      </div>

      {/* Quick Search Chips */}
      {results.length === 0 && !loading && (
        <div className="space-y-2">
          <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block">
            Popularne serie (kliknij aby wyszukać):
          </span>
          <div className="flex flex-wrap gap-1.5">
            {POPULAR_SEARCH_CHIPS.map((chip) => (
              <button
                key={chip}
                type="button"
                onClick={() => {
                  setQuery(chip)
                  executeSearch(chip)
                }}
                className="rounded-xl bg-white/5 hover:bg-cyan-500/20 hover:border-cyan-500/40 border border-white/10 px-3 py-1.5 text-xs font-semibold text-white/90 hover:text-cyan-300 transition-all shadow-sm"
              >
                {chip}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Loading Spinner */}
      {loading && (
        <div className="flex flex-col items-center justify-center py-16 gap-3">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="text-xs text-muted-foreground">Przeszukiwanie bazy tytułów...</p>
        </div>
      )}

      {/* Results Grid */}
      {results.length > 0 && (
        <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
          {results.map((manga) => {
            const status = getCollectionStatus(manga)
            const volumeLabel = manga.volumes ? formatVolumeCount(manga.volumes) : 'W trakcie'

            return (
              <Card
                key={manga.id}
                onClick={() => handleOpenAddModal(manga)}
                className={`glass-panel border-border/70 hover:border-primary/50 transition-all duration-300 hover:shadow-lg hover:shadow-primary/10 cursor-pointer group rounded-2xl overflow-hidden ${
                  status.isOwned ? 'ring-1 ring-emerald-500/30' : ''
                }`}
              >
                <CardContent className="flex gap-3.5 p-3.5">
                  {/* Cover */}
                  <div className="relative aspect-[2/3] w-20 shrink-0 overflow-hidden rounded-xl bg-muted border border-white/10 shadow-md">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={manga.coverImage.large}
                      alt={manga.primaryTitle}
                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                    {status.isOwned && (
                      <div className="absolute top-1 right-1 rounded-full bg-emerald-500 text-black p-0.5 shadow-md">
                        <Check className="h-2.5 w-2.5 stroke-[3]" />
                      </div>
                    )}
                  </div>

                  {/* Info & Actions */}
                  <div className="flex flex-1 flex-col justify-between min-w-0">
                    <div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <h3 className="font-extrabold text-sm text-white truncate group-hover:text-primary transition-colors">
                          {manga.primaryTitle}
                        </h3>
                        {manga.polishTitle && (
                          <span className="shrink-0 rounded bg-rose-500/20 px-1 py-0.2 text-[8px] font-bold text-rose-300 border border-rose-500/30">
                            🇵🇱 PL
                          </span>
                        )}
                      </div>

                      {manga.secondaryTitle && (
                        <p className="text-[11px] text-muted-foreground/80 truncate mt-0.5">
                          {manga.secondaryTitle}
                        </p>
                      )}

                      <div className="mt-2 flex flex-wrap gap-1.5 items-center">
                        <Badge
                          variant="secondary"
                          className="text-[10px] bg-primary/15 text-primary border-primary/30"
                        >
                          {manga.publisher || manga.status}
                        </Badge>
                        <Badge variant="outline" className="text-[10px] border-white/15 text-muted-foreground">
                          {volumeLabel}
                        </Badge>
                      </div>
                    </div>

                    <div className="pt-2 flex items-center justify-between gap-2 border-t border-white/5 mt-2">
                      {status.isOwned ? (
                        <span className="text-[10px] text-emerald-400 font-extrabold flex items-center gap-1 truncate">
                          <Check className="h-3 w-3 stroke-[2.5]" />
                          Posiadasz: {status.count} / {status.total}
                        </span>
                      ) : (
                        <span className="text-[10px] text-cyan-300 flex items-center gap-1 group-hover:underline">
                          Wybierz tomy
                        </span>
                      )}

                      <Button
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleOpenAddModal(manga)
                        }}
                        className={
                          status.isOwned
                            ? 'bg-emerald-600 hover:bg-emerald-500 text-white font-bold h-7 px-2.5 text-xs rounded-xl shadow-md'
                            : 'bg-primary hover:bg-primary/90 text-white font-bold h-7 px-3 text-xs rounded-xl shadow-md'
                        }
                      >
                        {status.isOwned ? (
                          <>
                            <BookmarkCheck className="mr-1 h-3 w-3" />
                            Zmień ({status.count})
                          </>
                        ) : (
                          <>
                            <Plus className="mr-1 h-3 w-3" />
                            Dodaj tomy
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* Empty State */}
      {!loading && results.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-center glass-panel rounded-2xl border-dashed">
          <BookOpen className="mb-3 h-12 w-12 text-muted-foreground/50" />
          <h3 className="text-base font-bold text-white">Wpisz frazę i wyszukaj serię mangi</h3>
          <p className="text-xs text-muted-foreground max-w-sm mt-1">
            Po znalezieniu mangi kliknij na nią, aby w wyskakującym okienku wygodnie zaznaczyć tomy, które posiadasz na swojej półce.
          </p>
        </div>
      )}
    </div>
  )
}
