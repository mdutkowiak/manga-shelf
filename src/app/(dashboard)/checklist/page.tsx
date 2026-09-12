'use client'

import { useState, useEffect, useMemo } from 'react'
import {
  ShoppingBag,
  CheckCircle2,
  Sparkles,
  DollarSign,
  Search,
  BookOpen,
  Filter,
  Check,
  RotateCcw,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  getSavedCollection,
  saveCollectionToStorage,
  type CollectionSeriesItem,
  type CollectionVolumeItem,
} from '@/lib/collection-store'
import { getCoverUrl } from '@/lib/cover-utils'

interface MissingVolumeItem {
  seriesId: string
  seriesTitle: string
  publisher: string
  coverUrl: string
  volumeNumber: number
  pricePLN: number
  status: CollectionVolumeItem['status']
  customCoverUrl?: string | null
}

const PUBLISHERS = [
  'Wszystkie',
  'Waneko',
  'Studio JG',
  'J.P.Fantastica',
  'Kotori',
  'Dango',
  'Hanami',
]

export default function ChecklistPage() {
  const [collection, setCollection] = useState<CollectionSeriesItem[]>([])
  const [selectedPublisher, setSelectedPublisher] = useState('Wszystkie')
  const [searchQuery, setSearchQuery] = useState('')
  const [onlyStartedSeries, setOnlyStartedSeries] = useState(true)
  const [boughtSessionCount, setBoughtSessionCount] = useState(0)
  const [lastBoughtTitle, setLastBoughtTitle] = useState<string | null>(null)

  // Load collection on mount and listen to updates
  useEffect(() => {
    const timer = setTimeout(() => {
      setCollection(getSavedCollection())
    }, 0)

    const handleUpdate = () => {
      setCollection(getSavedCollection())
    }

    window.addEventListener('mangowo_collection_updated', handleUpdate)
    return () => {
      clearTimeout(timer)
      window.removeEventListener('mangowo_collection_updated', handleUpdate)
    }
  }, [])

  // Calculate missing volumes across user's series
  const missingVolumes = useMemo(() => {
    const list: MissingVolumeItem[] = []

    collection.forEach((series) => {
      const ownedOrReadVols = series.volumes.filter(
        (v) => v.status === 'OWNED' || v.status === 'READ'
      )
      const hasStarted = ownedOrReadVols.length > 0

      // If user wants only started series, skip series with 0 owned volumes
      if (onlyStartedSeries && !hasStarted) {
        return
      }

      series.volumes.forEach((vol) => {
        if (vol.status !== 'OWNED' && vol.status !== 'READ') {
          list.push({
            seriesId: series.id,
            seriesTitle: series.title,
            publisher: series.publisher || 'Inne',
            coverUrl: vol.customCoverUrl || vol.coverUrl || series.coverUrl,
            volumeNumber: vol.volumeNumber,
            pricePLN: vol.purchasePrice || 34.99,
            status: vol.status,
            customCoverUrl: vol.customCoverUrl,
          })
        }
      })
    })

    return list
  }, [collection, onlyStartedSeries])

  // Filtered by publisher and search term
  const filteredMissing = useMemo(() => {
    return missingVolumes.filter((item) => {
      const matchesPublisher =
        selectedPublisher === 'Wszystkie' ||
        item.publisher.toLowerCase() === selectedPublisher.toLowerCase()
      const matchesSearch =
        item.seriesTitle.toLowerCase().includes(searchQuery.toLowerCase().trim()) ||
        `tom ${item.volumeNumber}`.includes(searchQuery.toLowerCase().trim())
      return matchesPublisher && matchesSearch
    })
  }, [missingVolumes, selectedPublisher, searchQuery])

  // Group filtered items by publisher
  const groupedByPublisher = useMemo(() => {
    const groups: Record<string, MissingVolumeItem[]> = {}
    filteredMissing.forEach((item) => {
      const pub = item.publisher || 'Inne'
      if (!groups[pub]) groups[pub] = []
      groups[pub].push(item)
    })
    return groups
  }, [filteredMissing])

  // Calculate totals
  const totalMissingCount = missingVolumes.length
  const totalMissingCost = missingVolumes
    .reduce((sum, item) => sum + item.pricePLN, 0)
    .toFixed(2)

  // Handle Mark as Bought on the convention floor
  const handleMarkAsBought = (item: MissingVolumeItem) => {
    const currentColl = getSavedCollection()
    const updated = currentColl.map((s) => {
      if (s.id === item.seriesId) {
        const newVolumes = s.volumes.map((v) => {
          if (v.volumeNumber === item.volumeNumber) {
            return {
              ...v,
              status: 'OWNED' as const,
              purchasePrice: item.pricePLN,
            }
          }
          return v
        })
        return { ...s, volumes: newVolumes }
      }
      return s
    })

    saveCollectionToStorage(updated)
    setCollection(updated)
    setBoughtSessionCount((prev) => prev + 1)
    setLastBoughtTitle(`${item.seriesTitle} Tom ${item.volumeNumber}`)

    // Auto-dismiss alert after 3s
    setTimeout(() => {
      setLastBoughtTitle((curr) =>
        curr === `${item.seriesTitle} Tom ${item.volumeNumber}` ? null : curr
      )
    }, 3500)
  }

  return (
    <div className="space-y-6 animate-in fade-in-50 duration-300 pb-20">
      {/* Header with Title and Mode Switch */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-cyan-500/30 bg-cyan-500/10 px-3 py-1 text-xs font-black text-cyan-300">
              <ShoppingBag className="h-3.5 w-3.5" />
              Tryb Zakupowy & Konwentowy
            </span>
            {boughtSessionCount > 0 && (
              <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/40 text-[11px] font-bold">
                Kupiono dzisiaj: +{boughtSessionCount}
              </Badge>
            )}
          </div>
          <h1 className="text-3xl font-black tracking-tight text-white mt-1.5">
            Lista Zakupów Brakujących Tomów
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Zestawienie braków w Twoich seriach uporządkowane stoiskami wydawców. Kliknij „Kupione”, by natychmiast przenieść tom do kolekcji!
          </p>
        </div>

        {/* Quick Stats Header Cards */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2.5 px-3.5 py-2 rounded-2xl bg-white/[0.03] border border-white/10">
            <div className="p-2 rounded-xl bg-purple-500/10 text-purple-400">
              <BookOpen className="h-4 w-4" />
            </div>
            <div>
              <span className="text-[10px] text-muted-foreground block font-medium">Brakujących tomów</span>
              <span className="text-sm font-black text-white">{totalMissingCount} szt.</span>
            </div>
          </div>

          <div className="flex items-center gap-2.5 px-3.5 py-2 rounded-2xl bg-white/[0.03] border border-white/10">
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400">
              <DollarSign className="h-4 w-4" />
            </div>
            <div>
              <span className="text-[10px] text-muted-foreground block font-medium">Szacowany koszt</span>
              <span className="text-sm font-black text-emerald-400">{totalMissingCost} zł</span>
            </div>
          </div>
        </div>
      </div>

      {/* Floating Alert on Volume Bought */}
      {lastBoughtTitle && (
        <div className="p-3 rounded-2xl bg-gradient-to-r from-emerald-500/20 via-cyan-500/15 to-transparent border border-emerald-500/40 flex items-center justify-between animate-in slide-in-from-top-2 duration-300">
          <div className="flex items-center gap-2 text-xs font-bold text-emerald-300">
            <CheckCircle2 className="h-4 w-4 text-emerald-400" />
            Świetnie! Dodano do Twojej półki: <span className="text-white underline">{lastBoughtTitle}</span>
          </div>
          <span className="text-[10px] text-emerald-400/80 font-semibold">Statystyki zostały przeliczone</span>
        </div>
      )}

      {/* Filters Toolbar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3 rounded-2xl bg-white/[0.03] border border-white/10">
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Szukaj serii lub tomu..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-9 text-xs bg-black/40 border-white/15 text-white rounded-xl"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setOnlyStartedSeries(!onlyStartedSeries)}
            className={`h-8 text-xs font-bold rounded-xl gap-1.5 transition-all ${
              onlyStartedSeries
                ? 'bg-purple-950/50 border-purple-500/40 text-purple-300'
                : 'bg-white/5 border-white/10 text-muted-foreground'
            }`}
          >
            <Filter className="h-3 w-3" />
            {onlyStartedSeries ? 'Tylko Rozpoczęte Serie' : 'Wszystkie z Listy'}
          </Button>

          {boughtSessionCount > 0 && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setBoughtSessionCount(0)}
              className="h-8 text-xs text-muted-foreground hover:text-white gap-1"
            >
              <RotateCcw className="h-3 w-3" />
              Reset licznika sesji
            </Button>
          )}
        </div>
      </div>

      {/* Publisher Chips */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
        {PUBLISHERS.map((pub) => {
          const isSelected = selectedPublisher === pub
          const count =
            pub === 'Wszystkie'
              ? missingVolumes.length
              : missingVolumes.filter((m) => m.publisher.toLowerCase() === pub.toLowerCase()).length

          return (
            <button
              key={pub}
              type="button"
              onClick={() => setSelectedPublisher(pub)}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold transition-all whitespace-nowrap ${
                isSelected
                  ? 'bg-gradient-to-r from-primary to-cyan-500 text-white shadow-md shadow-primary/20 scale-105'
                  : 'bg-white/5 text-muted-foreground hover:text-white hover:bg-white/10 border border-white/10'
              }`}
            >
              <span>{pub}</span>
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ${
                  isSelected ? 'bg-black/30 text-white' : 'bg-white/10 text-muted-foreground'
                }`}
              >
                {count}
              </span>
            </button>
          )
        })}
      </div>

      {/* Content: Grouped by Publisher or Empty State */}
      {filteredMissing.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center rounded-3xl bg-white/[0.02] border border-white/10 p-6">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 mb-3">
            <Sparkles className="h-8 w-8" />
          </div>
          <h3 className="text-lg font-bold text-white">Brak brakujących tomów w tej kategorii!</h3>
          <p className="text-xs text-muted-foreground max-w-sm mt-1">
            {onlyStartedSeries
              ? 'Wszystkie tomy w Twoich rozpoczętych seriach są już w Twojej kolekcji, lub zmień filtr na „Wszystkie z Listy”.'
              : 'Twoja kolekcja nie zawiera nieposiadanych tomów dla wybranych filtrów.'}
          </p>
        </div>
      ) : (
        <div className="space-y-8">
          {Object.entries(groupedByPublisher).map(([publisherName, items]) => (
            <div key={publisherName} className="space-y-3">
              {/* Publisher Section Header */}
              <div className="flex items-center justify-between border-b border-white/10 pb-2">
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-cyan-400 shadow-sm shadow-cyan-400/50" />
                  <h2 className="text-lg font-black text-white">{publisherName}</h2>
                  <Badge variant="outline" className="text-[10px] border-white/15 text-muted-foreground">
                    {items.length} brakujących tomów
                  </Badge>
                </div>
                <span className="text-xs font-bold text-emerald-400">
                  Razem: {items.reduce((acc, i) => acc + i.pricePLN, 0).toFixed(2)} zł
                </span>
              </div>

              {/* Items Grid for this publisher */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {items.map((item) => (
                  <div
                    key={`${item.seriesId}-${item.volumeNumber}`}
                    className="flex items-center justify-between p-3 rounded-2xl bg-[#0B0F19] border border-white/10 hover:border-cyan-500/50 transition-all duration-200 group"
                  >
                    <div className="flex items-center gap-3 overflow-hidden">
                      {/* Mini Cover Thumbnail */}
                      <div className="relative aspect-[2/3] w-12 shrink-0 overflow-hidden rounded-lg bg-black/60 border border-white/10 shadow-md">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={getCoverUrl(item.coverUrl)}
                          alt={item.seriesTitle}
                          referrerPolicy="no-referrer"
                          crossOrigin="anonymous"
                          className="h-full w-full object-cover group-hover:scale-105 transition-transform"
                          onError={(e) => {
                            ;(e.target as HTMLImageElement).src =
                              'https://s4.anilist.co/file/anilistcdn/media/manga/cover/large/bx30012-7Uo49q0iX6qX.jpg'
                          }}
                        />
                        <div className="absolute top-0.5 right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-black/80 text-[8px] font-black text-white">
                          {item.volumeNumber}
                        </div>
                      </div>

                      {/* Title & Info */}
                      <div className="min-w-0 flex-1">
                        <h4 className="text-xs font-bold text-white truncate group-hover:text-cyan-300 transition-colors">
                          {item.seriesTitle}
                        </h4>
                        <p className="text-[11px] font-extrabold text-cyan-400">
                          Tom {item.volumeNumber}
                        </p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-[10px] text-emerald-400 font-bold">
                            ~{item.pricePLN.toFixed(2)} zł
                          </span>
                          {item.status === 'WISHLIST' && (
                            <span className="text-[9px] text-purple-300 font-semibold bg-purple-500/10 px-1.5 py-0.2 rounded-md">
                              Na liście życzeń
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Mark as Bought CTA */}
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => handleMarkAsBought(item)}
                      className="shrink-0 h-8 px-3 text-xs font-bold bg-emerald-600/20 hover:bg-emerald-600 border border-emerald-500/40 text-emerald-300 hover:text-white rounded-xl gap-1.5 shadow-sm transition-all"
                    >
                      <Check className="h-3.5 w-3.5" />
                      Kupione
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
