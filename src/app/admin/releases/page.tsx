'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  Calendar,
  Plus,
  Trash2,
  Edit2,
  ArrowLeft,
  ExternalLink,
  Check,
  Loader2,
  Globe,
  ShoppingCart,
  ShieldAlert,
  Search,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import type { PolishRelease } from '@/app/api/releases/route'
import { PublisherSyncModal } from '@/components/manga/publisher-sync-modal'
import { AdminReleaseEditModal } from '@/components/admin/admin-release-edit-modal'
import {
  getAdminCustomReleases,
  saveAdminCustomReleases,
  getAdminDeletedReleaseIds,
  addAdminDeletedReleaseId,
  getAdminEditedReleases,
  saveAdminEditedRelease,
  type AdminCustomRelease,
} from '@/lib/admin-store'
import { getCoverUrl } from '@/lib/cover-utils'
import { cleanReleaseTitle, matchPublisher } from '@/lib/publisher-scraper'

export default function AdminReleasesPage() {
  const [allCalendarReleases, setAllCalendarReleases] = useState<AdminCustomRelease[]>([])
  const [loadingReleases, setLoadingReleases] = useState(true)

  // Floating Edit Modal State
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [editingRelease, setEditingRelease] = useState<AdminCustomRelease | null>(null)

  const [searchQuery, setSearchQuery] = useState('')
  const [selectedPublisherFilter, setSelectedPublisherFilter] = useState('Wszystkie')

  // Form State for inline adding new release
  const [publisher, setPublisher] = useState('Studio JG')
  const [seriesTitle, setSeriesTitle] = useState('')
  const [volumeNumber, setVolumeNumber] = useState('16')
  const [releaseDate, setReleaseDate] = useState('2026-10-02')
  const [pricePLN, setPricePLN] = useState('36.99')
  const [coverUrl, setCoverUrl] = useState('')
  const [shopUrl, setShopUrl] = useState('https://yatta.pl/manga/oshi-no-ko-16')
  const [ignoreScraper, setIgnoreScraper] = useState(true)

  const [syncModalOpen, setSyncModalOpen] = useState(false)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  // Load all releases (scraped + custom) and apply deleted/edited overrides
  const loadAllReleases = async () => {
    setLoadingReleases(true)
    try {
      const res = await fetch('/api/releases?all=true')
      let scrapedList: PolishRelease[] = []
      if (res.ok) {
        const data = await res.json()
        scrapedList = data.allReleases || data.releases || []
      }

      const convertedScraped: AdminCustomRelease[] = scrapedList.map((s) => ({
        id: s.id,
        mangaId: s.mangaId,
        seriesTitle: cleanReleaseTitle(s.title),
        volumeNumber: s.volumeNumber,
        releaseDate: s.date,
        day: s.day,
        month: s.month,
        year: s.year,
        publisher: s.publisher,
        pricePLN: s.pricePLN,
        coverUrl: s.coverUrl,
        ignoreScraper: false,
        description: s.description || undefined,
      }))

      const customList = getAdminCustomReleases()
      const combined = [...customList, ...convertedScraped]

      const seen = new Set<string>()
      const uniqueCombined: AdminCustomRelease[] = []
      for (const rel of combined) {
        if (!seen.has(rel.id)) {
          seen.add(rel.id)
          uniqueCombined.push(rel)
        }
      }

      const deletedIds = getAdminDeletedReleaseIds()
      const nonDeleted = uniqueCombined.filter((r) => !deletedIds.includes(r.id))

      const editedMap = getAdminEditedReleases()
      const finalReleases = nonDeleted.map((r) => (editedMap[r.id] ? editedMap[r.id] : r))

      setAllCalendarReleases(finalReleases)
    } catch (error) {
      console.error('Error loading calendar releases:', error)
    } finally {
      setLoadingReleases(false)
    }
  }

  useEffect(() => {
    const timer = setTimeout(() => {
      loadAllReleases()
    }, 0)

    const handleUpdate = () => loadAllReleases()
    window.addEventListener('mangowo_admin_updated', handleUpdate)
    return () => {
      clearTimeout(timer)
      window.removeEventListener('mangowo_admin_updated', handleUpdate)
    }
  }, [])

  // Save release from floating modal
  const handleSaveReleaseFromModal = (updatedRelease: AdminCustomRelease) => {
    const customList = getAdminCustomReleases()
    const isCustom = customList.some((r) => r.id === updatedRelease.id)

    if (isCustom) {
      const updatedCustom = customList.map((r) => (r.id === updatedRelease.id ? updatedRelease : r))
      saveAdminCustomReleases(updatedCustom)
    } else {
      saveAdminEditedRelease(updatedRelease.id, updatedRelease)
    }

    loadAllReleases()
    setSuccessMessage(`Pomyślnie zaktualizowano premierę ${updatedRelease.seriesTitle} Tom ${updatedRelease.volumeNumber}! Zmiany okładki i danych zostały zastosowane globalnie na całej stronie.`)
    setTimeout(() => setSuccessMessage(null), 4000)
  }

  // Open Floating Modal on Edit click
  const handleOpenEditModal = (rel: AdminCustomRelease) => {
    setEditingRelease(rel)
    setEditModalOpen(true)
  }

  const handleCreateReleaseInline = (e: React.FormEvent) => {
    e.preventDefault()
    if (!seriesTitle.trim()) return

    const vol = parseInt(volumeNumber, 10) || 1
    const dateObj = new Date(releaseDate)

    const shortMonths = ['Sty', 'Lut', 'Mar', 'Kwi', 'Maj', 'Cze', 'Lip', 'Sie', 'Wrz', 'Paź', 'Lis', 'Gru']
    const fullMonths = ['Styczeń', 'Luty', 'Marzec', 'Kwiecień', 'Maj', 'Czerwiec', 'Lipiec', 'Sierpień', 'Wrzesień', 'Październik', 'Listopad', 'Grudzień']

    const dayNum = !isNaN(dateObj.getTime()) ? dateObj.getDate() : 2
    const monthIdx = !isNaN(dateObj.getTime()) ? dateObj.getMonth() : 9
    const yearNum = !isNaN(dateObj.getTime()) ? dateObj.getFullYear() : 2026

    const newRel: AdminCustomRelease = {
      id: `manual-${Date.now()}`,
      seriesTitle: seriesTitle.trim(),
      volumeNumber: vol,
      releaseDate,
      day: `${dayNum} ${shortMonths[monthIdx]}`,
      month: fullMonths[monthIdx],
      year: yearNum,
      publisher,
      pricePLN: parseFloat(pricePLN) || 34.99,
      coverUrl: coverUrl.trim() || 'https://s4.anilist.co/file/anilistcdn/media/manga/cover/large/bx117195-2s5b3n4pZ9Ea.jpg',
      shopUrl: shopUrl.trim(),
      ignoreScraper,
      description: `Ręczna premiera dla ${seriesTitle} tom ${vol}.`,
    }

    const customList = getAdminCustomReleases()
    saveAdminCustomReleases([newRel, ...customList])
    setSeriesTitle('')
    setCoverUrl('')
    setShopUrl('')
    loadAllReleases()
    setSuccessMessage('Pomyślnie dodano nową ręczną premierę!')
    setTimeout(() => setSuccessMessage(null), 4000)
  }

  const handleDeleteRelease = (id: string) => {
    if (!confirm('Czy na pewno chcesz usunąć tę premierę z kalendarza?')) return

    const customList = getAdminCustomReleases()
    const isCustom = customList.some((r) => r.id === id)

    if (isCustom) {
      const updatedCustom = customList.filter((r) => r.id !== id)
      saveAdminCustomReleases(updatedCustom)
    } else {
      addAdminDeletedReleaseId(id)
    }

    loadAllReleases()
    setSuccessMessage('Pomyślnie usunięto premierę z kalendarza!')
    setTimeout(() => setSuccessMessage(null), 3000)
  }

  const handleApplyScrapedReleases = (scraped: PolishRelease[]) => {
    const converted: AdminCustomRelease[] = scraped.map((s) => ({
      id: s.id,
      mangaId: s.mangaId,
      seriesTitle: cleanReleaseTitle(s.title),
      volumeNumber: s.volumeNumber,
      releaseDate: s.date,
      day: s.day,
      month: s.month,
      year: s.year,
      publisher: s.publisher,
      pricePLN: s.pricePLN,
      coverUrl: s.coverUrl,
      ignoreScraper: false,
    }))

    const customList = getAdminCustomReleases()
    const merged = [...converted, ...customList]
    saveAdminCustomReleases(merged)
    loadAllReleases()
    setSuccessMessage(`Pomyślnie zaimportowano ${scraped.length} premier z planu wydawcy!`)
    setTimeout(() => setSuccessMessage(null), 4000)
  }

  const filteredReleases = allCalendarReleases.filter((rel) => {
    const matchesSearch =
      rel.seriesTitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
      rel.publisher.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesPub =
      selectedPublisherFilter === 'Wszystkie' ||
      matchPublisher(rel.publisher, selectedPublisherFilter)
    return matchesSearch && matchesPub
  })

  return (
    <div className="space-y-6 animate-in fade-in-50 duration-300 pb-16">
      {/* Floating Release Edit Modal */}
      <AdminReleaseEditModal
        open={editModalOpen}
        onOpenChange={setEditModalOpen}
        release={editingRelease}
        onSave={handleSaveReleaseFromModal}
      />

      {/* Publisher Sync Modal */}
      <PublisherSyncModal
        open={syncModalOpen}
        onOpenChange={setSyncModalOpen}
        onApplyReleases={handleApplyScrapedReleases}
      />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <Link href="/admin" className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-white mb-2">
            <ArrowLeft className="h-3.5 w-3.5" />
            Powrót do panelu administratora
          </Link>
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-cyan-500/20 text-cyan-400">
              <Calendar className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-2xl font-extrabold text-white">Zarządzanie Kalendarzem Premier</h1>
              <p className="text-xs text-muted-foreground">
                Kliknij „Edytuj” przy dowolnej premiery, aby otworzyć okno pływające i edytować okładki i dane
              </p>
            </div>
          </div>
        </div>

        <Button
          onClick={() => setSyncModalOpen(true)}
          className="bg-gradient-to-r from-primary to-cyan-500 font-bold text-xs shadow-lg shadow-primary/25 h-10 px-4 rounded-xl gap-2 text-white"
        >
          <Globe className="h-4 w-4" />
          Zaciągnij nową stronę wydawcy
        </Button>
      </div>

      {successMessage && (
        <div className="p-3.5 rounded-2xl bg-emerald-950/60 border border-emerald-500/40 text-xs font-bold text-emerald-300 flex items-center gap-2">
          <Check className="h-4 w-4 text-emerald-400" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* Inline Create Release Form */}
      <Card className="glass-panel border-white/10">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-bold flex items-center gap-2">
            <Plus className="h-4 w-4 text-primary" />
            Szybkie Dodanie Nowej Premiery Do Kalendarza
          </CardTitle>
          <CardDescription className="text-xs">
            Możesz też dodać nowy tom ręcznie z własnym linkiem do sklepu.
          </CardDescription>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleCreateReleaseInline} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold">Wydawnictwo</Label>
                <select
                  value={publisher}
                  onChange={(e) => setPublisher(e.target.value)}
                  className="w-full h-9 rounded-xl bg-white/5 border border-white/15 text-xs text-white px-3 focus:outline-none focus:border-primary"
                >
                  <option value="Studio JG" className="bg-[#090D18]">Studio JG</option>
                  <option value="Waneko" className="bg-[#090D18]">Waneko</option>
                  <option value="J.P.Fantastica" className="bg-[#090D18]">J.P.Fantastica</option>
                  <option value="Kotori" className="bg-[#090D18]">Kotori</option>
                  <option value="Dango" className="bg-[#090D18]">Dango</option>
                  <option value="Hanami" className="bg-[#090D18]">Hanami</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold">Tytuł serii mangi</Label>
                <Input
                  placeholder="np. Oshi no Ko, Chainsaw Man..."
                  value={seriesTitle}
                  onChange={(e) => setSeriesTitle(e.target.value)}
                  className="bg-white/5 border-white/15 text-xs h-9 rounded-xl text-white font-bold"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold">Numer tomu</Label>
                <Input
                  type="number"
                  min="1"
                  value={volumeNumber}
                  onChange={(e) => setVolumeNumber(e.target.value)}
                  className="bg-white/5 border-white/15 text-xs h-9 rounded-xl text-white font-bold"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold">Cena (PLN)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={pricePLN}
                  onChange={(e) => setPricePLN(e.target.value)}
                  className="bg-white/5 border-white/15 text-xs h-9 rounded-xl text-emerald-400 font-bold"
                  required
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold">Data premiery</Label>
                <Input
                  type="date"
                  value={releaseDate}
                  onChange={(e) => setReleaseDate(e.target.value)}
                  className="bg-white/5 border-white/15 text-xs h-9 rounded-xl text-white"
                  required
                />
              </div>

              <div className="space-y-1.5 lg:col-span-2">
                <Label className="text-xs font-bold">URL Okładki tomu (bezpośredni link)</Label>
                <Input
                  placeholder="https://..."
                  value={coverUrl}
                  onChange={(e) => setCoverUrl(e.target.value)}
                  className="bg-white/5 border-white/15 text-xs h-9 rounded-xl text-white"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-cyan-300">Link do sklepu (Pre-order)</Label>
                <Input
                  placeholder="https://yatta.pl/... lub https://waneko.pl/..."
                  value={shopUrl}
                  onChange={(e) => setShopUrl(e.target.value)}
                  className="bg-cyan-950/30 border-cyan-500/40 text-xs h-9 rounded-xl text-cyan-300"
                />
              </div>
            </div>

            <div className="flex items-center justify-between pt-2">
              <label className="flex items-center gap-2 text-xs font-bold text-amber-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={ignoreScraper}
                  onChange={(e) => setIgnoreScraper(e.target.checked)}
                  className="rounded border-white/20 bg-white/5 text-primary focus:ring-primary h-4 w-4"
                />
                <ShieldAlert className="h-4 w-4 text-amber-400 shrink-0" />
                <span>Wpis priorytetowy (Aktualizuje stronę)</span>
              </label>

              <Button
                type="submit"
                className="bg-gradient-to-r from-primary to-cyan-500 font-bold text-xs h-9 px-6 text-white rounded-xl shadow-md"
              >
                Dodaj Nową Premierę
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* All Calendar Releases Table with Floating Window Edit Trigger */}
      <Card className="glass-panel border-white/10">
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <ShoppingCart className="h-4 w-4 text-cyan-400" />
                Premiery w Kalendarzu ({filteredReleases.length})
              </CardTitle>
              <CardDescription className="text-xs">
                Kliknij „Edytuj” w wybranym wierszu, aby otworzyć pływające okno edycji (Floating Window).
              </CardDescription>
            </div>

            <div className="flex items-center gap-2">
              <div className="relative w-48">
                <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Szukaj serii lub wydawcy..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8 bg-white/5 border-white/10 text-xs h-8 rounded-xl text-white"
                />
              </div>

              <select
                value={selectedPublisherFilter}
                onChange={(e) => setSelectedPublisherFilter(e.target.value)}
                className="h-8 rounded-xl bg-white/5 border border-white/15 text-xs text-white px-2 focus:outline-none"
              >
                <option value="Wszystkie" className="bg-[#090D18]">Wszystkie Wydawnictwa</option>
                <option value="Waneko" className="bg-[#090D18]">Waneko</option>
                <option value="Studio JG" className="bg-[#090D18]">Studio JG</option>
                <option value="J.P.Fantastica" className="bg-[#090D18]">J.P.Fantastica</option>
                <option value="Kotori" className="bg-[#090D18]">Kotori</option>
                <option value="Dango" className="bg-[#090D18]">Dango</option>
              </select>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          {loadingReleases ? (
            <div className="flex flex-col items-center justify-center py-12 gap-2 text-xs text-muted-foreground">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
              <span>Wczytywanie pełnego kalendarza premier...</span>
            </div>
          ) : filteredReleases.length > 0 ? (
            <div className="space-y-2.5 max-h-[600px] overflow-y-auto pr-1">
              {filteredReleases.map((rel) => (
                <div
                  key={rel.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 rounded-2xl bg-white/[0.03] border border-white/10 hover:border-cyan-500/50 transition-all gap-3 group hover:bg-white/[0.05]"
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div className="relative h-14 w-10 shrink-0 overflow-hidden rounded-lg bg-black border border-white/10 shadow-md">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={getCoverUrl(rel.coverUrl)}
                        alt={rel.seriesTitle}
                        referrerPolicy="no-referrer"
                        crossOrigin="anonymous"
                        onError={(e) => {
                          ;(e.target as HTMLImageElement).src = 'https://s4.anilist.co/file/anilistcdn/media/manga/cover/large/bx117195-2s5b3n4pZ9Ea.jpg'
                        }}
                        className="h-full w-full object-cover transition-transform group-hover:scale-105"
                      />
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-bold text-cyan-300">{rel.day} {rel.year}</span>
                        <span className="text-[10px] text-muted-foreground">• Tom {rel.volumeNumber}</span>
                        <Badge variant="outline" className="text-[9px] border-white/20">
                          {rel.publisher}
                        </Badge>
                        {rel.ignoreScraper && (
                          <Badge className="bg-amber-500/20 text-amber-300 border-amber-500/30 text-[9px] gap-1">
                            <ShieldAlert className="h-2.5 w-2.5" />
                            Priorytet Admina
                          </Badge>
                        )}
                      </div>

                      <h4 className="text-xs font-bold text-white truncate mt-0.5">
                        {rel.seriesTitle} — Tom {rel.volumeNumber}
                      </h4>

                      <div className="flex items-center gap-3 mt-0.5">
                        <span className="text-[11px] font-extrabold text-emerald-400">{rel.pricePLN.toFixed(2)} PLN</span>
                        {rel.shopUrl && (
                          <a
                            href={rel.shopUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="text-[10px] font-bold text-cyan-400 hover:underline flex items-center gap-1"
                          >
                            Sklep <ExternalLink className="h-2.5 w-2.5" />
                          </a>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-center">
                    <Button
                      size="sm"
                      onClick={() => handleOpenEditModal(rel)}
                      className="h-8 px-3 text-xs bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 hover:bg-cyan-500/30 rounded-xl gap-1.5 font-bold shadow-sm"
                    >
                      <Edit2 className="h-3.5 w-3.5" />
                      Edytuj w oknie
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleDeleteRelease(rel.id)}
                      className="h-8 px-2 text-rose-400 hover:text-rose-300 hover:bg-rose-950/30 rounded-xl gap-1"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Usuń
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-8 text-center text-xs text-muted-foreground">
              Brak zaciągniętych premier pasujących do wybranych kryteriów.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
