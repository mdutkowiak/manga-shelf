'use client'

import { useState, useMemo } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import {
  Star,
  BookOpen,
  CheckCircle2,
  Heart,
  Package,
  Layers,
  Sparkles,
} from 'lucide-react'
import { getCoverUrl } from '@/lib/cover-utils'
import { getSavedCollection } from '@/lib/collection-store'
import type { CollectionSeriesItem, CollectionVolumeItem } from '@/lib/collection-store'

interface UserSeriesDetailModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  series: CollectionSeriesItem | null
  username: string
  userDisplayName?: string | null
}

export function UserSeriesDetailModal({
  open,
  onOpenChange,
  series,
  username,
  userDisplayName,
}: UserSeriesDetailModalProps) {
  const [filter, setFilter] = useState<'all' | 'owned' | 'read' | 'wishlist' | 'missing'>('all')

  // Check visiting user's own collection for cross-matching
  const myCollection = useMemo(() => {
    if (typeof window === 'undefined') return []
    return getSavedCollection()
  }, [open])

  const mySeries = useMemo(() => {
    if (!series || myCollection.length === 0) return null
    return myCollection.find(
      (s) =>
        s.mangaId === series.mangaId ||
        s.title.toLowerCase().trim() === series.title.toLowerCase().trim()
    )
  }, [series, myCollection])

  if (!series) return null

  const displayName = userDisplayName || username

  const totalPossible = Math.max(
    series.totalVolumes || 0,
    series.totalVolumesJapan || 0,
    series.volumes.length
  )

  // Ensure all volumes from 1 to totalPossible are represented
  const fullVolumesList: CollectionVolumeItem[] = []
  const existingMap = new Map(series.volumes.map((v) => [v.volumeNumber, v]))

  for (let i = 1; i <= Math.max(totalPossible, 1); i++) {
    const existing = existingMap.get(i)
    if (existing) {
      fullVolumesList.push(existing)
    } else {
      fullVolumesList.push({
        volumeNumber: i,
        coverUrl: series.coverUrl,
        status: 'NONE',
        purchasePrice: null,
      })
    }
  }

  const ownedVols = fullVolumesList.filter((v) => v.status === 'OWNED' || v.status === 'READ')
  const readVols = fullVolumesList.filter((v) => v.status === 'READ')
  const wishlistVols = fullVolumesList.filter((v) => v.status === 'WISHLIST')
  const missingVols = fullVolumesList.filter((v) => v.status === 'NONE')

  const ownedCount = ownedVols.length
  const percent = totalPossible > 0 ? Math.min(100, Math.round((ownedCount / totalPossible) * 100)) : 0

  const filteredVolumes = fullVolumesList.filter((v) => {
    if (filter === 'owned') return v.status === 'OWNED' || v.status === 'READ'
    if (filter === 'read') return v.status === 'READ'
    if (filter === 'wishlist') return v.status === 'WISHLIST'
    if (filter === 'missing') return v.status === 'NONE'
    return true
  })

  // Series main cover is preferably Tom 1 cover
  const vol1 = fullVolumesList.find((v) => v.volumeNumber === 1)
  const mainCover = vol1?.customCoverUrl || vol1?.coverUrl || series.coverUrl

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col p-0 overflow-hidden bg-[#0C101D] border-white/15 text-foreground shadow-2xl">
        {/* Header with Series Banner */}
        <DialogHeader className="p-5 pb-4 border-b border-white/10 bg-[#090D16]">
          <div className="flex flex-col sm:flex-row gap-5 items-start">
            {/* Series Cover Poster */}
            <div className="relative aspect-[2/3] w-24 sm:w-28 overflow-hidden rounded-xl bg-black shrink-0 border border-white/20 shadow-lg">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={getCoverUrl(mainCover)}
                alt={series.title}
                referrerPolicy="no-referrer"
                crossOrigin="anonymous"
                onError={(e) => {
                  ;(e.target as HTMLImageElement).src = 'https://s4.anilist.co/file/anilistcdn/media/manga/cover/large/bx30012-7Uo49q0iX6qX.jpg'
                }}
                className="h-full w-full object-cover"
              />
              <div className="absolute top-1 left-1 rounded bg-black/80 px-1.5 py-0.5 text-[8px] font-black text-cyan-300">
                {series.publisher}
              </div>
            </div>

            {/* Series Details & Progress */}
            <div className="flex-1 min-w-0 space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <DialogTitle className="text-xl font-black text-white tracking-tight">
                  {series.polishTitle || series.title}
                </DialogTitle>
                {series.polishTitle && series.polishTitle !== series.title && (
                  <span className="text-xs text-muted-foreground font-semibold truncate">
                    ({series.title})
                  </span>
                )}
              </div>

              <p className="text-xs text-muted-foreground font-medium">
                Półka użytkownika <span className="font-bold text-cyan-300">@{username}</span> ({displayName})
              </p>

              {/* Badges & Progress */}
              <div className="flex flex-wrap items-center gap-2 pt-1">
                {series.userSeriesRating && (
                  <Badge className="bg-amber-500/20 text-amber-300 border-amber-500/40 text-xs font-black gap-1">
                    <Star className="h-3 w-3 fill-amber-400" />
                    Ocena serii: {series.userSeriesRating}/10
                  </Badge>
                )}
                <Badge variant="outline" className="text-xs font-bold border-cyan-500/40 text-cyan-300 bg-cyan-950/20">
                  {ownedCount} z {totalPossible} tomów ({percent}%)
                </Badge>
                {series.totalVolumesJapan && series.totalVolumesJapan > totalPossible && (
                  <Badge variant="outline" className="text-[10px] text-muted-foreground border-white/10">
                    Japonia: {series.totalVolumesJapan} tomów
                  </Badge>
                )}
              </div>

              {/* Progress Bar */}
              <div className="space-y-1 pt-1 max-w-md">
                <div className="h-2 w-full rounded-full bg-white/10 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-cyan-400 via-primary to-purple-500 transition-all duration-500 shadow-sm"
                    style={{ width: `${percent}%` }}
                  />
                </div>
                <div className="flex justify-between text-[10px] text-muted-foreground font-medium">
                  <span>Posiada: {ownedCount}</span>
                  <span>Przeczytane: {readVols.length}</span>
                  <span>Brakuje: {Math.max(0, totalPossible - ownedCount)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Filter Tabs */}
          <div className="flex items-center gap-1.5 pt-4 overflow-x-auto scrollbar-none">
            <button
              type="button"
              onClick={() => setFilter('all')}
              className={`px-3 py-1 rounded-xl text-xs font-bold transition-all shrink-0 ${
                filter === 'all'
                  ? 'bg-white/15 text-white shadow-sm'
                  : 'text-muted-foreground hover:text-white bg-white/5'
              }`}
            >
              Wszystkie ({fullVolumesList.length})
            </button>
            <button
              type="button"
              onClick={() => setFilter('owned')}
              className={`px-3 py-1 rounded-xl text-xs font-bold transition-all shrink-0 ${
                filter === 'owned'
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                  : 'text-muted-foreground hover:text-white bg-white/5'
              }`}
            >
              Posiadane ({ownedCount})
            </button>
            <button
              type="button"
              onClick={() => setFilter('read')}
              className={`px-3 py-1 rounded-xl text-xs font-bold transition-all shrink-0 ${
                filter === 'read'
                  ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                  : 'text-muted-foreground hover:text-white bg-white/5'
              }`}
            >
              Przeczytane ({readVols.length})
            </button>
            {wishlistVols.length > 0 && (
              <button
                type="button"
                onClick={() => setFilter('wishlist')}
                className={`px-3 py-1 rounded-xl text-xs font-bold transition-all shrink-0 ${
                  filter === 'wishlist'
                    ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                    : 'text-muted-foreground hover:text-white bg-white/5'
                }`}
              >
                Chcę kupić ({wishlistVols.length})
              </button>
            )}
            <button
              type="button"
              onClick={() => setFilter('missing')}
              className={`px-3 py-1 rounded-xl text-xs font-bold transition-all shrink-0 ${
                filter === 'missing'
                  ? 'bg-white/20 text-white'
                  : 'text-muted-foreground hover:text-white bg-white/5'
              }`}
            >
              Brakujące ({missingVols.length})
            </button>
          </div>
        </DialogHeader>

        {/* Volumes Grid */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {filteredVolumes.length === 0 ? (
            <div className="py-12 text-center text-xs text-muted-foreground">
              Brak tomów w wybranej kategorii.
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3.5">
              {filteredVolumes.map((vol) => {
                const volCover = vol.customCoverUrl || vol.coverUrl || series.coverUrl
                const isOwned = vol.status === 'OWNED'
                const isRead = vol.status === 'READ'
                const isWishlist = vol.status === 'WISHLIST'
                const isOrdered = vol.status === 'ORDERED'
                const isNone = vol.status === 'NONE'

                // Comparison with visiting user's collection
                const myVol = mySeries?.volumes.find((v) => v.volumeNumber === vol.volumeNumber)
                const iOwnThis = myVol && (myVol.status === 'OWNED' || myVol.status === 'READ')
                const iWantThis = myVol && myVol.status === 'WISHLIST'

                return (
                  <div
                    key={vol.volumeNumber}
                    className={`relative flex flex-col rounded-xl overflow-hidden p-2 border transition-all ${
                      isRead
                        ? 'bg-purple-950/20 border-purple-500/40 shadow-sm shadow-purple-500/10'
                        : isOwned
                        ? 'bg-emerald-950/20 border-emerald-500/40 shadow-sm shadow-emerald-500/10'
                        : isWishlist
                        ? 'bg-rose-950/20 border-rose-500/30'
                        : isOrdered
                        ? 'bg-cyan-950/20 border-cyan-500/30'
                        : 'bg-white/[0.02] border-white/10 opacity-60'
                    }`}
                  >
                    {/* Volume Cover */}
                    <div className="relative aspect-[2/3] w-full overflow-hidden rounded-lg bg-black border border-white/10 mb-2">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={getCoverUrl(volCover)}
                        alt={`Tom ${vol.volumeNumber}`}
                        referrerPolicy="no-referrer"
                        crossOrigin="anonymous"
                        onError={(e) => {
                          ;(e.target as HTMLImageElement).src = 'https://s4.anilist.co/file/anilistcdn/media/manga/cover/large/bx30012-7Uo49q0iX6qX.jpg'
                        }}
                        className={`h-full w-full object-cover ${isNone ? 'grayscale contrast-75' : ''}`}
                      />

                      {/* Volume Number Tag */}
                      <div className="absolute top-1 left-1 rounded bg-black/85 px-1.5 py-0.5 text-[9px] font-black text-white border border-white/20">
                        T.{vol.volumeNumber}
                      </div>

                      {/* Volume Rating if provided */}
                      {vol.userRating && (
                        <div className="absolute top-1 right-1 flex items-center gap-0.5 rounded bg-black/85 px-1 py-0.5 text-[9px] font-black text-amber-400 border border-amber-500/30">
                          <Star className="h-2.5 w-2.5 fill-amber-400" />
                          {vol.userRating}
                        </div>
                      )}
                    </div>

                    {/* Volume Title & Status */}
                    <div className="space-y-1">
                      <p className="text-xs font-bold text-white truncate">
                        Tom {vol.volumeNumber}
                      </p>

                      <div className="flex items-center gap-1">
                        {isRead ? (
                          <span className="inline-flex items-center gap-1 rounded bg-purple-500/20 px-1.5 py-0.5 text-[9px] font-extrabold text-purple-300 border border-purple-500/30">
                            <CheckCircle2 className="h-2.5 w-2.5" />
                            Przeczytany
                          </span>
                        ) : isOwned ? (
                          <span className="inline-flex items-center gap-1 rounded bg-emerald-500/20 px-1.5 py-0.5 text-[9px] font-extrabold text-emerald-300 border border-emerald-500/30">
                            <CheckCircle2 className="h-2.5 w-2.5" />
                            Posiada
                          </span>
                        ) : isWishlist ? (
                          <span className="inline-flex items-center gap-1 rounded bg-rose-500/20 px-1.5 py-0.5 text-[9px] font-extrabold text-rose-300 border border-rose-500/30">
                            <Heart className="h-2.5 w-2.5" />
                            Chce kupić
                          </span>
                        ) : isOrdered ? (
                          <span className="inline-flex items-center gap-1 rounded bg-cyan-500/20 px-1.5 py-0.5 text-[9px] font-extrabold text-cyan-300 border border-cyan-500/30">
                            <Package className="h-2.5 w-2.5" />
                            Zamówiony
                          </span>
                        ) : (
                          <span className="rounded bg-white/5 px-1.5 py-0.5 text-[9px] font-medium text-muted-foreground">
                            Brak na półce
                          </span>
                        )}
                      </div>

                      {/* Cross-comparison: visiting user's state for this volume */}
                      {iOwnThis && (
                        <p className="text-[9px] text-cyan-300/90 font-semibold pt-0.5 flex items-center gap-1">
                          <Sparkles className="h-2.5 w-2.5 text-cyan-400" />
                          Ty też to posiadasz!
                        </p>
                      )}
                      {!iOwnThis && iWantThis && (
                        <p className="text-[9px] text-rose-300 font-semibold pt-0.5 flex items-center gap-1">
                          <Heart className="h-2.5 w-2.5 text-rose-400" />
                          Masz na liście życzeń
                        </p>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
