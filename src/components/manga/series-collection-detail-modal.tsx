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
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Star,
  Sparkles,
  Edit2,
  Trash2,
  Layers,
  UserCheck,
  CheckCheck,
  Loader2,
  Check,
  BookOpen,
} from 'lucide-react'
import { CoverEditModal } from '@/components/manga/cover-edit-modal'
import { getCoverUrl } from '@/lib/cover-utils'
import { autoEnhanceSeriesVolumeCovers, removeSeriesFromCollection, applyAdminOverridesToSeries } from '@/lib/collection-store'
import { formatVolumeCount } from '@/lib/title-utils'

export interface CollectionVolumeItem {
  volumeNumber: number
  coverUrl: string
  customCoverUrl?: string | null
  status: 'OWNED' | 'READ' | 'WISHLIST' | 'ORDERED' | 'NONE'
  coverPrice?: number | null
  purchasePrice?: number | null
  userRating?: number | null // 1-10
  notes?: string | null
  lentTo?: string | null
  lentDate?: string | null
}

export interface CollectionSeriesItem {
  id: string
  mangaId: string
  title: string
  polishTitle?: string | null
  publisher: string
  coverUrl: string
  customCoverUrl?: string | null
  totalVolumes: number
  totalVolumesJapan?: number | null
  statusInPoland?: 'ONGOING' | 'FINISHED' | 'CANCELLED' | 'HIATUS' | 'UNKNOWN' | null
  description?: string
  userSeriesRating?: number | null // 1-10 dla CAŁEJ SERII
  volumes: CollectionVolumeItem[]
}

interface SeriesCollectionDetailModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  series: CollectionSeriesItem | null
  onUpdateSeries: (updatedSeries: CollectionSeriesItem) => void
  isAdmin?: boolean
}

export function SeriesCollectionDetailModal({
  open,
  onOpenChange,
  series,
  onUpdateSeries,
  isAdmin = true,
}: SeriesCollectionDetailModalProps) {
  // Volume currently being edited
  const [editingVolume, setEditingVolume] = useState<CollectionVolumeItem | null>(null)

  // Cover edit modal for single volume
  const [coverEditOpen, setCoverEditOpen] = useState(false)
  const [editingCoverVolNum, setEditingCoverVolNum] = useState<number | null>(null)

  // Auto-enhance volume covers from MangaDex / API when viewing series detail modal
  useEffect(() => {
    if (open && series) {
      autoEnhanceSeriesVolumeCovers(series).then((enhanced) => {
        if (enhanced && enhanced.volumes) {
          const hasChanges = enhanced.volumes.some(
            (ev, idx) => ev.coverUrl !== series.volumes[idx]?.coverUrl
          )
          if (hasChanges) {
            onUpdateSeries(enhanced)
          }
        }
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, series?.id])

  const activeSeries = series ? applyAdminOverridesToSeries(series) : null

  // Bulk controls state
  const [showBulkControls, setShowBulkControls] = useState(false)
  const [bulkRangeFrom, setBulkRangeFrom] = useState(1)
  const [bulkRangeTo, setBulkRangeTo] = useState(activeSeries?.volumes.length || 1)
  const [bulkStatus, setBulkStatus] = useState<CollectionVolumeItem['status']>('OWNED')
  const [bulkPrice, setBulkPrice] = useState('34.99')
  const [volumeFilter, setVolumeFilter] = useState<'ALL' | 'LENT' | 'MISSING'>('ALL')

  // Volume Count & Metadata Editor state (allows adjusting polish title and total volumes in PL / JP)
  const [showVolumeCountEditor, setShowVolumeCountEditor] = useState(false)
  const [editPolandCount, setEditPolandCount] = useState('1')
  const [editJapanCount, setEditJapanCount] = useState('')
  const [editPolishTitle, setEditPolishTitle] = useState('')
  const [communityRating, setCommunityRating] = useState<{ average: number | null; count: number } | null>(null)

  useEffect(() => {
    if (activeSeries) {
      setEditPolandCount(String(activeSeries.totalVolumes || 1))
      setEditJapanCount(activeSeries.totalVolumesJapan ? String(activeSeries.totalVolumesJapan) : '')
      setEditPolishTitle(activeSeries.polishTitle || '')

      // Fetch community rating & user rating from DB
      fetch(`/api/manga/${activeSeries.mangaId}/rating`)
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (data) {
            setCommunityRating({ average: data.averageRating, count: data.ratingCount })
            if (data.userRating !== null && activeSeries.userSeriesRating === null) {
              onUpdateSeries({ ...activeSeries, userSeriesRating: data.userRating })
            }
          }
        })
        .catch(() => {})
    }
  }, [activeSeries?.mangaId, activeSeries?.id])

  const handleSaveVolumeCounts = () => {
    if (!activeSeries) return
    const parsedPL = Math.max(1, parseInt(editPolandCount, 10) || 1)
    const parsedJP = editJapanCount.trim() ? Math.max(1, parseInt(editJapanCount, 10) || 1) : null
    const maxVol = Math.max(parsedPL, parsedJP || 0)

    const existingMap = new Map(activeSeries.volumes.map((v) => [v.volumeNumber, v]))
    const newVols: CollectionVolumeItem[] = []

    for (let i = 1; i <= maxVol; i++) {
      const ex = existingMap.get(i)
      if (ex) {
        newVols.push(ex)
      } else {
        newVols.push({
          volumeNumber: i,
          coverUrl: activeSeries.coverUrl,
          customCoverUrl: null,
          status: 'NONE',
          purchasePrice: null,
          userRating: null,
        })
      }
    }
    const newPolishTitle = editPolishTitle.trim() || null

    const updatedSeries: CollectionSeriesItem = {
      ...activeSeries,
      polishTitle: newPolishTitle,
      totalVolumes: parsedPL,
      totalVolumesJapan: parsedJP,
      volumes: newVols,
    }

    onUpdateSeries(updatedSeries)
    setShowVolumeCountEditor(false)

    // Sync to backend DB so other users can search by polish title
    fetch(`/api/manga/${activeSeries.mangaId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: activeSeries.title,
        polishTitle: newPolishTitle,
        totalVolumesPoland: parsedPL,
        totalVolumesJapan: parsedJP,
      }),
    }).catch((err) => console.warn('Sync manga details warning:', err))
  }

  // Yatta.pl integration state
  const [showYattaImporter, setShowYattaImporter] = useState(false)
  const [yattaSeriesUrl, setYattaSeriesUrl] = useState('')
  const [isImportingYatta, setIsImportingYatta] = useState(false)
  const [yattaImportMessage, setYattaImportMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const handleImportYattaCovers = async () => {
    if (!activeSeries || !yattaSeriesUrl.trim()) return
    setIsImportingYatta(true)
    setYattaImportMessage(null)

    try {
      const res = await fetch('/api/admin/yatta', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: yattaSeriesUrl.trim() }),
      })
      const data = await res.json()

      if (!res.ok || !data.success || !data.volumes || data.volumes.length === 0) {
        throw new Error(data.error || 'Nie udało się zaciągnąć tomów ze sklepu Yatta.pl')
      }

      const yattaMap: Record<number, string> = {}
      data.volumes.forEach((v: { volumeNumber: number; coverUrl: string }) => {
        yattaMap[v.volumeNumber] = v.coverUrl
      })

      const vol1Cover =
        data.volumes.find((v: { volumeNumber: number }) => v.volumeNumber === 1)?.coverUrl ||
        activeSeries.coverUrl

      const polandVolCount = Math.max(
        activeSeries.totalVolumes || 0,
        ...data.volumes.map((v: { volumeNumber: number }) => v.volumeNumber)
      )
      const maxVol = Math.max(
        polandVolCount,
        activeSeries.totalVolumesJapan || 0,
        activeSeries.volumes.length
      )
      const newVols: CollectionVolumeItem[] = []

      for (let i = 1; i <= maxVol; i++) {
        const existing = activeSeries.volumes.find((v) => v.volumeNumber === i)
        const yattaCover = yattaMap[i]

        if (existing) {
          newVols.push({
            ...existing,
            coverUrl: yattaCover || existing.coverUrl,
            customCoverUrl: yattaCover || existing.customCoverUrl,
            purchasePrice: (existing.status === 'OWNED' || existing.status === 'READ') ? existing.purchasePrice : null,
          })
        } else {
          newVols.push({
            volumeNumber: i,
            coverUrl: yattaCover || vol1Cover,
            customCoverUrl: yattaCover || null,
            status: 'NONE',
            purchasePrice: null,
          })
        }
      }

      const updated: CollectionSeriesItem = {
        ...activeSeries,
        coverUrl: activeSeries.customCoverUrl || vol1Cover,
        customCoverUrl: activeSeries.customCoverUrl || null,
        totalVolumes: polandVolCount,
        totalVolumesJapan: activeSeries.totalVolumesJapan,
        volumes: newVols,
      }

      onUpdateSeries(updated)
      setYattaImportMessage({
        type: 'success',
        text: `Pomyślnie zaktualizowano okładki dla ${data.volumesCount} tomów z Yatta.pl!`,
      })
    } catch (err) {
      console.error('Błąd importu Yatta:', err)
      setYattaImportMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'Błąd podczas importu okładek z Yatta.pl',
      })
    } finally {
      setIsImportingYatta(false)
    }
  }

  if (!activeSeries) return null

  // Calculate counts
  const ownedVolumes = activeSeries.volumes.filter((v) => v.status === 'OWNED' || v.status === 'READ')
  const ownedCount = ownedVolumes.length
  const lentCount = activeSeries.volumes.filter((v) => !!v.lentTo).length
  const missingCount = activeSeries.volumes.filter(
    (v) => (activeSeries.totalVolumes > 0 ? v.volumeNumber <= activeSeries.totalVolumes : true) && v.status !== 'OWNED' && v.status !== 'READ'
  ).length
  const totalCoverValue = ownedVolumes.reduce((sum, v) => sum + (v.coverPrice ?? 34.99), 0)
  const totalSpent = ownedVolumes.reduce((sum, v) => sum + (v.purchasePrice ?? v.coverPrice ?? 34.99), 0)
  const totalSavings = Math.max(0, totalCoverValue - totalSpent)

  const filteredVolumes = activeSeries.volumes.filter((v) => {
    if (volumeFilter === 'LENT') return !!v.lentTo
    if (volumeFilter === 'MISSING') {
      return (activeSeries.totalVolumes > 0 ? v.volumeNumber <= activeSeries.totalVolumes : true) && v.status !== 'OWNED' && v.status !== 'READ'
    }
    return true
  })

  // Bulk actions handlers
  const handleSetAllOwned = () => {
    const newVolumes = activeSeries.volumes.map((v) => ({
      ...v,
      status: 'OWNED' as const,
      purchasePrice: v.purchasePrice ?? 34.99,
    }))
    onUpdateSeries({ ...activeSeries, volumes: newVolumes })
  }

  const handleSetAllRead = () => {
    const newVolumes = activeSeries.volumes.map((v) => ({
      ...v,
      status: 'READ' as const,
      purchasePrice: v.purchasePrice ?? 34.99,
    }))
    onUpdateSeries({ ...activeSeries, volumes: newVolumes })
  }

  const handleApplyRange = () => {
    const min = Math.max(1, Math.min(bulkRangeFrom, bulkRangeTo))
    const max = Math.min(activeSeries.volumes.length, Math.max(bulkRangeFrom, bulkRangeTo))
    const parsedPrice = parseFloat(bulkPrice) || null

    const newVolumes = activeSeries.volumes.map((v) => {
      if (v.volumeNumber >= min && v.volumeNumber <= max) {
        return {
          ...v,
          status: bulkStatus,
          purchasePrice: bulkStatus === 'NONE' ? null : (v.purchasePrice ?? parsedPrice),
        }
      }
      return v
    })
    onUpdateSeries({ ...activeSeries, volumes: newVolumes })
  }

  // Update Series Rating (Moja ocena całej serii 1-10)
  const handleRateSeries = async (rating: number) => {
    if (!activeSeries) return
    const newRating = rating === activeSeries.userSeriesRating ? null : rating
    const updated = { ...activeSeries, userSeriesRating: newRating }
    onUpdateSeries(updated)

    try {
      const res = await fetch(`/api/manga/${activeSeries.mangaId}/rating`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rating: newRating,
          seriesTitle: activeSeries.title,
          coverUrl: activeSeries.coverUrl,
        }),
      })
      if (res.ok) {
        const data = await res.json()
        setCommunityRating({ average: data.averageRating, count: data.ratingCount })
      }
    } catch (err) {
      console.warn('Rating sync warning:', err)
    }
  }

  // Update single volume detail (Status, Price, Volume Rating, Notes, Custom Cover, Lending)
  const handleSaveVolumeDetail = (updatedVol: CollectionVolumeItem) => {
    const newVolumes = activeSeries.volumes.map((v) =>
      v.volumeNumber === updatedVol.volumeNumber ? updatedVol : v
    )
    const updated = { ...activeSeries, volumes: newVolumes }
    onUpdateSeries(updated)
    setEditingVolume(null)
  }

  return (
    <>
      {/* Cover Edit Modal for single volume cover */}
      {editingCoverVolNum !== null && (
        <CoverEditModal
          open={coverEditOpen}
          onOpenChange={(op) => {
            setCoverEditOpen(op)
            if (!op) setEditingCoverVolNum(null)
          }}
          currentCoverUrl={
            editingCoverVolNum !== null
              ? activeSeries.volumes.find((v) => v.volumeNumber === editingCoverVolNum)?.customCoverUrl ||
                activeSeries.volumes.find((v) => v.volumeNumber === editingCoverVolNum)?.coverUrl ||
                activeSeries.coverUrl
              : activeSeries.coverUrl
          }
          title={activeSeries.title}
          volumeNumber={editingCoverVolNum}
          publisher={activeSeries.publisher}
          onCoverUpdated={(newCoverUrl) => {
            if (editingCoverVolNum !== null) {
              const newVols = activeSeries.volumes.map((v) =>
                v.volumeNumber === editingCoverVolNum
                  ? { ...v, customCoverUrl: newCoverUrl }
                  : v
              )
              const updatedSeries = { ...activeSeries, volumes: newVols }
              onUpdateSeries(updatedSeries)

              // Synchronize local editingVolume state so it never resets customCoverUrl
              if (editingVolume && editingVolume.volumeNumber === editingCoverVolNum) {
                setEditingVolume((prev) => prev ? { ...prev, customCoverUrl: newCoverUrl } : null)
              }
            }
          }}
        />
      )}

      {/* Main Series Detail Modal */}
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl bg-[#090D18]/95 border-white/15 text-white backdrop-blur-3xl shadow-2xl rounded-3xl p-0 overflow-hidden sm:max-w-4xl">
          {/* Top Header with Dynamic Ambient Glow */}
          <div className="relative p-6 pb-4 border-b border-white/10 bg-gradient-to-r from-purple-950/40 via-[#0B1020] to-cyan-950/40 overflow-hidden">
            {/* Ambient Glow Backdrop */}
            <div className="absolute inset-0 -z-10 pointer-events-none overflow-hidden opacity-30">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={getCoverUrl(activeSeries.coverUrl)}
                alt=""
                aria-hidden="true"
                className="w-full h-full object-cover blur-3xl scale-150"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#090D18] via-transparent to-[#090D18]/80" />
            </div>
            <DialogHeader>
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-cyan-500/30 bg-cyan-500/10 px-3 py-0.5 text-[11px] font-bold text-cyan-300">
                  <Sparkles className="h-3 w-3" />
                  Kolekcja • Zarządzanie Serią
                </span>
                <Badge className="bg-primary/20 text-primary border-primary/30 text-[10px]">
                  {activeSeries.publisher}
                </Badge>
                <button
                  type="button"
                  onClick={() => setShowVolumeCountEditor(!showVolumeCountEditor)}
                  className="inline-flex items-center gap-1 rounded-full border border-white/20 bg-white/10 px-2.5 py-0.5 text-[10px] font-bold text-white hover:bg-white/20 hover:border-cyan-400 transition-all cursor-pointer"
                  title="Kliknij, aby zmienić polski tytuł oraz liczbę tomów w Polsce i Japonii"
                >
                  🇵🇱 {formatVolumeCount(activeSeries.totalVolumes)} w PL
                  <Edit2 className="h-2.5 w-2.5 text-cyan-300 ml-0.5" />
                </button>
                {activeSeries.totalVolumesJapan && (
                  <Badge className="bg-amber-500/15 text-amber-300 border-amber-500/30 text-[10px]">
                    🇯🇵 {formatVolumeCount(activeSeries.totalVolumesJapan)} w JP
                  </Badge>
                )}
              </div>

              {/* Inline Metadata & Volume Count Editor */}
              {showVolumeCountEditor && (
                <div className="my-2.5 p-3 rounded-2xl bg-[#090D18]/95 border border-cyan-500/40 flex flex-wrap items-center gap-3 animate-in fade-in duration-200">
                  <div className="flex items-center gap-1.5">
                    <Label className="text-[11px] text-muted-foreground whitespace-nowrap">🇵🇱 Tytuł polski:</Label>
                    <Input
                      type="text"
                      value={editPolishTitle}
                      placeholder="np. Atak Tytanów"
                      onChange={(e) => setEditPolishTitle(e.target.value)}
                      className="h-7 w-48 bg-white/5 border-white/20 text-white text-xs font-semibold px-2 placeholder:text-muted-foreground/40"
                    />
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Label className="text-[11px] text-muted-foreground whitespace-nowrap">🇵🇱 Tomy PL:</Label>
                    <Input
                      type="number"
                      min={1}
                      max={300}
                      value={editPolandCount}
                      onChange={(e) => setEditPolandCount(e.target.value)}
                      className="h-7 w-16 bg-white/5 border-white/20 text-white text-xs font-bold text-center"
                    />
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Label className="text-[11px] text-muted-foreground whitespace-nowrap">🇯🇵 Tomy JP:</Label>
                    <Input
                      type="number"
                      min={1}
                      max={300}
                      value={editJapanCount}
                      placeholder="np. 15"
                      onChange={(e) => setEditJapanCount(e.target.value)}
                      className="h-7 w-16 bg-white/5 border-white/20 text-white text-xs font-bold text-center placeholder:text-muted-foreground/40"
                    />
                  </div>
                  <div className="flex items-center gap-1.5 ml-auto">
                    <Button
                      type="button"
                      size="sm"
                      onClick={handleSaveVolumeCounts}
                      className="h-7 text-xs font-bold bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg px-3 shadow-md"
                    >
                      <Check className="h-3.5 w-3.5 mr-1" />
                      Zapisz zmiany
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => setShowVolumeCountEditor(false)}
                      className="h-7 text-xs text-muted-foreground hover:text-white"
                    >
                      Anuluj
                    </Button>
                  </div>
                </div>
              )}

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <DialogTitle className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                      {activeSeries.polishTitle || activeSeries.title}
                    </DialogTitle>
                    {activeSeries.polishTitle && activeSeries.polishTitle !== activeSeries.title && (
                      <span className="inline-flex items-center rounded-md bg-rose-500/20 px-2 py-0.5 text-[10px] font-bold text-rose-300 border border-rose-500/30">
                        🇵🇱 PL
                      </span>
                    )}
                  </div>
                  {activeSeries.polishTitle && activeSeries.polishTitle !== activeSeries.title && (
                    <p className="text-xs text-muted-foreground/80 font-medium mt-0.5">
                      Tytuł oryginalny: <span className="text-white/80">{activeSeries.title}</span>
                    </p>
                  )}
                  <div className="text-xs text-muted-foreground mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
                    <span>
                      Posiadasz <strong className="text-cyan-300 font-bold">{ownedCount}</strong> z {formatVolumeCount(activeSeries.totalVolumes)} w PL{activeSeries.totalVolumesJapan ? ` (w Japonii: ${formatVolumeCount(activeSeries.totalVolumesJapan)})` : ''}
                    </span>
                    <span>•</span>
                    <span>
                      Wydano: <strong className="text-white font-bold">{totalSpent.toFixed(2)} zł</strong>
                    </span>
                    <span className="text-[11px] text-muted-foreground">(okładkowa: {totalCoverValue.toFixed(2)} zł)</span>
                    {totalSavings > 0 && (
                      <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/40 text-[10px] py-0 px-1.5 gap-1 font-bold">
                        <Sparkles className="h-2.5 w-2.5" />
                        Zaoszczędzono: {totalSavings.toFixed(2)} zł
                      </Badge>
                    )}
                  </div>
                </div>

                {/* Moja ocena całej serii oraz Średnia ocena społeczności */}
                <div className="flex flex-col items-start sm:items-end gap-1.5 bg-white/[0.04] p-2.5 rounded-2xl border border-white/10 shrink-0">
                  {/* Moja ocena */}
                  <div className="flex flex-col items-start sm:items-end">
                    <span className="text-[10px] text-muted-foreground font-bold mb-1 uppercase tracking-wider">
                      Moja ocena całej serii: <strong className="text-amber-400 font-black">{activeSeries.userSeriesRating ? `${activeSeries.userSeriesRating}/10` : 'Brak'}</strong>
                    </span>
                    <div className="flex items-center gap-1">
                      {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((star) => (
                        <button
                          key={star}
                          type="button"
                          onClick={() => handleRateSeries(star)}
                          className="p-0.5 hover:scale-125 transition-transform"
                          title={`Oceń serię na ${star}/10`}
                        >
                          <Star
                            className={`h-4 w-4 ${
                              star <= (activeSeries.userSeriesRating || 0)
                                ? 'text-amber-400 fill-amber-400 shadow-sm'
                                : 'text-white/20 hover:text-amber-400/50'
                            }`}
                          />
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Średnia ocena wszystkich użytkowników */}
                  <div className="flex items-center gap-1.5 pt-1 border-t border-white/5 w-full sm:justify-end text-[11px]">
                    <span className="text-muted-foreground font-medium">Średnia ocena:</span>
                    {communityRating && communityRating.count > 0 && communityRating.average !== null ? (
                      <span className="flex items-center gap-1 font-bold text-amber-300">
                        <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                        {communityRating.average.toFixed(1)}/10
                        <span className="text-[10px] text-muted-foreground font-normal">
                          ({communityRating.count} {communityRating.count === 1 ? 'ocena' : communityRating.count < 5 ? 'oceny' : 'ocen'})
                        </span>
                      </span>
                    ) : (
                      <span className="text-muted-foreground/60 italic text-[10px]">Brak ocen</span>
                    )}
                  </div>
                </div>
              </div>
            </DialogHeader>
          </div>

          {/* Modal Body: Grid of Volumes by Cover */}
          <div className="p-6 max-h-[62vh] overflow-y-auto space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-extrabold text-white uppercase tracking-wider">
                Tomy w Kolekcji ({formatVolumeCount(activeSeries.volumes.length)}) — Kliknij w tom, aby go edytować
              </h4>
            </div>

            {/* Toolbar: Filter Tabs & Bulk Actions Toggle */}
            <div className="flex flex-wrap items-center justify-between gap-2 pb-1 border-b border-white/10">
              {/* Filter Pills */}
              <div className="flex items-center gap-1.5 flex-wrap">
                <Button
                  type="button"
                  variant={volumeFilter === 'ALL' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setVolumeFilter('ALL')}
                  className={`h-7 text-[11px] font-bold rounded-lg ${
                    volumeFilter === 'ALL' ? 'bg-white/15 text-white' : 'bg-transparent text-muted-foreground'
                  }`}
                >
                  Wszystkie ({activeSeries.volumes.length})
                </Button>
                <Button
                  type="button"
                  variant={volumeFilter === 'MISSING' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setVolumeFilter('MISSING')}
                  className={`h-7 text-[11px] font-bold rounded-lg ${
                    volumeFilter === 'MISSING' ? 'bg-rose-500/20 text-rose-300 border-rose-500/40' : 'bg-transparent text-muted-foreground'
                  }`}
                >
                  Brakujące ({missingCount})
                </Button>
                <Button
                  type="button"
                  variant={volumeFilter === 'LENT' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setVolumeFilter('LENT')}
                  className={`h-7 text-[11px] font-bold rounded-lg ${
                    volumeFilter === 'LENT' ? 'bg-amber-500/20 text-amber-300 border-amber-500/40' : 'bg-transparent text-muted-foreground'
                  }`}
                >
                  Wypożyczone ({lentCount})
                </Button>
              </div>

              <div className="flex items-center gap-1.5 flex-wrap">
                {/* Yatta.pl Importer Toggle */}
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => setShowYattaImporter(!showYattaImporter)}
                  className={`h-7 text-[11px] font-bold rounded-lg gap-1.5 transition-all ${
                    showYattaImporter
                      ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300 shadow-sm'
                      : 'bg-cyan-950/40 border-cyan-500/30 text-cyan-300 hover:text-white hover:bg-cyan-500/20'
                  }`}
                >
                  <Sparkles className="h-3 w-3 text-cyan-400" />
                  Importuj z Yatta.pl
                </Button>

                {/* Toggle Bulk Controls Button */}
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => setShowBulkControls(!showBulkControls)}
                  className={`h-7 text-[11px] font-bold rounded-lg gap-1.5 transition-all ${
                    showBulkControls
                      ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300 shadow-sm'
                      : 'bg-white/5 border-white/10 text-white/80 hover:text-white'
                  }`}
                >
                  <Layers className="h-3 w-3" />
                  Masowe Operacje
                </Button>
              </div>
            </div>

            {/* Yatta Importer Panel */}
            {showYattaImporter && (
              <div className="p-3.5 rounded-2xl bg-gradient-to-r from-cyan-950/50 via-purple-950/40 to-[#0B1020] border border-cyan-500/40 space-y-3 animate-in fade-in-50 duration-200">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <span className="text-xs font-black text-cyan-300 uppercase tracking-wider flex items-center gap-1.5">
                    <Sparkles className="h-3.5 w-3.5" />
                    Pobierz Oficjalne Okładki Tomów z Yatta.pl (Jakość HD)
                  </span>
                  <span className="text-[10px] text-muted-foreground">Wklej link do serii lub tomu</span>
                </div>

                <div className="flex flex-col sm:flex-row gap-2">
                  <Input
                    type="url"
                    placeholder="https://yatta.pl/Mangi_Kaoru_i_Rin_Rozkwitajac_z_toba,1,121312,st"
                    value={yattaSeriesUrl}
                    onChange={(e) => setYattaSeriesUrl(e.target.value)}
                    className="h-8 bg-white/5 border-cyan-500/40 text-xs text-white placeholder:text-muted-foreground/60 rounded-xl flex-1 focus-visible:ring-cyan-400"
                  />
                  <Button
                    type="button"
                    size="sm"
                    onClick={handleImportYattaCovers}
                    disabled={isImportingYatta || !yattaSeriesUrl.trim()}
                    className="h-8 bg-cyan-500 hover:bg-cyan-400 text-black font-extrabold text-xs rounded-xl px-3.5 shrink-0 gap-1.5 shadow-md shadow-cyan-500/20 disabled:opacity-50"
                  >
                    {isImportingYatta ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Sparkles className="h-3.5 w-3.5" />
                    )}
                    Zastosuj Okładki
                  </Button>
                </div>

                {yattaImportMessage && (
                  <div
                    className={`p-2 rounded-xl border text-[11px] font-semibold flex items-center gap-1.5 ${
                      yattaImportMessage.type === 'success'
                        ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-300'
                        : 'bg-rose-950/60 border-rose-500/40 text-rose-300'
                    }`}
                  >
                    {yattaImportMessage.type === 'success' ? (
                      <Check className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                    ) : null}
                    <span>{yattaImportMessage.text}</span>
                  </div>
                )}
              </div>
            )}

            {/* Bulk Controls Panel */}
            {showBulkControls && (
              <div className="p-3.5 rounded-2xl bg-gradient-to-r from-cyan-950/40 via-purple-950/30 to-[#0B1020] border border-cyan-500/30 space-y-3 animate-in fade-in-50 duration-200">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <span className="text-xs font-black text-cyan-300 uppercase tracking-wider flex items-center gap-1.5">
                    <CheckCheck className="h-3.5 w-3.5" />
                    Szybkie Ustawianie Wielu Tomów
                  </span>
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      size="sm"
                      onClick={handleSetAllOwned}
                      className="h-6 text-[10px] font-bold bg-emerald-600 hover:bg-emerald-500 text-white rounded-md px-2"
                    >
                      Posiadam Wszystkie (1 - {activeSeries.volumes.length})
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      onClick={handleSetAllRead}
                      className="h-6 text-[10px] font-bold bg-cyan-600 hover:bg-cyan-500 text-white rounded-md px-2"
                    >
                      Przeczytałem Wszystkie
                    </Button>
                  </div>
                </div>

                {/* Range Selector */}
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 pt-1">
                  <div className="flex items-center gap-1.5">
                    <Label className="text-[10px] text-muted-foreground whitespace-nowrap">Od tomu:</Label>
                    <Input
                      type="number"
                      min={1}
                      max={activeSeries.volumes.length}
                      value={bulkRangeFrom}
                      onChange={(e) => setBulkRangeFrom(parseInt(e.target.value, 10) || 1)}
                      className="h-7 text-xs bg-black/40 border-white/15 text-white w-16"
                    />
                    <Label className="text-[10px] text-muted-foreground whitespace-nowrap">do:</Label>
                    <Input
                      type="number"
                      min={1}
                      max={activeSeries.volumes.length}
                      value={bulkRangeTo}
                      onChange={(e) => setBulkRangeTo(parseInt(e.target.value, 10) || activeSeries.volumes.length)}
                      className="h-7 text-xs bg-black/40 border-white/15 text-white w-16"
                    />
                  </div>

                  <div className="flex items-center gap-1">
                    <Label className="text-[10px] text-muted-foreground whitespace-nowrap">Status:</Label>
                    <select
                      value={bulkStatus}
                      onChange={(e) => setBulkStatus(e.target.value as CollectionVolumeItem['status'])}
                      className="h-7 text-xs bg-black/40 border border-white/15 text-white rounded-md px-2 flex-1"
                    >
                      <option value="OWNED">Posiadany</option>
                      <option value="READ">Przeczytany</option>
                      <option value="WISHLIST">Chcę kupić</option>
                      <option value="NONE">Brak (Wyczyść)</option>
                    </select>
                  </div>

                  <div className="flex items-center gap-1">
                    <Label className="text-[10px] text-muted-foreground whitespace-nowrap">Cena:</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={bulkPrice}
                      onChange={(e) => setBulkPrice(e.target.value)}
                      placeholder="34.99"
                      className="h-7 text-xs bg-black/40 border-white/15 text-white w-20"
                    />
                    <span className="text-[10px] text-muted-foreground">zł</span>
                  </div>

                  <Button
                    type="button"
                    size="sm"
                    onClick={handleApplyRange}
                    className="h-7 text-xs font-bold bg-primary hover:bg-primary/80 text-white rounded-lg"
                  >
                    Zastosuj Zakres
                  </Button>
                </div>
              </div>
            )}

            {/* Volume Cover Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3.5">
              {filteredVolumes.map((vol) => {
                const coverToShow = vol.customCoverUrl || vol.coverUrl || activeSeries.coverUrl
                const isOwned = vol.status === 'OWNED' || vol.status === 'READ'
                const isOnlyInJapan = activeSeries.totalVolumes > 0 && vol.volumeNumber > activeSeries.totalVolumes

                return (
                  <div
                    key={vol.volumeNumber}
                    onClick={() => setEditingVolume(vol)}
                    className={`group relative flex flex-col rounded-2xl p-2 border transition-all duration-300 hover:-translate-y-1 cursor-pointer ${
                      isOnlyInJapan
                        ? 'bg-[#12111E] border-amber-500/25 hover:border-amber-400/60 hover:shadow-amber-500/10'
                        : 'bg-[#0E1424] border-white/10 hover:border-cyan-400/60 hover:shadow-cyan-500/20'
                    }`}
                  >
                    {/* Volume Cover Card */}
                    <div className={`relative aspect-[2/3] w-full overflow-hidden rounded-xl bg-black/60 shadow-lg ${
                      isOwned
                        ? 'ring-2 ring-emerald-500/50'
                        : isOnlyInJapan
                        ? 'opacity-65 saturate-75 ring-1 ring-amber-500/30'
                        : 'opacity-60 grayscale-[30%]'
                    }`}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={getCoverUrl(coverToShow)}
                        alt={`Tom ${vol.volumeNumber}`}
                        referrerPolicy="no-referrer"
                        crossOrigin="anonymous"
                        onError={(e) => {
                          ;(e.target as HTMLImageElement).src = getCoverUrl('')
                        }}
                        className="h-full w-full object-cover group-hover:scale-105 transition-transform"
                      />

                      {/* Status Tag */}
                      <div className="absolute top-1.5 right-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-black/80 backdrop-blur-xs text-[9px] font-black text-white">
                        {vol.volumeNumber}
                      </div>

                      {/* Custom cover badge or Japan-only badge */}
                      {isOnlyInJapan ? (
                        <span className="absolute top-1.5 left-1.5 rounded-md bg-amber-500/90 text-[8px] font-black text-black px-1.5 py-0.5 shadow-md z-10 flex items-center gap-0.5">
                          🇯🇵 Tylko JP
                        </span>
                      ) : vol.customCoverUrl ? (
                        <span className="absolute top-1.5 left-1.5 rounded-md bg-purple-600/90 text-[8px] font-extrabold text-white px-1 py-0.5 z-10">
                          Własna Okładka
                        </span>
                      ) : null}

                      {/* Lending badge if lent to friend */}
                      {vol.lentTo && (
                        <span className="absolute bottom-6 left-1 right-1 rounded-md bg-amber-400 text-[8px] font-black text-black px-1 py-0.5 text-center truncate shadow-lg z-10">
                          Pożyczone: {vol.lentTo}
                        </span>
                      )}

                      {/* Bottom Info Overlay */}
                      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/95 via-black/80 to-transparent p-1.5">
                        <div className="flex items-center justify-between text-[9px] font-bold">
                          <div className="flex items-center gap-1">
                            <span className="text-emerald-400">
                              {vol.purchasePrice ? `${vol.purchasePrice.toFixed(2)} zł` : `${(vol.coverPrice ?? 34.99).toFixed(2)} zł`}
                            </span>
                            {vol.purchasePrice && vol.coverPrice && vol.purchasePrice < vol.coverPrice && (
                              <span className="text-[7px] bg-emerald-500/25 text-emerald-300 px-1 py-0.5 rounded border border-emerald-500/40 font-black">
                                -{(vol.coverPrice - vol.purchasePrice).toFixed(0)} zł
                              </span>
                            )}
                          </div>
                          {vol.userRating && (
                            <span className="text-amber-400 flex items-center gap-0.5">
                              <Star className="h-2.5 w-2.5 fill-amber-400" />
                              {vol.userRating}/10
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Footer label */}
                    <div className="mt-2 flex items-center justify-between px-0.5 text-[10px]">
                      <span className="font-extrabold text-white flex items-center gap-1">
                        Tom {vol.volumeNumber}
                        {isOnlyInJapan && (
                          <span className="text-[8px] text-amber-400 font-bold">(JP)</span>
                        )}
                      </span>
                      <span className={`font-semibold ${
                        vol.status === 'READ' ? 'text-cyan-400' : vol.status === 'OWNED' ? 'text-emerald-400' : 'text-muted-foreground'
                      }`}>
                        {vol.status === 'READ' ? 'Przeczytany' : vol.status === 'OWNED' ? 'Posiadany' : 'Brak'}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Footer with Delete Series option */}
          <div className="p-4 border-t border-white/10 bg-[#070A12] flex items-center justify-between">
            <Button
              type="button"
              variant="destructive"
              onClick={() => {
                if (window.confirm(`Czy na pewno chcesz usunąć serię "${activeSeries.title}" ze swojej kolekcji?`)) {
                  removeSeriesFromCollection(activeSeries.id)
                  onOpenChange(false)
                }
              }}
              className="bg-rose-600/20 border border-rose-500/40 text-rose-300 hover:bg-rose-600 hover:text-white font-bold text-xs rounded-xl gap-1.5 shadow-sm transition-all"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Usuń serię z kolekcji
            </Button>

            <Button variant="ghost" onClick={() => onOpenChange(false)} className="text-xs text-muted-foreground hover:text-white font-bold">
              Zamknij
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Sub-Modal: Individual Volume Edit Modal */}
      {editingVolume && (
        <VolumeEditInSeriesModal
          open={Boolean(editingVolume)}
          onOpenChange={(op) => !op && setEditingVolume(null)}
          volume={editingVolume}
          seriesTitle={activeSeries.title}
          isJapanOnly={Boolean(activeSeries.totalVolumes > 0 && editingVolume.volumeNumber > activeSeries.totalVolumes)}
          onSave={handleSaveVolumeDetail}
          onOpenCoverEditor={() => {
            setEditingCoverVolNum(editingVolume.volumeNumber)
            setCoverEditOpen(true)
          }}
          isAdmin={isAdmin}
        />
      )}
    </>
  )
}

{/* Sub-component: Edit Volume Detail Modal */}
interface VolumeEditInSeriesModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  volume: CollectionVolumeItem
  seriesTitle: string
  isJapanOnly?: boolean
  onSave: (updatedVolume: CollectionVolumeItem) => void
  onOpenCoverEditor: () => void
  isAdmin?: boolean
}

function VolumeEditInSeriesModal({
  open,
  onOpenChange,
  volume,
  seriesTitle,
  isJapanOnly,
  onSave,
  onOpenCoverEditor,
  isAdmin,
}: VolumeEditInSeriesModalProps) {
  const coverPrice = volume.coverPrice ?? 34.99
  const [status, setStatus] = useState<CollectionVolumeItem['status']>(volume.status)
  const [price, setPrice] = useState(
    volume.purchasePrice !== null && volume.purchasePrice !== undefined
      ? String(volume.purchasePrice)
      : String(coverPrice)
  )
  const [rating, setRating] = useState<number | null>(volume.userRating || null)
  const [notes] = useState(volume.notes || '')
  const [lentTo, setLentTo] = useState(volume.lentTo || '')
  const [lentDate, setLentDate] = useState(volume.lentDate || '')

  const numPrice = parseFloat(price.replace(',', '.'))
  const isCustomPriceValid = !isNaN(numPrice) && numPrice > 0
  const savings = isCustomPriceValid && numPrice < coverPrice ? coverPrice - numPrice : 0
  const surcharge = isCustomPriceValid && numPrice > coverPrice ? numPrice - coverPrice : 0

  const handleConfirm = () => {
    onSave({
      ...volume,
      status,
      coverPrice,
      purchasePrice: isCustomPriceValid ? numPrice : null,
      userRating: rating,
      notes,
      lentTo: lentTo.trim() || null,
      lentDate: lentTo.trim() ? (lentDate || new Date().toISOString().split('T')[0]) : null,
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md bg-[#0D1222] border-white/15 text-white backdrop-blur-2xl shadow-2xl rounded-3xl p-6">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <DialogTitle className="text-xl font-extrabold text-white">
              Edycja: {seriesTitle} — Tom {volume.volumeNumber}
            </DialogTitle>
            {isJapanOnly && (
              <Badge className="bg-amber-500/20 text-amber-300 border-amber-500/40 text-[10px]">
                🇯🇵 Wydanie JP
              </Badge>
            )}
          </div>
          <DialogDescription className="text-xs text-muted-foreground">
            {isJapanOnly
              ? 'Tom wydany w Japonii (brak jeszcze wydania w Polsce). Możesz ustawić okładkę importu lub status.'
              : 'Ustaw własną okładkę, cenę zakupu w PLN, ocenę tomu i status'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Cover Preview & Cover Change Button */}
          <div className="flex items-center gap-4 p-3 rounded-2xl bg-white/[0.03] border border-white/10">
            <div className="relative aspect-[2/3] w-20 overflow-hidden rounded-xl bg-black border border-white/10 shadow-md shrink-0">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={getCoverUrl(volume.customCoverUrl || volume.coverUrl)}
                alt={`Tom ${volume.volumeNumber}`}
                referrerPolicy="no-referrer"
                crossOrigin="anonymous"
                onError={(e) => {
                  ;(e.target as HTMLImageElement).src = getCoverUrl('')
                }}
                className="h-full w-full object-cover"
              />
            </div>
            <div className="space-y-1 flex-1">
              <span className="text-xs font-bold text-white block">Okładka Tomu {volume.volumeNumber}</span>
              <p className="text-[10px] text-muted-foreground">
                {volume.customCoverUrl ? 'Wgrana własna okładka (Admin)' : 'Okładka domyślna wydawcy'}
              </p>
              {isAdmin && (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={onOpenCoverEditor}
                  className="h-7 text-[10px] bg-cyan-950/40 border-cyan-500/40 text-cyan-300 hover:bg-cyan-900/60 font-bold rounded-lg gap-1"
                >
                  <Edit2 className="h-3 w-3" />
                  Wgraj / Wykadruj Nową Okładkę
                </Button>
              )}
            </div>
          </div>

          {/* Status Selection */}
          <div>
            <Label className="text-xs text-muted-foreground block mb-1">Status w Mojej Kolekcji</Label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { val: 'OWNED', label: 'Posiadany' },
                { val: 'READ', label: 'Przeczytany' },
                { val: 'WISHLIST', label: 'Chcę kupić' },
                { val: 'ORDERED', label: 'Zamówiony' },
              ].map((st) => (
                <Button
                  key={st.val}
                  type="button"
                  variant={status === st.val ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setStatus(st.val as CollectionVolumeItem['status'])}
                  className={`text-xs font-bold rounded-xl h-9 ${
                    status === st.val
                      ? 'bg-primary text-white border-primary shadow-md'
                      : 'bg-white/5 border-white/10 text-muted-foreground hover:text-white'
                  }`}
                >
                  {st.label}
                </Button>
              ))}
            </div>
          </div>

          {/* Price Section: Cover Price & Purchase Price */}
          <div className="space-y-2.5 p-3 rounded-2xl bg-white/[0.03] border border-white/10">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground font-medium flex items-center gap-1.5">
                <BookOpen className="h-3.5 w-3.5 text-cyan-400" />
                Oficjalna cena okładkowa:
              </span>
              <span className="font-extrabold text-white text-sm">
                {coverPrice.toFixed(2)} zł
              </span>
            </div>

            <div className="pt-1">
              <div className="flex items-center justify-between mb-1.5">
                <Label className="text-xs text-muted-foreground">Cena Zakupu dla Tomu {volume.volumeNumber} (PLN)</Label>
                <button
                  type="button"
                  onClick={() => setPrice(coverPrice.toFixed(2))}
                  className="text-[10px] text-cyan-400 hover:text-cyan-300 font-semibold underline underline-offset-2"
                >
                  Użyj ceny okładkowej
                </button>
              </div>
              <Input
                type="text"
                inputMode="decimal"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder={`np. ${coverPrice.toFixed(2)} zł`}
                className="bg-white/5 border-white/15 text-white font-bold text-sm h-10 rounded-xl"
              />
            </div>

            {savings > 0 && (
              <div className="flex items-center justify-between p-2 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-bold animate-in fade-in-50">
                <span className="flex items-center gap-1.5">
                  <Sparkles className="h-3.5 w-3.5" />
                  Zaoszczędzono na tym tomie:
                </span>
                <span>{savings.toFixed(2)} zł</span>
              </div>
            )}
            {surcharge > 0 && (
              <div className="flex items-center justify-between p-2 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs font-bold animate-in fade-in-50">
                <span>Cena zakupu wyższa od okładkowej o:</span>
                <span>+{surcharge.toFixed(2)} zł</span>
              </div>
            )}
          </div>

          {/* Individual Volume Rating (1-10 Stars) */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <Label className="text-xs text-muted-foreground">Ocena Tomu {volume.volumeNumber}</Label>
              <span className="text-xs font-bold text-amber-400">{rating ? `${rating}/10` : 'Brak'}</span>
            </div>
            <div className="flex items-center justify-between p-2 rounded-xl bg-white/[0.03] border border-white/10">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star === rating ? null : star)}
                  className="p-0.5 hover:scale-125 transition-transform"
                >
                  <Star
                    className={`h-4 w-4 ${
                      star <= (rating || 0) ? 'text-amber-400 fill-amber-400' : 'text-white/20'
                    }`}
                  />
                </button>
              ))}
            </div>
          </div>

          {/* Lending Tracker Section */}
          <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                <UserCheck className="h-3.5 w-3.5" />
                Wypożyczenie Znajomemu
              </Label>
              {lentTo && (
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setLentTo('')
                    setLentDate('')
                  }}
                  className="h-6 text-[10px] text-amber-400 hover:text-white hover:bg-amber-500/20 px-2"
                >
                  Oznacz jako zwrócone
                </Button>
              )}
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-[10px] text-muted-foreground block mb-0.5">Komu pożyczono</Label>
                <Input
                  placeholder="np. Michał"
                  value={lentTo}
                  onChange={(e) => setLentTo(e.target.value)}
                  className="bg-black/40 border-amber-500/30 text-white text-xs h-8 rounded-lg"
                />
              </div>
              <div>
                <Label className="text-[10px] text-muted-foreground block mb-0.5">Data pożyczenia</Label>
                <Input
                  type="date"
                  value={lentDate}
                  onChange={(e) => setLentDate(e.target.value)}
                  className="bg-black/40 border-amber-500/30 text-white text-xs h-8 rounded-lg"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Save Footer */}
        <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/10">
          <Button variant="ghost" onClick={() => onOpenChange(false)} className="text-xs text-muted-foreground">
            Anuluj
          </Button>
          <Button onClick={handleConfirm} className="text-xs font-bold bg-primary text-white rounded-xl">
            Zapisz Zmiany Tomu
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
