'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { ArrowLeft, Save, Trash2, Plus, Check, Image as ImageIcon, Sparkles, Loader2 } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { CoverUpload } from '@/components/manga/cover-upload'
import { saveAdminMangaOverride, getAdminMangaOverrides, type AdminMangaOverride, type AdminVolumeOverride } from '@/lib/admin-store'
import { getSavedCollection, saveCollectionToStorage } from '@/lib/collection-store'
import { getCoverUrl } from '@/lib/cover-utils'

export default function EditMangaPage() {
  const params = useParams()
  const mangaId = params.id as string

  const [loading, setLoading] = useState(false)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [form, setForm] = useState({
    title: '',
    nativeTitle: '',
    polishTitle: '',
    publisherName: 'Studio JG',
    description: '',
    defaultCover: '',
    customCoverUrl: null as string | null,
    statusInPoland: 'ONGOING',
    totalVolumes: 1,
  })

  const [volumes, setVolumes] = useState<AdminVolumeOverride[]>([])

  // Yatta.pl series scraper state
  const [yattaSeriesUrl, setYattaSeriesUrl] = useState('')
  const [isImportingYatta, setIsImportingYatta] = useState(false)
  const [yattaImportMessage, setYattaImportMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const handleImportFromYatta = async () => {
    if (!yattaSeriesUrl.trim()) return
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
        throw new Error(data.error || 'Nie udało się zaciągnąć tomów ze wskazanego adresu Yatta.pl')
      }

      const newPolishTitle = data.seriesTitle || form.polishTitle
      const vol1 = data.volumes.find((v: { volumeNumber: number }) => v.volumeNumber === 1) || data.volumes[0]
      const newCustomCover = vol1?.coverUrl || form.customCoverUrl

      const maxVol = Math.max(
        form.totalVolumes,
        data.volumesCount,
        ...data.volumes.map((v: { volumeNumber: number }) => v.volumeNumber)
      )

      const yattaCoversMap: Record<number, string> = {}
      data.volumes.forEach((v: { volumeNumber: number; coverUrl: string }) => {
        yattaCoversMap[v.volumeNumber] = v.coverUrl
      })

      const newVolumes: AdminVolumeOverride[] = []
      for (let i = 1; i <= maxVol; i++) {
        const existing = volumes.find((v) => v.volumeNumber === i)
        newVolumes.push({
          volumeNumber: i,
          customCoverUrl: yattaCoversMap[i] || existing?.customCoverUrl || null,
          pricePLN: existing?.pricePLN || 34.99,
        })
      }

      setForm((prev) => ({
        ...prev,
        polishTitle: newPolishTitle,
        publisherName: prev.publisherName || 'Studio JG',
        totalVolumes: maxVol,
        customCoverUrl: newCustomCover,
      }))

      setVolumes(newVolumes)

      setYattaImportMessage({
        type: 'success',
        text: `Pomyślnie zaciągnięto ${data.volumesCount} tomów z oficjalnymi okładkami w jakości HD dla serii "${data.seriesTitle}"! Zmiany zostały naniesione poniżej – kliknij "Zapisz Zmiany na Stronie".`,
      })
    } catch (err) {
      console.error('Yatta import error:', err)
      setYattaImportMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'Błąd podczas importu ze sklepu Yatta.pl',
      })
    } finally {
      setIsImportingYatta(false)
    }
  }

  useEffect(() => {
    const overrides = getAdminMangaOverrides()
    const normKey = mangaId.toLowerCase().trim()
    const existingOv =
      overrides[mangaId] ||
      Object.values(overrides).find(
        (ov) =>
          ov.id === mangaId ||
          ov.title.toLowerCase().trim() === normKey ||
          (ov.polishTitle && ov.polishTitle.toLowerCase().trim() === normKey)
      )

    if (existingOv) {
      const timer = setTimeout(() => {
        setForm({
          title: existingOv.title,
          nativeTitle: '',
          polishTitle: existingOv.polishTitle || existingOv.title,
          publisherName: existingOv.publisher || 'Studio JG',
          description: 'Seria w bazie danych.',
          defaultCover: existingOv.customCoverUrl || 'https://s4.anilist.co/file/anilistcdn/media/manga/cover/large/bx117195-2s5b3n4pZ9Ea.jpg',
          customCoverUrl: existingOv.customCoverUrl || null,
          statusInPoland: existingOv.statusInPoland || 'ONGOING',
          totalVolumes: existingOv.totalVolumes || 16,
        })

        if (existingOv.volumes && existingOv.volumes.length > 0) {
          setVolumes(existingOv.volumes)
        } else {
          const initVols: AdminVolumeOverride[] = Array.from({ length: existingOv.totalVolumes || 16 }, (_, i) => ({
            volumeNumber: i + 1,
            customCoverUrl: null,
            pricePLN: 34.99,
          }))
          setVolumes(initVols)
        }
      }, 0)
      return () => clearTimeout(timer)
    }

    // 2. Fetch manga from API
    const fetchManga = async () => {
      try {
        const res = await fetch(`/api/manga/${mangaId}`)
        if (res.ok) {
          const data = await res.json()
          const volCount = data.totalVolumes || data._count?.volumes || data.volumes?.length || 16
          setForm({
            title: data.title || 'Manga',
            nativeTitle: data.nativeTitle || '',
            polishTitle: data.polishTitle || data.title || '',
            publisherName: data.publisher?.name || 'Studio JG',
            description: data.description || '',
            defaultCover: data.defaultCover || '',
            customCoverUrl: data.customCoverUrl || null,
            statusInPoland: data.statusInPoland || 'ONGOING',
            totalVolumes: volCount,
          })

          const initVols: AdminVolumeOverride[] = Array.from({ length: volCount }, (_, i) => ({
            volumeNumber: i + 1,
            customCoverUrl: data.volumes?.[i]?.customCoverUrl || null,
            pricePLN: 34.99,
          }))
          setVolumes(initVols)
        }
      } catch (error) {
        console.error('Fetch manga error:', error)
      }
    }
    fetchManga()
  }, [mangaId])

  // Update volume count dynamically when totalVolumes input changes
  const handleTotalVolumesChange = (newCount: number) => {
    const validCount = Math.max(1, newCount)
    setForm((prev) => ({ ...prev, totalVolumes: validCount }))

    setVolumes((prevVols) => {
      if (validCount > prevVols.length) {
        const added: AdminVolumeOverride[] = []
        for (let i = prevVols.length + 1; i <= validCount; i++) {
          added.push({ volumeNumber: i, pricePLN: 34.99 })
        }
        return [...prevVols, ...added]
      } else {
        return prevVols.slice(0, validCount)
      }
    })
  }

  // Remove a specific volume from the list
  const handleRemoveVolume = (volNum: number) => {
    setVolumes((prev) => {
      const filtered = prev.filter((v) => v.volumeNumber !== volNum)
      // Renumber
      const renumbered = filtered.map((v, idx) => ({ ...v, volumeNumber: idx + 1 }))
      setForm((f) => ({ ...f, totalVolumes: renumbered.length }))
      return renumbered
    })
  }

  // Add a new volume to the end of the list
  const handleAddVolume = () => {
    setVolumes((prev) => {
      const nextNum = prev.length + 1
      const updated = [...prev, { volumeNumber: nextNum, pricePLN: 34.99 }]
      setForm((f) => ({ ...f, totalVolumes: updated.length }))
      return updated
    })
  }

  // Update specific volume properties
  const handleVolumeChange = (
    volNum: number,
    field: keyof AdminVolumeOverride,
    value: string | number | null | undefined
  ) => {
    setVolumes((prev) =>
      prev.map((v) => (v.volumeNumber === volNum ? { ...v, [field]: value } : v))
    )
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      // 1. Save Admin Override in admin-store
      saveAdminMangaOverride(mangaId, {
        id: mangaId,
        title: form.title,
        polishTitle: form.polishTitle,
        publisher: form.publisherName,
        statusInPoland: form.statusInPoland as AdminMangaOverride['statusInPoland'],
        totalVolumes: form.totalVolumes,
        customCoverUrl: form.customCoverUrl,
        volumes,
      })

      // 2. Sync to saved collection in localStorage if present
      const collection = getSavedCollection()
      const normTarget = form.title.toLowerCase().trim()

      const updatedCol = collection.map((series) => {
        if (series.title.toLowerCase().trim() === normTarget || series.id === mangaId || series.mangaId === mangaId) {
          // Adjust volume array
          const newVolArray = volumes.map((v) => {
            const existingVol = series.volumes.find((ex) => ex.volumeNumber === v.volumeNumber)
            return {
              volumeNumber: v.volumeNumber,
              coverUrl: v.customCoverUrl || existingVol?.coverUrl || series.coverUrl,
              customCoverUrl: v.customCoverUrl || existingVol?.customCoverUrl || null,
              status: existingVol?.status || 'NONE',
              purchasePrice: v.pricePLN || existingVol?.purchasePrice || 34.99,
              userRating: existingVol?.userRating || null,
            }
          })

          return {
            ...series,
            title: form.title,
            totalVolumes: form.totalVolumes,
            coverUrl: form.customCoverUrl || series.coverUrl,
            volumes: newVolArray,
          }
        }
        return series
      })

      saveCollectionToStorage(updatedCol)

      setSuccessMessage('Pomyślnie zapisano zmiany! Liczba tomów i okładki zostały zaktualizowane na całej stronie.')
      setTimeout(() => setSuccessMessage(null), 4000)
    } catch (error) {
      console.error('Save manga error:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6 animate-in fade-in-50 duration-300 pb-16">
      <div className="flex items-center justify-between gap-4">
        <Link
          href="/admin/manga"
          className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-white"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Powrót do listy serii
        </Link>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-white flex items-center gap-2">
            Edycja Serii: {form.title}
            <Badge className="bg-primary/20 text-primary border-primary/30 text-[10px]">
              {form.statusInPoland === 'FINISHED' ? 'Zakończona w PL' : 'Wychodzi w PL'}
            </Badge>
          </h1>
          <p className="text-xs text-muted-foreground">
            Zarządzaj statusem wydań, oficjalną liczbą tomów w Polsce i okładkami poszczególnych tomów.
          </p>
        </div>

        <Button
          onClick={handleSubmit}
          disabled={loading}
          className="bg-gradient-to-r from-primary to-cyan-500 font-bold text-xs shadow-lg shadow-primary/25 h-10 px-5 rounded-xl gap-2 text-white"
        >
          <Save className="h-4 w-4" />
          {loading ? 'Zapisywanie...' : 'Zapisz Zmiany na Stronie'}
        </Button>
      </div>

      {successMessage && (
        <div className="p-3.5 rounded-2xl bg-emerald-950/60 border border-emerald-500/40 text-xs font-bold text-emerald-300 flex items-center gap-2">
          <Check className="h-4 w-4 text-emerald-400" />
          <span>{successMessage}</span>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Metadata Form */}
        <Card className="glass-panel border-white/10 lg:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-bold">Główne Informacje o Serii</CardTitle>
            <CardDescription className="text-xs">
              Modyfikacja tytułu, statusu i oficjalnej liczby wydanych tomów w Polsce
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold">Tytuł (Oryginalny / Angielski)</Label>
                <Input
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  className="bg-white/5 border-white/15 text-xs h-9 rounded-xl text-white font-bold"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold">Tytuł Polski</Label>
                <Input
                  value={form.polishTitle}
                  onChange={(e) => setForm({ ...form, polishTitle: e.target.value })}
                  className="bg-white/5 border-white/15 text-xs h-9 rounded-xl text-white"
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold">Status w Polsce</Label>
                <Select
                  value={form.statusInPoland}
                  onValueChange={(val: string | null) =>
                    setForm({ ...form, statusInPoland: (val as AdminMangaOverride['statusInPoland']) || 'ONGOING' })
                  }
                >
                  <SelectTrigger className="bg-white/5 border-white/15 text-xs h-9 rounded-xl text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[#0D121F] border-white/15 text-white text-xs">
                    <SelectItem value="ONGOING">Wychodzi (ONGOING)</SelectItem>
                    <SelectItem value="FINISHED">Zakończone (FINISHED)</SelectItem>
                    <SelectItem value="CANCELLED">Anulowane (CANCELLED)</SelectItem>
                    <SelectItem value="HIATUS">Przerwa (HIATUS)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold">Wydawnictwo</Label>
                <Input
                  value={form.publisherName}
                  onChange={(e) => setForm({ ...form, publisherName: e.target.value })}
                  className="bg-white/5 border-white/15 text-xs h-9 rounded-xl text-white"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-cyan-300">Liczba tomów w Polsce</Label>
                <Input
                  type="number"
                  min="1"
                  max="200"
                  value={form.totalVolumes}
                  onChange={(e) => handleTotalVolumesChange(parseInt(e.target.value, 10) || 1)}
                  className="bg-cyan-950/30 border-cyan-500/40 text-xs h-9 rounded-xl text-cyan-300 font-extrabold"
                  required
                />
                <p className="text-[10px] text-muted-foreground">
                  Zmniejsz/zwiększ, jeśli API podaje np. 20 tomów, a w PL jest 16!
                </p>
              </div>
            </div>

            <div className="space-y-1.5 pt-2">
              <Label className="text-xs font-bold">Opis serii</Label>
              <Textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                rows={3}
                className="bg-white/5 border-white/15 text-xs rounded-xl text-white resize-none"
              />
            </div>
          </CardContent>
        </Card>

        {/* Custom Series Cover */}
        <Card className="glass-panel border-white/10">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-bold">Główna Okładka Serii</CardTitle>
            <CardDescription className="text-xs">Ustawiana jako domyślna dla Tomu 1</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <CoverUpload
              value={form.customCoverUrl}
              onChange={(url) => setForm({ ...form, customCoverUrl: url })}
              label="Wklej adres URL okładki serii"
            />
          </CardContent>
        </Card>
      </div>

      {/* Yatta.pl Auto-Importer Card */}
      <Card className="glass-panel border-cyan-500/30 bg-gradient-to-r from-cyan-950/20 via-[#0B1020] to-purple-950/20">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="inline-flex items-center gap-1.5 rounded-full border border-cyan-500/30 bg-cyan-500/10 px-3 py-0.5 text-[11px] font-bold text-cyan-300">
              <Sparkles className="h-3.5 w-3.5" />
              <span>Automatyczny Importer Wydań PL • Yatta.pl</span>
            </div>
            <span className="text-[11px] font-bold text-cyan-400">Jakość HD (size601)</span>
          </div>
          <CardTitle className="text-base font-bold text-white mt-1">
            Zaciągnij tomy i oficjalne polskie okładki z Yatta.pl
          </CardTitle>
          <CardDescription className="text-xs text-muted-foreground">
            Wklej link do serii na Yatta.pl (np. <code className="text-cyan-300">https://yatta.pl/Mangi_Kaoru_i_Rin_Rozkwitajac_z_toba,1,121312,st</code>).
            Nasz silnik pobierze wszystkie wydane tomy i przypisze im oficjalne okładki wydawcy.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-3">
          <div className="flex flex-col sm:flex-row gap-2.5">
            <Input
              type="url"
              placeholder="Wklej link do serii ze sklepu Yatta.pl (https://yatta.pl/...)"
              value={yattaSeriesUrl}
              onChange={(e) => setYattaSeriesUrl(e.target.value)}
              className="bg-white/5 border-cyan-500/30 text-xs h-10 rounded-xl text-white flex-1 focus-visible:ring-cyan-400"
            />
            <Button
              type="button"
              onClick={handleImportFromYatta}
              disabled={isImportingYatta || !yattaSeriesUrl.trim()}
              className="bg-gradient-to-r from-cyan-500 to-primary hover:from-cyan-400 text-black font-extrabold text-xs h-10 px-5 rounded-xl gap-2 shadow-lg shadow-cyan-500/20 shrink-0 disabled:opacity-50"
            >
              {isImportingYatta ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin text-black" />
                  Pobieranie tomów...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 text-black" />
                  Zaciągnij Okładki Tomów
                </>
              )}
            </Button>
          </div>

          {yattaImportMessage && (
            <div
              className={`p-3 rounded-xl border text-xs font-semibold flex items-center gap-2 ${
                yattaImportMessage.type === 'success'
                  ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-300'
                  : 'bg-rose-950/60 border-rose-500/40 text-rose-300'
              }`}
            >
              {yattaImportMessage.type === 'success' ? (
                <Check className="h-4 w-4 text-emerald-400 shrink-0" />
              ) : null}
              <span>{yattaImportMessage.text}</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Volume Management Section */}
      <Card className="glass-panel border-white/10">
        <CardHeader className="pb-3 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <ImageIcon className="h-4 w-4 text-cyan-400" />
              Zarządzanie Tomami Serii ({volumes.length} tomów)
            </CardTitle>
            <CardDescription className="text-xs">
              Dodawaj nowe tomy, usuwaj zbędne lub ustawiaj indywidualne okładki tomów
            </CardDescription>
          </div>

          <Button
            onClick={handleAddVolume}
            size="sm"
            className="bg-white/10 hover:bg-white/20 text-xs font-bold text-white rounded-xl gap-1.5"
          >
            <Plus className="h-3.5 w-3.5 text-cyan-400" />
            Dodaj Tom #{volumes.length + 1}
          </Button>
        </CardHeader>

        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {volumes.map((vol) => (
              <div
                key={vol.volumeNumber}
                className="p-3 rounded-2xl bg-white/[0.03] border border-white/10 flex flex-col justify-between space-y-2 group hover:border-cyan-500/40 transition-all"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-white">Tom {vol.volumeNumber}</span>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleRemoveVolume(vol.volumeNumber)}
                    className="h-6 w-6 text-muted-foreground hover:text-red-400 hover:bg-red-950/40 rounded-lg"
                    title={`Usuń Tom ${vol.volumeNumber}`}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>

                <div className="flex gap-2.5 items-center">
                  <div className="relative h-14 w-10 shrink-0 overflow-hidden rounded-lg bg-black border border-white/10">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={getCoverUrl(vol.customCoverUrl || form.customCoverUrl || form.defaultCover)}
                      alt={`Tom ${vol.volumeNumber}`}
                      className="h-full w-full object-cover"
                    />
                  </div>

                  <div className="flex-1 space-y-1.5">
                    <Input
                      placeholder="Adres URL okładki tomu"
                      value={vol.customCoverUrl || ''}
                      onChange={(e) => handleVolumeChange(vol.volumeNumber, 'customCoverUrl', e.target.value)}
                      className="bg-white/5 border-white/10 text-[10px] h-7 rounded-lg text-white"
                    />
                    <div className="flex items-center gap-1">
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="Cena PLN"
                        value={vol.pricePLN || 34.99}
                        onChange={(e) => handleVolumeChange(vol.volumeNumber, 'pricePLN', parseFloat(e.target.value) || 34.99)}
                        className="bg-white/5 border-white/10 text-[10px] h-7 rounded-lg text-emerald-400 font-bold w-24"
                      />
                      <span className="text-[10px] text-muted-foreground">PLN</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
