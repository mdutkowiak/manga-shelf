'use client'

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Sparkles,
  Star,
  Plus,
} from 'lucide-react'

export interface SeriesDetailData {
  mangaId: string
  title: string
  polishTitle?: string | null
  englishTitle?: string | null
  coverUrl: string
  bannerUrl?: string | null
  publisher: string
  totalVolumes: number
  totalVolumesJapan?: number | null
  status: string
  score?: number | null
  genres?: string[]
  description?: string | null
  ownedVolumesCount?: number
}

interface SeriesDetailModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  seriesData: SeriesDetailData | null
  onOpenAddMangaModal?: (series: SeriesDetailData) => void
}

export function SeriesDetailModal({
  open,
  onOpenChange,
  seriesData,
  onOpenAddMangaModal,
}: SeriesDetailModalProps) {
  if (!seriesData) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl bg-[#090D18]/95 border-white/15 text-white backdrop-blur-3xl shadow-2xl rounded-3xl p-0 overflow-hidden sm:max-w-3xl">
        {/* Banner image background if available */}
        {seriesData.bannerUrl && (
          <div className="relative h-36 w-full overflow-hidden bg-black/60">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={seriesData.bannerUrl} alt={seriesData.title} className="h-full w-full object-cover opacity-40 mix-blend-luminosity" />
            <div className="absolute inset-0 bg-gradient-to-t from-[#090D18] via-[#090D18]/60 to-transparent" />
          </div>
        )}

        {/* Header */}
        <div className={`p-6 pb-4 ${seriesData.bannerUrl ? '-mt-16 relative z-10' : 'bg-gradient-to-r from-purple-950/40 via-[#0B1020] to-cyan-950/30'} border-b border-white/10`}>
          <DialogHeader>
            <div className="flex items-center gap-2 mb-1">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-cyan-500/30 bg-cyan-500/10 px-3 py-0.5 text-[11px] font-bold text-cyan-300">
                <Sparkles className="h-3 w-3" />
                Podsumowanie Serii Mangi
              </span>
              <Badge className="bg-purple-500/20 text-purple-300 border-purple-500/30 text-[10px]">
                {seriesData.publisher}
              </Badge>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <DialogTitle className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                {seriesData.polishTitle || seriesData.title}
              </DialogTitle>
              {seriesData.polishTitle && seriesData.polishTitle !== seriesData.title && (
                <span className="inline-flex items-center rounded-md bg-rose-500/20 px-2 py-0.5 text-[10px] font-bold text-rose-300 border border-rose-500/30">
                  🇵🇱 PL
                </span>
              )}
            </div>
            {seriesData.polishTitle && seriesData.polishTitle !== seriesData.title ? (
              <DialogDescription className="text-xs text-muted-foreground">
                Tytuł oryginalny: {seriesData.title}
              </DialogDescription>
            ) : seriesData.englishTitle ? (
              <DialogDescription className="text-xs text-muted-foreground">
                Tytuł alternatywny: {seriesData.englishTitle}
              </DialogDescription>
            ) : null}
          </DialogHeader>
        </div>

        {/* Modal Body */}
        <div className="p-6 max-h-[60vh] overflow-y-auto space-y-6">
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5">
            {/* Main Series Cover */}
            <div className="relative aspect-[2/3] w-36 shrink-0 overflow-hidden rounded-2xl border-2 border-primary/50 bg-black shadow-2xl ring-2 ring-primary/30 mx-auto sm:mx-0">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={seriesData.coverUrl} alt={seriesData.title} className="h-full w-full object-cover" />
              <div className="absolute top-2 right-2 rounded-full bg-black/80 backdrop-blur-md px-2 py-0.5 text-[10px] font-bold text-cyan-300">
                {seriesData.totalVolumes} Tomów
              </div>
            </div>

            {/* Main Stats Grid & Details */}
            <div className="flex-1 space-y-4 text-center sm:text-left">
              {/* Stats badges row */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                <div className="p-2.5 rounded-xl bg-white/[0.03] border border-white/10">
                  <span className="text-[10px] text-muted-foreground block">Wydane w Polsce</span>
                  <span className="text-sm font-black text-white">{seriesData.totalVolumes} tomów</span>
                </div>

                <div className="p-2.5 rounded-xl bg-white/[0.03] border border-white/10">
                  <span className="text-[10px] text-muted-foreground block">Ocena Społeczności</span>
                  <span className="text-sm font-black text-amber-400 flex items-center justify-center sm:justify-start gap-1">
                    <Star className="h-3.5 w-3.5 fill-amber-400" />
                    {seriesData.score ? (seriesData.score / 10).toFixed(1) : '8.5'} / 10
                  </span>
                </div>

                <div className="p-2.5 rounded-xl bg-white/[0.03] border border-white/10 col-span-2 sm:col-span-1">
                  <span className="text-[10px] text-muted-foreground block">Status serii</span>
                  <span className="text-sm font-black text-emerald-400">
                    {seriesData.status === 'FINISHED' ? 'Zakończona' : 'W trakcie wydawania'}
                  </span>
                </div>
              </div>

              {/* Genres */}
              {seriesData.genres && seriesData.genres.length > 0 && (
                <div className="flex items-center gap-1.5 flex-wrap justify-center sm:justify-start">
                  <span className="text-[11px] text-muted-foreground font-bold mr-1">Gatunki:</span>
                  {seriesData.genres.map((g) => (
                    <Badge key={g} variant="outline" className="text-[10px] border-white/15 bg-white/5 text-muted-foreground">
                      {g}
                    </Badge>
                  ))}
                </div>
              )}

              {/* Description */}
              <div className="space-y-1">
                <h4 className="text-xs font-extrabold text-white uppercase tracking-wider">Opis Serii</h4>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {seriesData.description || `Rozbudowana i uwielbiana przez czytelników seria ${seriesData.title} wydawana w Polsce przez ${seriesData.publisher}. Składa się z ${seriesData.totalVolumes} tomów.`}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer with Actions */}
        <div className="p-4 border-t border-white/10 bg-[#070A12] flex items-center justify-between">
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            className="text-xs text-muted-foreground hover:text-white"
          >
            Zamknij
          </Button>

          <div className="flex items-center gap-2">
            {onOpenAddMangaModal && (
              <Button
                onClick={() => {
                  onOpenChange(false)
                  onOpenAddMangaModal(seriesData)
                }}
                className="text-xs font-bold bg-gradient-to-r from-primary to-cyan-500 hover:from-primary/90 text-white px-5 rounded-xl shadow-lg shadow-primary/30 gap-1.5"
              >
                <Plus className="h-4 w-4" />
                Dodaj tę Serię i Zaklikaj Tomy
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
