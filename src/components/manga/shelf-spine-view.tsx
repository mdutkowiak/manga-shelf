'use client'

import React from 'react'
import {
  Star,
  CheckCircle2,
  BookOpen,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import type { CollectionSeriesItem, CollectionVolumeItem } from '@/lib/collection-store'

interface ShelfSpineViewProps {
  seriesList: CollectionSeriesItem[]
  onSelectSeries: (series: CollectionSeriesItem) => void
}

// Deterministic gradient colors for series spines based on publisher/title
function getSpineGradient(series: CollectionSeriesItem) {
  const pub = series.publisher?.toLowerCase() || ''
  if (pub.includes('waneko')) {
    return 'from-rose-950/90 via-red-900/80 to-stone-900'
  }
  if (pub.includes('studio jg')) {
    return 'from-purple-950/90 via-indigo-900/80 to-stone-900'
  }
  if (pub.includes('j.p.f') || pub.includes('fantastica')) {
    return 'from-sky-950/90 via-blue-900/80 to-stone-900'
  }
  if (pub.includes('kotori')) {
    return 'from-amber-950/90 via-orange-900/80 to-stone-900'
  }
  if (pub.includes('dango')) {
    return 'from-pink-950/90 via-rose-900/80 to-stone-900'
  }
  return 'from-cyan-950/90 via-slate-900 to-stone-900'
}

export function ShelfSpineView({ seriesList, onSelectSeries }: ShelfSpineViewProps) {
  if (seriesList.length === 0) {
    return (
      <div className="py-20 text-center text-muted-foreground text-sm">
        Brak serii mang do wyświetlenia na regale.
      </div>
    )
  }

  return (
    <div className="space-y-12">
      {seriesList.map((series) => {
        const ownedVolumes = series.volumes.filter(
          (v) => v.status === 'OWNED' || v.status === 'READ'
        )
        const percent = Math.round((ownedVolumes.length / series.totalVolumes) * 100)
        const spineGradient = getSpineGradient(series)

        return (
          <div key={series.id} className="space-y-3">
            {/* Shelf Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-1">
              <div
                onClick={() => onSelectSeries(series)}
                className="flex items-center gap-3 cursor-pointer group"
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-purple-500/20 text-purple-300 font-bold group-hover:scale-110 transition-transform">
                  <BookOpen className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-base font-black text-white group-hover:text-cyan-300 transition-colors flex items-center gap-2 flex-wrap">
                    {series.polishTitle || series.title}
                    {series.polishTitle && (
                      <span className="shrink-0 rounded bg-rose-500/20 px-1.5 py-0.5 text-[9px] font-bold text-rose-300 border border-rose-500/30">
                        🇵🇱 PL
                      </span>
                    )}
                    {series.userSeriesRating && (
                      <span className="inline-flex items-center gap-0.5 text-xs font-bold text-amber-400 bg-black/60 px-2 py-0.5 rounded-full border border-amber-500/30">
                        <Star className="h-3 w-3 fill-amber-400" />
                        {series.userSeriesRating}/10
                      </span>
                    )}
                  </h3>
                  {series.polishTitle && series.polishTitle !== series.title && (
                    <p className="text-[11px] text-muted-foreground/70">
                      Tytuł oryginalny: {series.title}
                    </p>
                  )}
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span className="text-cyan-400 font-semibold">{series.publisher}</span>
                    <span>•</span>
                    <span>
                      {ownedVolumes.length} z {series.totalVolumes} tomów na półce ({percent}%)
                    </span>
                  </div>
                </div>
              </div>

              {/* Status Badge */}
              <div className="flex items-center gap-2">
                {ownedVolumes.length === series.totalVolumes ? (
                  <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/40 text-xs font-bold gap-1">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Kompletna Półka
                  </Badge>
                ) : (
                  <span className="text-xs text-amber-400/90 font-bold">
                    Brakuje {series.totalVolumes - ownedVolumes.length} tomów
                  </span>
                )}
              </div>
            </div>

            {/* Bookshelf Container */}
            <div className="relative rounded-2xl bg-gradient-to-b from-[#0A0D16] to-[#06080F] p-4 pt-6 border border-white/10 shadow-2xl overflow-hidden">
              {/* Back wall wooden slats / futuristic grooves */}
              <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff03_1px,transparent_1px)] bg-[size:32px_100%] pointer-events-none" />

              {/* Volumes Row standing on shelf */}
              <div className="relative flex items-end gap-1.5 overflow-x-auto pb-2 pt-8 scrollbar-thin scrollbar-thumb-white/10">
                {series.volumes.map((vol: CollectionVolumeItem) => {
                  const isOwned = vol.status === 'OWNED' || vol.status === 'READ'
                  const isRead = vol.status === 'READ'
                  const isWishlist = vol.status === 'WISHLIST'
                  const isLent = !!vol.lentTo

                  return (
                    <div
                      key={vol.volumeNumber}
                      onClick={() => onSelectSeries(series)}
                      title={`${series.title} Tom ${vol.volumeNumber} (${
                        isRead
                          ? 'Przeczytany'
                          : isOwned
                          ? 'Posiadany'
                          : isWishlist
                          ? 'Lista życzeń'
                          : 'Brak'
                      }${isLent ? ` - Pożyczone: ${vol.lentTo}` : ''})`}
                      className={`group relative flex flex-col justify-between rounded-t-md p-1.5 transition-all duration-300 cursor-pointer shrink-0 select-none ${
                        isOwned
                          ? `bg-gradient-to-b ${spineGradient} border-t-2 border-x border-white/20 hover:-translate-y-4 hover:shadow-2xl hover:shadow-cyan-500/30 hover:border-cyan-400 hover:z-20`
                          : isWishlist
                          ? 'bg-purple-950/30 border-2 border-dashed border-purple-500/50 opacity-75 hover:-translate-y-2'
                          : 'bg-white/[0.02] border-2 border-dashed border-white/10 opacity-40 hover:opacity-70 hover:-translate-y-1'
                      } w-8 sm:w-10 h-44 sm:h-52`}
                    >
                      {/* Top Spine: Volume Number */}
                      <div className="flex flex-col items-center">
                        <div
                          className={`flex h-5 w-5 sm:h-6 sm:w-6 items-center justify-center rounded-full text-[10px] sm:text-xs font-black shadow-md ${
                            isRead
                              ? 'bg-cyan-400 text-black'
                              : isOwned
                              ? 'bg-white text-black'
                              : 'bg-white/10 text-white/60'
                          }`}
                        >
                          {vol.volumeNumber}
                        </div>
                        {isLent && (
                          <span className="text-[7px] font-black text-amber-300 mt-1 bg-amber-500/30 px-1 rounded-sm uppercase tracking-tighter">
                            Wyp.
                          </span>
                        )}
                      </div>

                      {/* Middle Spine: Vertical Polish / Romaji Title snippet */}
                      <div className="flex-1 my-2 flex items-center justify-center overflow-hidden">
                        <span
                          className={`text-[9px] sm:text-[10px] font-extrabold uppercase tracking-wider text-center line-clamp-1 [writing-mode:vertical-rl] rotate-180 ${
                            isOwned ? 'text-white/90 group-hover:text-cyan-300' : 'text-white/40'
                          }`}
                        >
                          {series.title}
                        </span>
                      </div>

                      {/* Bottom Spine: Publisher Abbreviation & Status Indicator */}
                      <div className="flex flex-col items-center gap-1">
                        {isOwned ? (
                          <div
                            className={`h-2 w-2 rounded-full shadow-sm ${
                              isRead ? 'bg-cyan-400 shadow-cyan-400/80' : 'bg-emerald-400 shadow-emerald-400/80'
                            }`}
                          />
                        ) : (
                          <div className="text-[8px] font-bold text-muted-foreground/60">
                            Brak
                          </div>
                        )}
                        <span className="text-[7px] font-black text-white/50 tracking-tighter truncate max-w-full">
                          {series.publisher?.slice(0, 3).toUpperCase()}
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Physical Wooden Plank Shelf Base with thickness & shadow */}
              <div className="relative -mx-4 -mb-4 mt-1 h-5 bg-gradient-to-b from-[#2B1810] via-[#1E110B] to-[#120A06] border-t-2 border-[#573523] shadow-inner shadow-black flex items-center justify-between px-4">
                <div className="h-0.5 w-full bg-white/5" />
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
