'use client'

import { useState, useEffect, useMemo } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, Save, Trash2, Plus, Check, Image as ImageIcon, Sparkles, Loader2, ShoppingBag } from 'lucide-react'
import Link from 'next/link'
import { detectPublisherStore } from '@/lib/scrapers'
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
import { VolumeShopPricesModal } from '@/components/admin/volume-shop-prices-modal'
import { saveAdminMangaOverride, deleteAdminMangaOverride, getAdminMangaOverrides, syncGlobalOverridesFromServer, type AdminMangaOverride, type AdminVolumeOverride } from '@/lib/admin-store'
import { areSameSeries, normalizeTitleKey, getCanonicalPolishTitle } from '@/lib/title-utils'
import { getCoverUrl } from '@/lib/cover-utils'

export default function EditMangaPage() {
  const params = useParams()
  const router = useRouter()
  const mangaId = params.id as string

  const [loading, setLoading] = useState(false)
  const [deletingSeries, setDeletingSeries] = useState(false)
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
    totalVolumesJapan: null as number | null,
    anilistId: null as number | null,
  })

  const [volumes, setVolumes] = useState<AdminVolumeOverride[]>([])
  const [publishersList, setPublishersList] = useState<{ id: string; name: string; logo?: string | null }[]>([])

  useEffect(() => {
    fetch('/api/admin/publishers')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.publishers && Array.isArray(data.publishers)) {
          setPublishersList(data.publishers)
        }
      })
      .catch(() => {})
  }, [])

  // Volume Shop prices modal state
  const [selectedShopVolume, setSelectedShopVolume] = useState<number | null>(null)
  const [shopModalOpen, setShopModalOpen] = useState(false)

  // Japan volume lookup state
  const [isFetchingJapanVolumes, setIsFetchingJapanVolumes] = useState(false)
  const [japanFetchMessage, setJapanFetchMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const handleFetchJapanVolumes = async (silent = false, customTitle?: string) => {
    const titleToSearch = customTitle || form.title || form.polishTitle || mangaId
    if (!titleToSearch) return

    setIsFetchingJapanVolumes(true)
    if (!silent) setJapanFetchMessage(null)

    try {
      const res = await fetch('/api/admin/manga/japan-volumes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: customTitle || form.title,
          polishTitle: form.polishTitle,
          anilistId: !isNaN(Number(mangaId)) ? Number(mangaId) : null,
        }),
      })

      const data = await res.json()
      if (res.ok && data.success && data.volumes) {
        const fetchedJapan = data.volumes
        setForm((prev) => ({
          ...prev,
          totalVolumesJapan: fetchedJapan,
        }))

        // Ensure volume tiles array covers the Japan total count
        setVolumes((prevVols) => {
          const targetCount = Math.max(form.totalVolumes, fetchedJapan)
          if (targetCount > prevVols.length) {
            const added: AdminVolumeOverride[] = []
            for (let i = prevVols.length + 1; i <= targetCount; i++) {
              added.push({ volumeNumber: i, pricePLN: 34.99, customCoverUrl: null })
            }
            return [...prevVols, ...added]
          }
          return prevVols
        })

        if (!silent) {
          const sourceName = data.source === 'anilist' ? 'AniList (oficjalne)' : 'MangaDex (najwyższy wydany tom)'
          setJapanFetchMessage({
            type: 'success',
            text: `Pomyślnie zaciągnięto z API: ${data.volumes} tomów w Japonii (źródło: ${sourceName}).`,
          })
          setTimeout(() => setJapanFetchMessage(null), 5000)
        }
      } else {
        if (!silent) {
          setJapanFetchMessage({
            type: 'error',
            text: 'Nie znaleziono liczby tomów w Japonii w API – możesz wpisać ją ręcznie.',
          })
        }
      }
    } catch (err) {
      if (!silent) {
        setJapanFetchMessage({
          type: 'error',
          text: 'Błąd połączenia z API tomów japońskich.',
        })
      }
    } finally {
      setIsFetchingJapanVolumes(false)
    }
  }

  // Bulk price state
  const [bulkPrice, setBulkPrice] = useState('34.99')

  const handleApplyBulkPrice = () => {
    const p = parseFloat(bulkPrice.replace(',', '.'))
    if (isNaN(p) || p <= 0) return
    setVolumes((prev) => prev.map((v) => ({ ...v, pricePLN: p })))
  }

  // Publisher store series scraper state (Yatta.pl, Sklep Waneko, etc.)
  const [storeSeriesUrl, setStoreSeriesUrl] = useState('')
  const [isImportingStore, setIsImportingStore] = useState(false)
  const [storeImportMessage, setStoreImportMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const detectedStore = useMemo(() => {
    return detectPublisherStore(storeSeriesUrl)
  }, [storeSeriesUrl])

  const handleImportFromStore = async () => {
    if (!storeSeriesUrl.trim()) return
    setIsImportingStore(true)
    setStoreImportMessage(null)

    try {
      const res = await fetch('/api/admin/covers/grab', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: storeSeriesUrl.trim() }),
      })
      const data = await res.json()

      if (!res.ok || !data.success || !data.volumes || data.volumes.length === 0) {
        throw new Error(data.error || 'Nie udało się zaciągnąć tomów ze wskazanego adresu sklepu')
      }

      const newPolishTitle = data.seriesTitle || form.polishTitle
      const vol1 = data.volumes.find((v: { volumeNumber: number }) => v.volumeNumber === 1) || data.volumes[0]
      const newCustomCover = form.customCoverUrl || vol1?.coverUrl || null

      const scrapedVolCount = data.volumesCount || data.volumes.length
      const newPolandVolumes = Math.max(form.totalVolumes, scrapedVolCount)
      const maxVol = Math.max(
        newPolandVolumes,
        form.totalVolumesJapan || 0,
        ...data.volumes.map((v: { volumeNumber: number }) => v.volumeNumber)
      )

      const storeCoversMap: Record<number, string> = {}
      data.volumes.forEach((v: { volumeNumber: number; coverUrl: string }) => {
        storeCoversMap[v.volumeNumber] = v.coverUrl
      })

      const newVolumes: AdminVolumeOverride[] = []
      for (let i = 1; i <= maxVol; i++) {
        const existing = volumes.find((v) => v.volumeNumber === i)
        newVolumes.push({
          volumeNumber: i,
          customCoverUrl: storeCoversMap[i] || existing?.customCoverUrl || null,
          pricePLN: existing?.pricePLN || 34.99,
        })
      }

      const newPublisher =
        data.publisher ||
        (data.storeName?.toLowerCase().includes('waneko') ? 'Waneko' : null) ||
        (data.storeName?.toLowerCase().includes('yatta') ? 'Studio JG' : null) ||
        form.publisherName ||
        'Studio JG'

      setForm((prev) => ({
        ...prev,
        polishTitle: newPolishTitle,
        publisherName: newPublisher,
        totalVolumes: newPolandVolumes,
        customCoverUrl: newCustomCover,
      }))

      setVolumes(newVolumes)

      setStoreImportMessage({
        type: 'success',
        text: `Pomyślnie zaciągnięto ${data.volumesCount} tomów z oficjalnymi okładkami w jakości HD ze sklepu ${data.storeName || 'wydawcy'} dla serii "${data.seriesTitle}"! Zmiany zostały naniesione poniżej – kliknij "Zapisz Zmiany na Stronie".`,
      })
    } catch (err) {
      console.error('Store import error:', err)
      setStoreImportMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'Błąd podczas importu ze sklepu wydawcy',
      })
    } finally {
      setIsImportingStore(false)
    }
  }

  useEffect(() => {
    let isMounted = true
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

    // 1. Pre-fill immediately from local cache if available to prevent UI flicker
    if (existingOv) {
      const japanVols = existingOv.totalVolumesJapan ?? null
      const canonPolish = getCanonicalPolishTitle(existingOv.title) || getCanonicalPolishTitle(mangaId)
      const effPolish = (existingOv.polishTitle && existingOv.polishTitle !== existingOv.title)
        ? existingOv.polishTitle
        : canonPolish || existingOv.polishTitle || existingOv.title

      setForm({
        title: existingOv.title,
        nativeTitle: '',
        polishTitle: effPolish,
        publisherName: existingOv.publisher || 'Studio JG',
        description: 'Seria w bazie danych.',
        defaultCover: existingOv.customCoverUrl || '',
        customCoverUrl: existingOv.customCoverUrl || null,
        statusInPoland: existingOv.statusInPoland || 'ONGOING',
        totalVolumes: existingOv.totalVolumes || 1,
        totalVolumesJapan: japanVols,
        anilistId: (existingOv as any).anilistId || (!isNaN(Number(mangaId)) ? Number(mangaId) : null),
      })

      if (!japanVols && existingOv.title) {
        handleFetchJapanVolumes(true, existingOv.title)
      }

      const polandCount = existingOv.totalVolumes || 1
      const maxVolCount = Math.max(polandCount, japanVols || 0)

      const existingMap = new Map((existingOv.volumes || []).map((v) => [v.volumeNumber, v]))
      const initVols: AdminVolumeOverride[] = Array.from({ length: maxVolCount }, (_, i) => {
        const volNum = i + 1
        const ex = existingMap.get(volNum)
        return {
          volumeNumber: volNum,
          customCoverUrl: ex?.customCoverUrl || null,
          pricePLN: ex?.pricePLN || 34.99,
        }
      })
      setVolumes(initVols)
    }

    // 2. ALWAYS fetch authoritative fresh state from PostgreSQL database
    const fetchManga = async () => {
      try {
        const res = await fetch(`/api/manga/${mangaId}`)
        if (!isMounted) return
        if (res.ok) {
          const data = await res.json()
          const polandCount = data.totalVolumesPoland || data.totalVolumes || data._count?.volumes || data.volumes?.length || (existingOv?.totalVolumes) || 1
          const japanCount = data.totalVolumesJapan ?? (existingOv?.totalVolumesJapan) ?? null
          const maxVolCount = Math.max(polandCount, japanCount || 0)

          const vol1FromData = (data.volumes || []).find((v: any) => v.volumeNumber === 1)
          const effCustomCover = data.customCoverUrl || vol1FromData?.customCoverUrl || existingOv?.customCoverUrl || null
          const anilistIdFromData = data.anilistId || (existingOv as any)?.anilistId || (!isNaN(Number(mangaId)) ? Number(mangaId) : null)

          const canonPolish = getCanonicalPolishTitle(data.title) || getCanonicalPolishTitle(data.polishTitle) || getCanonicalPolishTitle(mangaId)
          const effPolish = (data.polishTitle && data.polishTitle !== data.title)
            ? data.polishTitle
            : (existingOv?.polishTitle && existingOv.polishTitle !== existingOv.title)
            ? existingOv.polishTitle
            : canonPolish || data.polishTitle || data.title || ''

          setForm({
            title: data.title || existingOv?.title || 'Manga',
            nativeTitle: data.nativeTitle || '',
            polishTitle: effPolish,
            publisherName: (data.publisher?.name && data.publisher.name !== 'Inne') ? data.publisher.name : (existingOv?.publisher || 'Studio JG'),
            description: data.description || '',
            defaultCover: data.defaultCover || existingOv?.defaultCover || '',
            customCoverUrl: effCustomCover,
            statusInPoland: data.statusInPoland || existingOv?.statusInPoland || 'ONGOING',
            totalVolumes: polandCount,
            totalVolumesJapan: japanCount,
            anilistId: anilistIdFromData,
          })

          if (!japanCount && (data.title || data.polishTitle)) {
            handleFetchJapanVolumes(true, data.title || data.polishTitle)
          }

          const existingDbMap = new Map<number, { volumeNumber: number; customCoverUrl?: string | null; pricePLN?: number | null }>(
            (data.volumes || []).map((v: any) => [v.volumeNumber, v])
          )
          const existingOvMap = new Map((existingOv?.volumes || []).map((v) => [v.volumeNumber, v]))

          const initVols: AdminVolumeOverride[] = Array.from({ length: maxVolCount }, (_, i) => {
            const volNum = i + 1
            const exDb = existingDbMap.get(volNum)
            const exOv = existingOvMap.get(volNum)
            const custom = exDb?.customCoverUrl || exOv?.customCoverUrl || null
            const price = (typeof exDb?.pricePLN === 'number' && exDb.pricePLN > 0)
              ? exDb.pricePLN
              : (exOv?.pricePLN || 34.99)

            return {
              volumeNumber: volNum,
              customCoverUrl: custom,
              pricePLN: price,
            }
          })
          setVolumes(initVols)
        }
      } catch (error) {
        console.error('Fetch manga error:', error)
      }
    }
    fetchManga()

    return () => {
      isMounted = false
    }
  }, [mangaId])

  // Adjust volume tiles length based on target max count
  const adjustVolumesLength = (targetCount: number) => {
    setVolumes((prevVols) => {
      if (targetCount > prevVols.length) {
        const added: AdminVolumeOverride[] = []
        for (let i = prevVols.length + 1; i <= targetCount; i++) {
          added.push({ volumeNumber: i, pricePLN: 34.99, customCoverUrl: null })
        }
        return [...prevVols, ...added]
      } else if (targetCount < prevVols.length) {
        return prevVols.slice(0, targetCount)
      }
      return prevVols
    })
  }

  // Update volume count dynamically when Poland volumes input changes
  const handleTotalVolumesPolandChange = (newCount: number) => {
    const validPoland = Math.max(1, newCount)
    setForm((prev) => {
      const isFinished = prev.statusInPoland === 'FINISHED'
      const updated = { ...prev, totalVolumes: validPoland }
      const maxTarget = isFinished ? validPoland : Math.max(validPoland, updated.totalVolumesJapan || 0)
      adjustVolumesLength(maxTarget)
      return updated
    })
  }

  // Update volume count dynamically when Japan volumes input changes
  const handleTotalVolumesJapanChange = (newJapanCount: number | null) => {
    setForm((prev) => {
      const updated = { ...prev, totalVolumesJapan: newJapanCount }
      const maxTarget = Math.max(prev.totalVolumes, newJapanCount || 0)
      adjustVolumesLength(maxTarget)
      return updated
    })
  }

  // Remove a specific volume from the list
  const handleRemoveVolume = (volNum: number) => {
    setVolumes((prev) => {
      const filtered = prev.filter((v) => v.volumeNumber !== volNum)
      // Renumber
      const renumbered = filtered.map((v, idx) => ({ ...v, volumeNumber: idx + 1 }))
      setForm((f) => {
        const newTotal = renumbered.length
        return {
          ...f,
          totalVolumes: Math.min(f.totalVolumes, newTotal),
          totalVolumesJapan: f.totalVolumesJapan ? Math.min(f.totalVolumesJapan, newTotal) : null,
        }
      })
      return renumbered
    })
  }

  // Add a new volume to the end of the list
  const handleAddVolume = () => {
    setVolumes((prev) => {
      const nextNum = prev.length + 1
      const updated = [...prev, { volumeNumber: nextNum, pricePLN: 34.99, customCoverUrl: null }]
      setForm((f) => ({
        ...f,
        totalVolumesJapan: Math.max(f.totalVolumesJapan || 0, updated.length),
      }))
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    const vol1Cover = volumes.find((v) => v.volumeNumber === 1)?.customCoverUrl || null
    const effectiveSeriesCover = form.customCoverUrl || vol1Cover || null

    if (effectiveSeriesCover && !form.customCoverUrl) {
      setForm((prev) => ({ ...prev, customCoverUrl: effectiveSeriesCover }))
    }

    try {
      // 1. Save Admin Override in admin-store (indexed by mangaId, anilistId, cuid, and canonical titles)
      saveAdminMangaOverride(mangaId, {
        id: mangaId,
        mangaId: form.anilistId ? String(form.anilistId) : mangaId,
        title: form.title,
        polishTitle: form.polishTitle,
        publisher: form.publisherName,
        statusInPoland: form.statusInPoland as AdminMangaOverride['statusInPoland'],
        totalVolumes: form.totalVolumes,
        totalVolumesJapan: form.totalVolumesJapan,
        customCoverUrl: effectiveSeriesCover,
        volumes,
      })

      // 2. Sync to database and await result
      try {
        await fetch(`/api/manga/${mangaId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: form.title,
            polishTitle: form.polishTitle,
            statusInPoland: form.statusInPoland,
            customCoverUrl: effectiveSeriesCover,
            totalVolumesJapan: form.totalVolumesJapan,
            totalVolumesPoland: form.totalVolumes,
            volumes: volumes.map((v) => {
              const effectiveVolCover = v.customCoverUrl || (v.volumeNumber === 1 && effectiveSeriesCover ? effectiveSeriesCover : null)
              return {
                volumeNumber: v.volumeNumber,
                coverUrl: effectiveVolCover || effectiveSeriesCover || '',
                customCoverUrl: effectiveVolCover,
                pricePLN: v.pricePLN,
              }
            }),
          }),
        })
      } catch (e) {
        console.warn('DB patch warning:', e)
      }

      // 3. Sync global overrides from server so other clients and cache are updated immediately
      await syncGlobalOverridesFromServer().catch(() => {})

      setSuccessMessage('Pomyślnie zapisano zmiany! Liczba tomów i okładki zostały zaktualizowane globalnie dla wszystkich użytkowników.')
      setTimeout(() => setSuccessMessage(null), 4000)
    } catch (error) {
      console.error('Save manga error:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteSeries = async () => {
    const displayName = form.polishTitle || form.title || 'tę serię'
    const confirmed = window.confirm(
      `Czy na pewno chcesz bezpowrotnie usunąć mangę "${displayName}"?\n\nUsunięcie spowoduje skasowanie tej serii oraz powiązanych z nią tomów z bazy danych serwisu.`
    )
    if (!confirmed) return

    try {
      setDeletingSeries(true)
      const res = await fetch(`/api/admin/manga?id=${encodeURIComponent(mangaId)}`, {
        method: 'DELETE',
      })

      if (!res.ok) {
        const errData = await res.json().catch(() => null)
        throw new Error(errData?.error || 'Nie udało się usunąć mangi')
      }

      deleteAdminMangaOverride(mangaId)
      window.dispatchEvent(new Event('mangowo_admin_updated'))
      window.dispatchEvent(new Event('mangowo_collection_updated'))
      router.push('/admin/manga')
    } catch (err: any) {
      alert(err.message || 'Wystąpił błąd podczas usuwania mangi')
      setDeletingSeries(false)
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
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleDeleteSeries}
          disabled={deletingSeries}
          className="border-rose-500/30 text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 text-xs font-bold rounded-xl gap-1.5"
          title="Usuń tę serię z serwisu"
        >
          {deletingSeries ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Trash2 className="h-3.5 w-3.5" />
          )}
          Usuń całą serię
        </Button>
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

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold">Status w Polsce</Label>
                <Select
                  value={form.statusInPoland}
                  onValueChange={(val: string | null) => {
                    const status = (val as AdminMangaOverride['statusInPoland']) || 'ONGOING'
                    setForm((prev) => {
                      const updated = { ...prev, statusInPoland: status }
                      if (status === 'FINISHED') {
                        adjustVolumesLength(prev.totalVolumes)
                      }
                      return updated
                    })
                  }}
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
                <Select
                  value={form.publisherName || (publishersList[0]?.name || '')}
                  onValueChange={(val: string | null) => setForm({ ...form, publisherName: val || '' })}
                >
                  <SelectTrigger className="bg-white/5 border-white/15 text-xs h-9 rounded-xl text-white">
                    <SelectValue placeholder="Wybierz wydawcę" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#0D121F] border-white/15 text-white text-xs">
                    {publishersList.map((pub) => (
                      <SelectItem key={pub.id} value={pub.name}>
                        <div className="flex items-center gap-2">
                          <div className="relative flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-white/10 overflow-hidden">
                            {pub.logo ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={getCoverUrl(pub.logo)}
                                alt={pub.name}
                                referrerPolicy="no-referrer"
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <span className="text-[7px] font-black text-cyan-300">
                                {pub.name.slice(0, 2).toUpperCase()}
                              </span>
                            )}
                          </div>
                          <span>{pub.name}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Volumes Management: Poland vs Japan */}
            <div className="rounded-2xl bg-white/[0.02] border border-white/10 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-white flex items-center gap-1.5">
                  <Sparkles className="h-3.5 w-3.5 text-cyan-400" />
                  Zarządzanie Liczbą Tomów (Polska vs Japonia)
                </h3>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-bold text-cyan-300 flex items-center gap-1.5">
                      <span>🇵🇱</span> Liczba tomów w Polsce
                    </Label>
                  </div>
                  <Input
                    type="number"
                    min="1"
                    max="200"
                    value={form.totalVolumes}
                    onChange={(e) => handleTotalVolumesPolandChange(parseInt(e.target.value, 10) || 1)}
                    className="bg-cyan-950/30 border-cyan-500/40 text-xs h-9 rounded-xl text-cyan-300 font-extrabold"
                    required
                  />
                  <p className="text-[10px] text-muted-foreground">
                    Liczba tomów wydanych lub zapowiedzianych na polskim rynku.
                  </p>
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                      <span>🇯🇵</span> Liczba tomów w Japonii
                    </Label>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleFetchJapanVolumes(false)}
                      disabled={isFetchingJapanVolumes}
                      className="h-6 px-2 text-[10px] text-amber-300 hover:bg-amber-500/20 gap-1 rounded-lg font-bold border border-amber-500/30"
                    >
                      {isFetchingJapanVolumes ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <Sparkles className="h-3 w-3 text-amber-400" />
                      )}
                      {isFetchingJapanVolumes ? 'Szukam w API...' : 'Pobierz z API'}
                    </Button>
                  </div>
                  <Input
                    type="number"
                    min="1"
                    max="300"
                    placeholder="np. 24"
                    value={form.totalVolumesJapan ?? ''}
                    onChange={(e) => {
                      const val = e.target.value === '' ? null : parseInt(e.target.value, 10)
                      handleTotalVolumesJapanChange(isNaN(val as number) ? null : val)
                    }}
                    className="bg-amber-950/30 border-amber-500/40 text-xs h-9 rounded-xl text-amber-300 font-extrabold"
                  />
                  <p className="text-[10px] text-muted-foreground">
                    Oryginalna liczba tomów w Japonii (zaciągana automatycznie z AniList / MangaDex).
                  </p>
                </div>
              </div>

              {japanFetchMessage && (
                <div
                  className={`p-2.5 rounded-xl text-xs flex items-center gap-2 border ${
                    japanFetchMessage.type === 'success'
                      ? 'bg-amber-950/40 border-amber-500/40 text-amber-300'
                      : 'bg-red-950/40 border-red-500/40 text-red-300'
                  }`}
                >
                  <Sparkles className="h-3.5 w-3.5 shrink-0" />
                  <span>{japanFetchMessage.text}</span>
                </div>
              )}
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
              fallbackUrl={volumes.find((v) => v.volumeNumber === 1)?.customCoverUrl || form.defaultCover || null}
              onChange={(url) => setForm({ ...form, customCoverUrl: url })}
              label="Wklej adres URL okładki serii"
            />
          </CardContent>
        </Card>
      </div>

      {/* Publisher Store Auto-Importer Card (Yatta.pl, Sklep Waneko, etc.) */}
      <Card className="glass-panel border-cyan-500/30 bg-gradient-to-r from-cyan-950/20 via-[#0B1020] to-purple-950/20">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="inline-flex items-center gap-1.5 rounded-full border border-cyan-500/30 bg-cyan-500/10 px-3 py-0.5 text-[11px] font-bold text-cyan-300">
              <Sparkles className="h-3.5 w-3.5" />
              <span>Automatyczny Importer Wydań PL • Sklepy Wydawców</span>
            </div>
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[10px] text-muted-foreground font-semibold">Obsługiwane sklepy:</span>
              <span className="rounded bg-white/10 px-2 py-0.5 text-[10px] font-bold text-cyan-300 border border-white/10">
                Yatta.pl
              </span>
              <span className="rounded bg-white/10 px-2 py-0.5 text-[10px] font-bold text-amber-300 border border-white/10">
                Sklep Waneko
              </span>
              <span className="text-[11px] font-bold text-emerald-400 ml-1">Jakość HD</span>
            </div>
          </div>
          <CardTitle className="text-base font-bold text-white mt-1">
            Zaciągnij tomy i oficjalne polskie okładki ze sklepu wydawcy
          </CardTitle>
          <CardDescription className="text-xs text-muted-foreground">
            Wklej link do serii lub tomu (np. <code className="text-cyan-300">https://yatta.pl/...</code> lub <code className="text-amber-300">https://sklepwaneko.pl/kategoria/910-chainsaw-man</code>).
            Nasz silnik pobierze wydane tomy i przypisze im oficjalne okładki wydawcy w jakości HD.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-3">
          <div className="flex flex-col sm:flex-row gap-2.5">
            <div className="relative flex-1">
              <Input
                type="url"
                placeholder="Wklej link do serii lub tomu (np. https://yatta.pl/... lub https://sklepwaneko.pl/...)"
                value={storeSeriesUrl}
                onChange={(e) => setStoreSeriesUrl(e.target.value)}
                className="bg-white/5 border-cyan-500/30 text-xs h-10 rounded-xl text-white flex-1 focus-visible:ring-cyan-400 pr-24"
              />
              {detectedStore && (
                <span className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-md bg-cyan-950/80 border border-cyan-500/40 px-2 py-0.5 text-[10px] font-extrabold text-cyan-300 shadow-sm">
                  {detectedStore.name}
                </span>
              )}
            </div>
            <Button
              type="button"
              onClick={handleImportFromStore}
              disabled={isImportingStore || !storeSeriesUrl.trim()}
              className="bg-gradient-to-r from-cyan-500 to-primary hover:from-cyan-400 text-black font-extrabold text-xs h-10 px-5 rounded-xl gap-2 shadow-lg shadow-cyan-500/20 shrink-0 disabled:opacity-50"
            >
              {isImportingStore ? (
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

          {storeImportMessage && (
            <div
              className={`p-3 rounded-xl border text-xs font-semibold flex items-center gap-2 ${
                storeImportMessage.type === 'success'
                  ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-300'
                  : 'bg-rose-950/60 border-rose-500/40 text-rose-300'
              }`}
            >
              {storeImportMessage.type === 'success' ? (
                <Check className="h-4 w-4 text-emerald-400 shrink-0" />
              ) : null}
              <span>{storeImportMessage.text}</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Volume Management Section */}
      <Card className="glass-panel border-white/10">
        <CardHeader className="pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <CardTitle className="text-base font-bold flex items-center gap-2 flex-wrap">
              <ImageIcon className="h-4 w-4 text-cyan-400" />
              <span>Zarządzanie Tomami Serii ({volumes.length} tomów)</span>
              <Badge variant="outline" className="text-[10px] border-cyan-500/30 text-cyan-300 bg-cyan-500/10">
                🇵🇱 {form.totalVolumes} w Polsce
              </Badge>
              {form.totalVolumesJapan && (
                <Badge variant="outline" className="text-[10px] border-amber-500/30 text-amber-300 bg-amber-500/10">
                  🇯🇵 {form.totalVolumesJapan} w Japonii
                </Badge>
              )}
            </CardTitle>
            <CardDescription className="text-xs">
              Kafelki odzwierciedlają tomy wydane w Japonii ({volumes.length}). Tomy 1–{form.totalVolumes} posiadają oficjalne polskie okładki.
            </CardDescription>
          </div>

          <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
            <div className="flex items-center gap-1.5 bg-white/5 border border-white/10 px-2 py-1 rounded-xl">
              <span className="text-[11px] text-muted-foreground whitespace-nowrap">Cena dla wszystkich:</span>
              <Input
                type="number"
                step="0.01"
                value={bulkPrice}
                onChange={(e) => setBulkPrice(e.target.value)}
                className="h-7 w-20 text-xs font-bold text-emerald-400 bg-black/40 border-white/10 rounded-lg text-center"
              />
              <span className="text-[10px] text-muted-foreground">PLN</span>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={handleApplyBulkPrice}
                className="h-7 text-[11px] font-bold rounded-lg px-2.5 bg-emerald-600/20 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-600/30"
              >
                Zastosuj do wszystkich
              </Button>
            </div>

            <Button
              onClick={handleAddVolume}
              size="sm"
              className="bg-white/10 hover:bg-white/20 text-xs font-bold text-white rounded-xl gap-1.5 h-9"
            >
              <Plus className="h-3.5 w-3.5 text-cyan-400" />
              Dodaj Tom #{volumes.length + 1}
            </Button>
          </div>
        </CardHeader>

        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {volumes.map((vol) => {
              const isOnlyInJapan = vol.volumeNumber > form.totalVolumes
              return (
                <div
                  key={vol.volumeNumber}
                  className={`p-3 rounded-2xl border flex flex-col justify-between space-y-2 group transition-all ${
                    isOnlyInJapan
                      ? 'bg-amber-950/15 border-amber-500/25 hover:border-amber-500/50'
                      : 'bg-white/[0.03] border-white/10 hover:border-cyan-500/40'
                  }`}
                >
                  <div className="flex items-center justify-between gap-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-xs font-black text-white">Tom {vol.volumeNumber}</span>
                      {isOnlyInJapan ? (
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/30">
                          🇯🇵 Tylko w JP
                        </span>
                      ) : (
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                          🇵🇱 W Polsce
                        </span>
                      )}
                    </div>
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
                        src={getCoverUrl(vol.customCoverUrl || (isOnlyInJapan ? form.defaultCover : form.customCoverUrl || form.defaultCover))}
                        alt={`Tom ${vol.volumeNumber}`}
                        className={`h-full w-full object-cover ${isOnlyInJapan && !vol.customCoverUrl ? 'opacity-60 saturate-75' : ''}`}
                      />
                    </div>

                    <div className="flex-1 space-y-1.5">
                      <Input
                        placeholder={isOnlyInJapan ? 'Opcjonalna okładka JP' : 'Adres URL okładki tomu'}
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

                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setSelectedShopVolume(vol.volumeNumber)
                          setShopModalOpen(true)
                        }}
                        className="h-6 px-2 text-[10px] font-bold text-cyan-300 hover:text-cyan-200 bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 rounded-lg gap-1 w-full justify-center"
                      >
                        <ShoppingBag className="h-3 w-3" />
                        Linki do sklepów
                      </Button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Volume Shop Prices Modal */}
      {selectedShopVolume && (
        <VolumeShopPricesModal
          open={shopModalOpen}
          onOpenChange={setShopModalOpen}
          mangaId={mangaId}
          mangaTitle={form.polishTitle || form.title}
          volumeNumber={selectedShopVolume}
        />
      )}
    </div>
  )
}
