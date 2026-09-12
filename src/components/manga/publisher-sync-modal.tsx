'use client'

import { useState } from 'react'
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
  Globe,
  RefreshCw,
  CheckCircle2,
  Loader2,
} from 'lucide-react'
import type { PolishRelease } from '@/app/api/releases/route'
import { defaultPublisherSources } from '@/app/api/releases/sync/route'
import { getCoverUrl } from '@/lib/cover-utils'

interface PublisherSyncModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onApplyReleases: (releases: PolishRelease[]) => void
  existingReleases?: PolishRelease[]
}

export function PublisherSyncModal({
  open,
  onOpenChange,
  onApplyReleases,
  existingReleases = [],
}: PublisherSyncModalProps) {
  const [customUrl, setCustomUrl] = useState('https://waneko.pl/zapowiedzi/')
  const [publisherName, setPublisherName] = useState('Waneko')
  const [isLoading, setIsLoading] = useState(false)
  const [scrapedResults, setScrapedResults] = useState<PolishRelease[]>([])
  const [diffStats, setDiffStats] = useState<{
    added: number
    updated: number
    unchanged: number
  } | null>(null)
  const [statusMessage, setStatusMessage] = useState<string | null>(null)

  const handleSelectPreset = (source: (typeof defaultPublisherSources)[0]) => {
    setCustomUrl(source.url)
    setPublisherName(source.name)
    setScrapedResults([])
    setDiffStats(null)
    setStatusMessage(null)
  }

  const handleFetchPlan = async () => {
    if (!customUrl.trim()) return

    setIsLoading(true)
    setStatusMessage(null)
    setDiffStats(null)

    try {
      const res = await fetch('/api/releases/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: customUrl.trim(),
          publisher: publisherName,
          existingReleases,
        }),
      })

      if (!res.ok) throw new Error('Błąd synchronizacji')

      const data = await res.json()
      if (data.releases && data.releases.length > 0) {
        setScrapedResults(data.releases)
        setDiffStats({
          added: data.addedCount || 0,
          updated: data.updatedCount || 0,
          unchanged: data.unchangedCount || 0,
        })
        setStatusMessage(
          `Zsynchronizowano: ${data.releases.length} pozycji (${data.addedCount} nowych, ${data.updatedCount} zaktualizowanych, ${data.unchangedCount} bez zmian)`
        )
      } else {
        setStatusMessage('Nie znaleziono pozycji na podanej stronie.')
      }
    } catch (error) {
      console.error('Error fetching plan:', error)
      setStatusMessage('Wystąpił błąd podczas łączenia z witryną wydawcy.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleApply = () => {
    if (scrapedResults.length > 0) {
      onApplyReleases(scrapedResults)
      onOpenChange(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl bg-[#090D18]/95 border-white/15 text-white backdrop-blur-3xl shadow-2xl rounded-3xl p-0 overflow-hidden sm:max-w-2xl">
        <div className="p-6 pb-4 border-b border-white/10 bg-gradient-to-r from-cyan-950/40 via-[#0B1020] to-purple-950/30">
          <DialogHeader>
            <div className="inline-flex items-center gap-1.5 rounded-full border border-cyan-500/30 bg-cyan-500/10 px-3 py-0.5 text-[11px] font-bold text-cyan-300 mb-1">
              <Globe className="h-3 w-3" />
              <span>Zaciąganie Planu Wydawców (Web Scraper & Diffing)</span>
            </div>
            <DialogTitle className="text-xl sm:text-2xl font-extrabold text-white">
              Synchronizacja ze Stroną Wydawnictwa
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Wprowadź oficjalny URL lub wybierz wydawcę. System pobiera dokładne daty i wykrywa różnice bez duplikatów.
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="p-6 max-h-[60vh] overflow-y-auto space-y-5">
          {/* Quick Preset Buttons */}
          <div>
            <Label className="text-xs font-bold text-muted-foreground uppercase">
              Szybki wybór polskiego wydawnictwa
            </Label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-2">
              {defaultPublisherSources.map((source) => {
                const isSelected = customUrl === source.url
                return (
                  <button
                    key={source.id}
                    type="button"
                    onClick={() => handleSelectPreset(source)}
                    className={`flex items-center gap-2 p-2.5 rounded-xl border text-left transition-all ${
                      isSelected
                        ? 'border-cyan-400 bg-cyan-950/50 text-white ring-1 ring-cyan-400 shadow-md'
                        : 'border-white/10 bg-white/5 text-muted-foreground hover:text-white'
                    }`}
                  >
                    <div className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${source.color} text-[9px] font-black text-white`}>
                      {source.logo}
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-bold truncate">{source.name}</div>
                      <div className="text-[9px] text-muted-foreground">{source.lastSync}</div>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Custom URL Input Field */}
          <div className="space-y-2">
            <Label htmlFor="custom-url" className="text-xs font-bold text-muted-foreground">
              Adres URL planu wydawniczego
            </Label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Globe className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="custom-url"
                  placeholder="np. https://waneko.pl/zapowiedzi/"
                  value={customUrl}
                  onChange={(e) => setCustomUrl(e.target.value)}
                  className="bg-white/5 border-white/15 text-white pl-9 text-xs h-10 rounded-xl"
                />
              </div>
              <Button
                onClick={handleFetchPlan}
                disabled={isLoading || !customUrl.trim()}
                className="bg-gradient-to-r from-primary to-cyan-500 font-bold text-xs h-10 px-5 shadow-lg shadow-primary/25 rounded-xl"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                    Pobieranie...
                  </>
                ) : (
                  <>
                    <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
                    Pobierz Plan
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Loading Indicator */}
          {isLoading && (
            <div className="p-3.5 rounded-xl bg-purple-950/40 border border-purple-500/30 text-xs text-purple-200 flex items-center gap-2.5 animate-pulse">
              <Loader2 className="h-4 w-4 text-purple-400 shrink-0 animate-spin" />
              <span>
                Łączenie ze stroną wydawcy i pobieranie pełnej tabeli zapowiedzi... (Dla serwera Waneko może to potrwać do kilkunastu sekund).
              </span>
            </div>
          )}

          {/* Diffing Statistics Badge */}
          {diffStats && (
            <div className="grid grid-cols-3 gap-2 pt-1">
              <div className="p-2.5 rounded-xl bg-emerald-950/40 border border-emerald-500/30 text-center">
                <span className="text-[10px] text-muted-foreground block">Nowe pozycje</span>
                <span className="text-sm font-black text-emerald-400">+{diffStats.added}</span>
              </div>
              <div className="p-2.5 rounded-xl bg-cyan-950/40 border border-cyan-500/30 text-center">
                <span className="text-[10px] text-muted-foreground block">Zaktualizowane</span>
                <span className="text-sm font-black text-cyan-300">{diffStats.updated}</span>
              </div>
              <div className="p-2.5 rounded-xl bg-white/5 border border-white/10 text-center">
                <span className="text-[10px] text-muted-foreground block">Bez zmian (Brak dubli)</span>
                <span className="text-sm font-black text-white">{diffStats.unchanged}</span>
              </div>
            </div>
          )}

          {statusMessage && (
            <div className="p-3 rounded-xl bg-cyan-950/40 border border-cyan-500/30 text-xs text-cyan-200 flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-cyan-400 shrink-0" />
              <span>{statusMessage}</span>
            </div>
          )}

          {/* Scraped Results Preview */}
          {scrapedResults.length > 0 && (
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-bold text-muted-foreground uppercase">
                  Wykryte zapowiedzi i premiery ({scrapedResults.length})
                </Label>
                <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30 text-[10px]">
                  Gotowe do wdrożenia
                </Badge>
              </div>

              <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                {scrapedResults.map((item, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-2.5 rounded-xl bg-white/[0.03] border border-white/10"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="relative h-11 w-8 shrink-0 overflow-hidden rounded bg-black border border-white/10">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={getCoverUrl(item.coverUrl)}
                          alt={item.title}
                          referrerPolicy="no-referrer"
                          crossOrigin="anonymous"
                          onError={(e) => {
                            ;(e.target as HTMLImageElement).src = 'https://s4.anilist.co/file/anilistcdn/media/manga/cover/large/bx117195-2s5b3n4pZ9Ea.jpg'
                          }}
                          className="h-full w-full object-cover"
                        />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] font-bold text-cyan-300">{item.day} {item.year}</span>
                          <span className="text-[9px] text-muted-foreground">• Tom {item.volumeNumber}</span>
                          <Badge variant="outline" className="text-[8px] py-0 px-1 border-white/15">
                            {item.publisher}
                          </Badge>
                        </div>
                        <h5 className="text-xs font-bold text-white truncate">{item.title}</h5>
                        <span className="text-[10px] font-bold text-emerald-400">{item.pricePLN.toFixed(2)} PLN</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer with Apply */}
        <div className="p-4 border-t border-white/10 bg-[#070A12] flex items-center justify-between">
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            className="text-xs text-muted-foreground hover:text-white"
          >
            Anuluj
          </Button>

          <Button
            onClick={handleApply}
            disabled={scrapedResults.length === 0}
            className="text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white px-6 rounded-xl shadow-lg shadow-emerald-600/30"
          >
            Zastosuj do Kalendarza ({scrapedResults.length})
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
