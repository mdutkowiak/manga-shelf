'use client'

import { useState, useEffect, useRef } from 'react'
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
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import {
  Edit2,
  Save,
  ImageIcon,
  ShoppingCart,
  ShieldAlert,
  Search,
  Store,
  Plus,
  Trash2,
  ExternalLink,
  Loader2,
  Check,
  Building2,
} from 'lucide-react'
import type { AdminCustomRelease } from '@/lib/admin-store'
import { getCoverUrl } from '@/lib/cover-utils'
import type { UnifiedMangaSearchResult } from '@/app/api/manga/search/route'

interface AdminReleaseEditModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  release: AdminCustomRelease | null
  onSave: (updatedRelease: AdminCustomRelease) => void
}

const PREDEFINED_SHOPS = [
  { name: 'Yatta.pl', domain: 'yatta.pl', logo: 'https://cache.yatta-static.pl/yatta_favicon.jpg' },
  { name: 'Sklep Waneko', domain: 'waneko.pl', logo: 'https://sklepwaneko.pl/img/logo-1732709891.jpg' },
  { name: 'Gildia.pl', domain: 'gildia.pl', logo: 'https://www.gildia.pl/favicon.ico' },
  { name: 'Empik.com', domain: 'empik.com', logo: 'https://www.empik.com/favicon.ico' },
  { name: 'Mangarden.pl', domain: 'mangarden.pl', logo: 'https://mangarden.pl/favicon.ico' },
  { name: 'Sklep Dango', domain: 'sklep-dango.pl', logo: 'https://sklep-dango.pl/images/logos/1/dango_logo.png' },
]

function detectShopInfo(url: string) {
  if (!url) return null
  const lower = url.toLowerCase()
  return PREDEFINED_SHOPS.find((s) => lower.includes(s.domain)) || null
}

export function AdminReleaseEditModal({
  open,
  onOpenChange,
  release,
  onSave,
}: AdminReleaseEditModalProps) {
  const [form, setForm] = useState<AdminCustomRelease>({
    id: '',
    mangaId: '',
    seriesTitle: '',
    volumeNumber: 1,
    releaseDate: new Date().toISOString().slice(0, 10),
    day: '',
    month: '',
    year: new Date().getFullYear(),
    publisher: 'Studio JG',
    pricePLN: 34.99,
    shopPrice: undefined,
    coverUrl: '',
    shopUrl: '',
    shopLinks: [],
    ignoreScraper: true,
    description: '',
  })

  const [urlInput, setUrlInput] = useState('')
  const [publishers, setPublishers] = useState<{ id: string; name: string; logo?: string | null }[]>([])

  // Search Autocomplete State
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<UnifiedMangaSearchResult[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [showSearchDropdown, setShowSearchDropdown] = useState(false)
  const searchContainerRef = useRef<HTMLDivElement>(null)

  // Load registered publishers
  useEffect(() => {
    fetch('/api/admin/publishers')
      .then((res) => (res.ok ? res.json() : Promise.reject(res)))
      .then((data) => {
        if (data.publishers && Array.isArray(data.publishers)) {
          setPublishers(data.publishers)
          setForm((prev) => {
            if (!prev.publisher && data.publishers.length > 0) {
              return { ...prev, publisher: data.publishers[0].name }
            }
            return prev
          })
        }
      })
      .catch(() => {})
  }, [])

  // Synchronize form with release prop
  useEffect(() => {
    if (release && open) {
      const timer = setTimeout(() => {
        setForm({
          ...release,
          mangaId: release.mangaId || '',
          shopUrl: release.shopUrl || '',
          shopPrice: release.shopPrice,
          shopLinks: release.shopLinks || [],
          description: release.description || '',
          ignoreScraper: release.ignoreScraper !== false,
        })
        setUrlInput(release.coverUrl || '')
        setSearchQuery('')
        setShowSearchDropdown(false)
      }, 0)
      return () => clearTimeout(timer)
    }
  }, [release, open])

  // Click outside search dropdown listener
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) {
        setShowSearchDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Debounced search when user types title
  useEffect(() => {
    if (!searchQuery || searchQuery.trim().length < 2) {
      setSearchResults([])
      setIsSearching(false)
      return
    }

    const timer = setTimeout(async () => {
      setIsSearching(true)
      try {
        const res = await fetch(`/api/manga/search?q=${encodeURIComponent(searchQuery.trim())}`)
        if (res.ok) {
          const data = await res.json()
          setSearchResults(data.mangas || [])
          setShowSearchDropdown(true)
        }
      } catch (err) {
        console.warn('Manga search error:', err)
      } finally {
        setIsSearching(false)
      }
    }, 280)

    return () => clearTimeout(timer)
  }, [searchQuery])

  const handleSelectMangaResult = (m: UnifiedMangaSearchResult) => {
    const bestTitle = m.polishTitle || m.primaryTitle || m.title
    const bestCover = m.coverUrl || ''
    const bestPublisher = m.publisher || form.publisher

    setForm((prev) => ({
      ...prev,
      seriesTitle: bestTitle,
      mangaId: m.anilistId ? String(m.anilistId) : (m.dbId || m.id || prev.mangaId),
      publisher: bestPublisher,
      coverUrl: bestCover || prev.coverUrl,
    }))

    if (bestCover) {
      setUrlInput(bestCover)
    }

    setShowSearchDropdown(false)
    setSearchQuery('')
  }

  const handleUrlPaste = (url: string) => {
    const clean = url.trim()
    setUrlInput(clean)
    setForm((prev) => ({ ...prev, coverUrl: clean }))
  }

  // Shop Links Handlers
  const handleAddShopLink = () => {
    setForm((prev) => ({
      ...prev,
      shopLinks: [
        ...(prev.shopLinks || []),
        {
          name: 'Yatta.pl',
          url: '',
          price: prev.pricePLN || 34.99,
          logo: 'https://yatta.pl/favicon.ico',
        },
      ],
    }))
  }

  const handleUpdateShopLink = (
    index: number,
    field: 'name' | 'url' | 'price' | 'logo',
    val: any
  ) => {
    setForm((prev) => {
      const updated = [...(prev.shopLinks || [])]
      const current = { ...updated[index] }

      if (field === 'url') {
        current.url = val
        const detected = detectShopInfo(val)
        if (detected) {
          if (!current.name || current.name === 'Sklep') current.name = detected.name
          if (!current.logo) current.logo = detected.logo
        }
      } else if (field === 'name') {
        current.name = val
        const preset = PREDEFINED_SHOPS.find((s) => s.name === val)
        if (preset) current.logo = preset.logo
      } else if (field === 'price') {
        current.price = parseFloat(val) || undefined
      } else if (field === 'logo') {
        current.logo = val
      }

      updated[index] = current
      return { ...prev, shopLinks: updated }
    })
  }

  const handleRemoveShopLink = (index: number) => {
    setForm((prev) => ({
      ...prev,
      shopLinks: (prev.shopLinks || []).filter((_, i) => i !== index),
    }))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.seriesTitle.trim()) return

    const dateObj = new Date(form.releaseDate)
    const shortMonths = ['Sty', 'Lut', 'Mar', 'Kwi', 'Maj', 'Cze', 'Lip', 'Sie', 'Wrz', 'Paź', 'Lis', 'Gru']
    const fullMonths = ['Styczeń', 'Luty', 'Marzec', 'Kwiecień', 'Maj', 'Czerwiec', 'Lipiec', 'Sierpień', 'Wrzesień', 'Październik', 'Listopad', 'Grudzień']

    const dayNum = !isNaN(dateObj.getTime()) ? dateObj.getDate() : 1
    const monthIdx = !isNaN(dateObj.getTime()) ? dateObj.getMonth() : 0
    const yearNum = !isNaN(dateObj.getTime()) ? dateObj.getFullYear() : new Date().getFullYear()

    const updated: AdminCustomRelease = {
      ...form,
      seriesTitle: form.seriesTitle.trim(),
      volumeNumber: Number(form.volumeNumber) || 1,
      pricePLN: Number(form.pricePLN) || 34.99,
      shopPrice: form.shopPrice ? Number(form.shopPrice) : undefined,
      day: `${dayNum} ${shortMonths[monthIdx]}`,
      month: fullMonths[monthIdx],
      year: yearNum,
      coverUrl: form.coverUrl || urlInput || '',
      shopUrl: form.shopUrl?.trim() || undefined,
      shopLinks: form.shopLinks?.filter((s) => s.url.trim().length > 0) || [],
    }

    onSave(updated)
    onOpenChange(false)
  }

  if (!release) return null

  const primaryShopDetected = detectShopInfo(form.shopUrl || '')

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl w-[94vw] sm:max-w-4xl md:max-w-5xl bg-[#090D18]/98 border-white/15 text-white backdrop-blur-2xl rounded-3xl p-0 overflow-hidden shadow-2xl transition-all duration-300">
        <DialogHeader className="p-6 sm:p-7 pb-4 border-b border-white/10 bg-white/[0.02]">
          <div className="flex items-center gap-3.5">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 shadow-md">
              <Edit2 className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-2xl font-extrabold text-white tracking-wide">
                Edycja Premiery Kalendarza
              </DialogTitle>
              <DialogDescription className="text-xs sm:text-sm text-muted-foreground mt-0.5">
                Wyszukaj i podepnij serię z bazy, zarządzaj okładką, linkami do sklepów i porównywarką cen.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="p-6 sm:p-8 space-y-6 max-h-[82vh] overflow-y-auto">
          <div className="grid gap-8 md:grid-cols-12 items-start">
            {/* Left Column: Live 2:3 Cover Preview */}
            <div className="md:col-span-4 flex flex-col items-center space-y-3 bg-white/[0.02] p-5 rounded-2xl border border-white/10">
              <Label className="text-xs font-bold text-cyan-300 uppercase tracking-wider self-start flex items-center gap-1.5">
                <ImageIcon className="h-4 w-4" />
                Podgląd Okładki (2:3)
              </Label>

              <div className="relative aspect-[2/3] w-full max-w-[220px] overflow-hidden rounded-2xl bg-black border border-white/15 shadow-2xl group">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={getCoverUrl(form.coverUrl || urlInput)}
                  alt={form.seriesTitle}
                  referrerPolicy="no-referrer"
                  crossOrigin="anonymous"
                  onError={(e) => {
                    ;(e.target as HTMLImageElement).src = getCoverUrl('')
                  }}
                  className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                />

                <div className="absolute top-2.5 left-2.5 rounded-lg bg-black/85 backdrop-blur-md px-2.5 py-1 text-xs font-black text-cyan-300 border border-cyan-500/40 shadow-md">
                  {form.day || 'Premiera'}
                </div>

                <div className="absolute bottom-2.5 left-2.5 right-2.5 rounded-xl bg-black/90 backdrop-blur-md p-2 text-center border border-white/15 shadow-lg">
                  <span className="text-xs font-extrabold text-white block truncate">
                    {form.seriesTitle || 'Tytuł serii'} #{form.volumeNumber}
                  </span>
                  {form.shopPrice && form.shopPrice < form.pricePLN ? (
                    <div className="flex items-center justify-center gap-1.5 mt-0.5">
                      <span className="text-[10px] text-muted-foreground line-through font-medium">
                        {form.pricePLN.toFixed(2)} zł
                      </span>
                      <span className="text-xs font-black text-emerald-400">
                        {form.shopPrice.toFixed(2)} zł
                      </span>
                      <span className="text-[9px] px-1 py-0.2 rounded bg-rose-950 text-rose-300 border border-rose-500/40 font-black">
                        -{Math.round(((form.pricePLN - form.shopPrice) / form.pricePLN) * 100)}%
                      </span>
                    </div>
                  ) : (
                    <span className="text-xs font-black text-emerald-400 mt-0.5 block">
                      {form.pricePLN.toFixed(2)} PLN
                    </span>
                  )}
                </div>
              </div>

              <div className="text-center">
                <Badge variant="outline" className="text-[10px] font-semibold border-white/20 text-muted-foreground px-3 py-1">
                  Pełny podgląd wykadrowanej grafiki
                </Badge>
              </div>
            </div>

            {/* Right Column: Form Inputs */}
            <div className="md:col-span-8 space-y-5">
              {/* Autocomplete Manga Title Search */}
              <div className="space-y-1.5 relative" ref={searchContainerRef}>
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-bold uppercase tracking-wider text-cyan-300 flex items-center gap-1.5">
                    <Search className="h-3.5 w-3.5 text-cyan-400" />
                    Tytuł serii mangi (Wyszukiwarka z bazy & AniList)
                  </Label>
                  {form.mangaId && (
                    <span className="text-[10px] text-cyan-400 font-medium">
                      ID powiązanej serii: <strong>{form.mangaId}</strong>
                    </span>
                  )}
                </div>

                <div className="relative">
                  <Input
                    value={form.seriesTitle}
                    onChange={(e) => {
                      const val = e.target.value
                      setForm({ ...form, seriesTitle: val })
                      setSearchQuery(val)
                    }}
                    onFocus={() => {
                      if (searchResults.length > 0) setShowSearchDropdown(true)
                    }}
                    className="bg-white/5 border-white/15 text-sm h-11 rounded-xl text-white font-extrabold px-3.5 pr-10 focus:border-cyan-400"
                    placeholder="Wpisz polski lub japoński tytuł, np. Kaoru, Chainsaw Man..."
                    required
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1">
                    {isSearching ? (
                      <Loader2 className="h-4 w-4 animate-spin text-cyan-400" />
                    ) : (
                      <Search className="h-4 w-4 text-muted-foreground opacity-60" />
                    )}
                  </div>
                </div>

                {/* Floating Autocomplete Dropdown */}
                {showSearchDropdown && searchResults.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-1 z-50 rounded-2xl border border-white/20 bg-[#0B0F1A]/98 backdrop-blur-2xl shadow-2xl p-2 max-h-72 overflow-y-auto space-y-1 animate-in fade-in zoom-in-95">
                    <div className="px-2 py-1 text-[11px] font-bold uppercase text-muted-foreground flex items-center justify-between border-b border-white/10 pb-1.5 mb-1">
                      <span>Wybierz mangę z bazy, aby automatycznie uzupełnić dane</span>
                      <span className="text-cyan-400 font-bold">{searchResults.length} wyników</span>
                    </div>

                    {searchResults.map((item) => (
                      <button
                        key={`${item.id}-${item.primaryTitle}`}
                        type="button"
                        onClick={() => handleSelectMangaResult(item)}
                        className="w-full flex items-center gap-3 p-2 rounded-xl text-left hover:bg-white/10 transition-colors group"
                      >
                        <div className="relative aspect-[2/3] w-10 shrink-0 overflow-hidden rounded-lg bg-black border border-white/10">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={getCoverUrl(item.coverUrl)}
                            alt={item.primaryTitle}
                            referrerPolicy="no-referrer"
                            className="h-full w-full object-cover"
                            onError={(e) => {
                              ;(e.target as HTMLImageElement).src = getCoverUrl('')
                            }}
                          />
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-white truncate group-hover:text-cyan-300">
                              {item.polishTitle || item.primaryTitle}
                            </span>
                            {item.isLocal ? (
                              <span className="text-[9px] px-1.5 py-0.2 rounded bg-emerald-950/80 text-emerald-300 border border-emerald-500/40 font-bold shrink-0">
                                Baza
                              </span>
                            ) : (
                              <span className="text-[9px] px-1.5 py-0.2 rounded bg-cyan-950/80 text-cyan-300 border border-cyan-500/40 font-bold shrink-0">
                                AniList
                              </span>
                            )}
                          </div>

                          {item.secondaryTitle && item.secondaryTitle !== item.primaryTitle && (
                            <p className="text-[11px] text-muted-foreground truncate">
                              {item.secondaryTitle}
                            </p>
                          )}

                          <div className="flex items-center gap-2 mt-0.5 text-[10px] text-muted-foreground">
                            <span>Wydawca: <strong className="text-white">{item.publisher || 'Brak'}</strong></span>
                            <span>• Tomy: {item.totalVolumes || 1}</span>
                          </div>
                        </div>

                        <div className="opacity-0 group-hover:opacity-100 text-cyan-400 text-xs font-bold pr-1">
                          Wybierz
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Publisher & Volume Number & Release Date */}
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <Building2 className="h-3.5 w-3.5 text-primary" />
                    Wydawnictwo
                  </Label>
                  <select
                    value={form.publisher}
                    onChange={(e) => setForm({ ...form, publisher: e.target.value })}
                    className="w-full h-10.5 rounded-xl bg-white/5 border border-white/15 text-sm text-white px-3.5 focus:outline-none focus:border-cyan-400 font-medium"
                  >
                    {publishers.length > 0 ? (
                      publishers.map((p) => (
                        <option key={p.id} value={p.name} className="bg-[#090D18]">
                          {p.name}
                        </option>
                      ))
                    ) : (
                      <option value="" disabled className="bg-[#090D18]">
                        Wczytywanie wydawców...
                      </option>
                    )}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Numer tomu</Label>
                  <Input
                    type="number"
                    min="1"
                    value={form.volumeNumber}
                    onChange={(e) => setForm({ ...form, volumeNumber: parseInt(e.target.value, 10) || 1 })}
                    className="bg-white/5 border-white/15 text-sm h-10.5 rounded-xl text-white font-black px-3.5 focus:border-primary"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Data premiery</Label>
                  <Input
                    type="date"
                    value={form.releaseDate}
                    onChange={(e) => setForm({ ...form, releaseDate: e.target.value })}
                    className="bg-white/5 border-white/15 text-sm h-10.5 rounded-xl text-white px-3.5 focus:border-primary"
                    required
                  />
                </div>
              </div>

              {/* Price comparison: Regular Cover Price vs Store Promo Price */}
              <div className="p-3.5 rounded-2xl bg-white/[0.02] border border-white/10 space-y-2.5">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-bold uppercase tracking-wider text-cyan-300 flex items-center gap-1.5">
                    <ShoppingCart className="h-3.5 w-3.5 text-cyan-400" />
                    Cena okładkowa i promocyjna w sklepie
                  </Label>
                  {form.shopPrice && form.pricePLN && form.shopPrice < form.pricePLN && (
                    <span className="inline-flex items-center gap-1 text-[11px] text-rose-400 font-extrabold bg-rose-950/40 px-2.5 py-0.5 rounded-md border border-rose-500/30">
                      🔥 Promocja -{Math.round(((form.pricePLN - form.shopPrice) / form.pricePLN) * 100)}% (Oszczędzasz {(form.pricePLN - form.shopPrice).toFixed(2)} zł)
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-muted-foreground">Cena okładkowa (katalogowa, PLN)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="np. 29.99"
                      value={form.pricePLN}
                      onChange={(e) => setForm({ ...form, pricePLN: parseFloat(e.target.value) || 0 })}
                      className="bg-white/5 border-white/15 text-sm h-10 rounded-xl text-white font-bold px-3.5 focus:border-cyan-400"
                      required
                    />
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-bold text-emerald-400">Cena w sklepie (promocyjna, PLN)</Label>
                      {form.shopPrice !== undefined && (
                        <button
                          type="button"
                          onClick={() => setForm({ ...form, shopPrice: undefined })}
                          className="text-[10px] text-muted-foreground hover:text-rose-400 underline"
                        >
                          Wyczyść
                        </button>
                      )}
                    </div>
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="np. 22.49 (opcjonalnie)"
                      value={form.shopPrice ?? ''}
                      onChange={(e) => setForm({ ...form, shopPrice: e.target.value ? parseFloat(e.target.value) : undefined })}
                      className="bg-emerald-950/20 border-emerald-500/30 text-sm h-10 rounded-xl text-emerald-300 font-black px-3.5 focus:border-emerald-400"
                    />
                  </div>
                </div>
              </div>

              {/* Cover URL Input */}
              <div className="space-y-1.5">
                <Label className="text-xs font-bold uppercase tracking-wider text-cyan-300 flex items-center gap-1.5">
                  <ImageIcon className="h-4 w-4 text-cyan-400" />
                  URL Okładki tomu (Bezpośredni link ze zdjęcia)
                </Label>
                <div className="flex gap-2">
                  <Input
                    placeholder="https://... wklej link do zdjęcia okładki"
                    value={urlInput}
                    onChange={(e) => handleUrlPaste(e.target.value)}
                    className="bg-white/5 border-white/15 text-xs sm:text-sm h-10.5 rounded-xl text-white flex-1 px-3.5 focus:border-primary"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => handleUrlPaste(urlInput)}
                    className="border-white/15 text-xs font-bold h-10.5 px-4 rounded-xl hover:bg-white/10 shrink-0"
                  >
                    Użyj Linku
                  </Button>
                </div>
              </div>

              {/* Primary Shop / Pre-order Link with Auto-Detected Store Logo */}
              <div className="space-y-2 pt-2 border-t border-white/10">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-bold uppercase tracking-wider text-cyan-300 flex items-center gap-1.5">
                    <ShoppingCart className="h-4 w-4 text-cyan-400" />
                    Główny link do sklepu (Pre-order / Kup teraz)
                  </Label>
                  {primaryShopDetected && (
                    <span className="inline-flex items-center gap-1 text-[11px] text-emerald-400 font-bold">
                      <Check className="h-3 w-3" />
                      Wykryto sklep: {primaryShopDetected.name}
                    </span>
                  )}
                </div>

                <div className="flex gap-2 items-center">
                  <div className="relative flex h-10.5 w-10.5 shrink-0 items-center justify-center rounded-xl bg-white/5 border border-white/15 overflow-hidden">
                    {primaryShopDetected?.logo ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={primaryShopDetected.logo}
                        alt={primaryShopDetected.name}
                        className="h-6 w-6 object-contain"
                        referrerPolicy="no-referrer"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none'
                          const fb = e.currentTarget.parentElement?.querySelector('.fallback-icon')
                          if (fb) (fb as HTMLElement).style.display = 'block'
                        }}
                      />
                    ) : (
                      <Store className="h-5 w-5 text-muted-foreground" />
                    )}
                    <Store className="fallback-icon h-5 w-5 text-muted-foreground hidden" />
                  </div>

                  <Input
                    placeholder="np. https://yatta.pl/... lub https://sklep.waneko.pl/..."
                    value={form.shopUrl}
                    onChange={(e) => setForm({ ...form, shopUrl: e.target.value })}
                    className="bg-cyan-950/20 border-cyan-500/30 text-xs sm:text-sm h-10.5 rounded-xl text-cyan-200 px-3.5 focus:border-cyan-400 font-medium flex-1"
                  />
                </div>

                {/* Quick Store Presets Chips */}
                <div className="flex items-center gap-1.5 flex-wrap pt-1">
                  <span className="text-[10px] text-muted-foreground font-semibold">Szybkie sklepy:</span>
                  {PREDEFINED_SHOPS.map((shop) => (
                    <button
                      key={shop.name}
                      type="button"
                      onClick={() => {
                        if (!form.shopUrl) {
                          setForm({ ...form, shopUrl: `https://${shop.domain}` })
                        }
                      }}
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-[10px] text-white/90 font-medium transition-colors"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={shop.logo}
                        alt={shop.name}
                        className="h-3.5 w-3.5 object-contain rounded"
                        referrerPolicy="no-referrer"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none'
                        }}
                      />
                      <span>{shop.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Additional Shop Links for Price Comparison */}
              <div className="space-y-3 pt-3 border-t border-white/10">
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-xs font-bold uppercase tracking-wider text-purple-300 flex items-center gap-1.5">
                      <Store className="h-4 w-4 text-purple-400" />
                      Oferty Sklepów do Porównywarki Cen ({form.shopLinks?.length || 0})
                    </Label>
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      Dodaj linki, logotypy i ceny ze sklepów — pojawią się w zakładce Porównywarka Cen.
                    </p>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={handleAddShopLink}
                    className="border-purple-500/40 text-purple-300 hover:bg-purple-950/40 text-xs font-bold h-8 rounded-xl gap-1"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Dodaj Sklep
                  </Button>
                </div>

                {form.shopLinks && form.shopLinks.length > 0 ? (
                  <div className="space-y-2.5">
                    {form.shopLinks.map((shop, idx) => (
                      <div
                        key={idx}
                        className="p-3 rounded-2xl bg-white/[0.02] border border-white/10 space-y-2.5"
                      >
                        <div className="grid gap-2 sm:grid-cols-12 items-center">
                          {/* Store Name & Preset Selector */}
                          <div className="sm:col-span-4">
                            <select
                              value={shop.name}
                              onChange={(e) => handleUpdateShopLink(idx, 'name', e.target.value)}
                              className="w-full h-9 rounded-xl bg-[#0B0F1A] border border-white/15 text-xs text-white px-2.5 font-bold"
                            >
                              {PREDEFINED_SHOPS.map((preset) => (
                                <option key={preset.name} value={preset.name}>
                                  {preset.name}
                                </option>
                              ))}
                              <option value="Inny sklep">Inny sklep (własny)</option>
                            </select>
                          </div>

                          {/* Price */}
                          <div className="sm:col-span-3">
                            <div className="relative">
                              <Input
                                type="number"
                                step="0.01"
                                placeholder="Cena PLN"
                                value={shop.price ?? ''}
                                onChange={(e) => handleUpdateShopLink(idx, 'price', e.target.value)}
                                className="h-9 text-xs rounded-xl bg-white/5 border-white/15 text-white pr-7 font-bold"
                              />
                              <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground font-bold">
                                zł
                              </span>
                            </div>
                          </div>

                          {/* Logo URL / Preview */}
                          <div className="sm:col-span-4 flex items-center gap-2">
                            <div className="relative flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/10 border border-white/15 overflow-hidden">
                              {shop.logo ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                  src={shop.logo}
                                  alt={shop.name}
                                  className="h-full w-full object-contain p-0.5"
                                  referrerPolicy="no-referrer"
                                  onError={(e) => {
                                    e.currentTarget.style.display = 'none'
                                    const fb = e.currentTarget.parentElement?.querySelector('.fallback-list-icon')
                                    if (fb) (fb as HTMLElement).style.display = 'block'
                                  }}
                                />
                              ) : (
                                <Store className="h-4 w-4 text-muted-foreground" />
                              )}
                              <Store className="fallback-list-icon h-4 w-4 text-muted-foreground hidden" />
                            </div>
                            <Input
                              placeholder="URL Logo"
                              value={shop.logo || ''}
                              onChange={(e) => handleUpdateShopLink(idx, 'logo', e.target.value)}
                              className="h-9 text-[11px] rounded-xl bg-white/5 border-white/15 text-white flex-1"
                            />
                          </div>

                          {/* Delete Button */}
                          <div className="sm:col-span-1 flex justify-end">
                            <Button
                              type="button"
                              size="icon"
                              variant="ghost"
                              onClick={() => handleRemoveShopLink(idx)}
                              className="h-8 w-8 text-rose-400 hover:text-rose-300 hover:bg-rose-950/30 rounded-lg"
                              title="Usuń ofertę"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>

                        {/* URL to product in store */}
                        <div className="flex gap-2 items-center">
                          <Input
                            placeholder="Pełny link do produktu w sklepie (https://...)"
                            value={shop.url}
                            onChange={(e) => handleUpdateShopLink(idx, 'url', e.target.value)}
                            className="h-8 text-xs rounded-xl bg-white/5 border-white/15 text-white flex-1"
                          />
                          {shop.url && (
                            <a
                              href={shop.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-cyan-400 hover:text-cyan-300 text-xs px-2"
                              title="Testuj link"
                            >
                              <ExternalLink className="h-3.5 w-3.5" />
                            </a>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground italic py-1">
                    Brak dodanych ofert sklepów. Kliknij &quot;Dodaj Sklep&quot;, aby dodać ofertę ze sklepu Waneko, Yatta, Gildia itp.
                  </p>
                )}
              </div>

              {/* Priority Checkbox */}
              <div className="pt-2">
                <label className="flex items-center gap-2.5 text-xs sm:text-sm font-bold text-amber-300 cursor-pointer p-3 rounded-xl bg-amber-950/20 border border-amber-500/30">
                  <input
                    type="checkbox"
                    checked={form.ignoreScraper !== false}
                    onChange={(e) => setForm({ ...form, ignoreScraper: e.target.checked })}
                    className="rounded border-white/20 bg-white/5 text-primary focus:ring-primary h-4 w-4"
                  />
                  <ShieldAlert className="h-4.5 w-4.5 text-amber-400 shrink-0" />
                  <span>Wpis priorytetowy (Zastosuj zmiany we wszystkich sekcjach strony)</span>
                </label>
              </div>
            </div>
          </div>

          <div className="space-y-1.5 pt-4 border-t border-white/10">
            <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Opis tomiku / wydania</Label>
            <Textarea
              placeholder="Opis tomu lub uwagi wydawcy..."
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              rows={2}
              className="bg-white/5 border-white/15 text-sm rounded-xl text-white resize-none p-3 focus:border-primary"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3">
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              className="text-xs sm:text-sm text-muted-foreground hover:text-white px-5 rounded-xl"
            >
              Anuluj
            </Button>
            <Button
              type="submit"
              className="bg-gradient-to-r from-primary to-cyan-500 font-extrabold text-xs sm:text-sm h-11 px-7 text-white rounded-xl shadow-lg shadow-primary/25 gap-2"
            >
              <Save className="h-4 w-4" />
              Zapisz Zmiany i Aktualizuj Stronę
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
