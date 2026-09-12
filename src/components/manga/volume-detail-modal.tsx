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
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  BookOpen,
  ShoppingCart,
  CheckCircle2,
  XCircle,
  ExternalLink,
  Star,
  Sparkles,
  Loader2,
  Check,
  Edit2,
  Store,
} from 'lucide-react'
import { CoverEditModal } from '@/components/manga/cover-edit-modal'
import { getCoverUrl } from '@/lib/cover-utils'

export interface VolumeDetailData {
  id?: string
  mangaId: string
  volumeNumber: number
  title: string
  polishTitle?: string | null
  coverUrl: string
  publisher?: string
  polishReleaseDate?: string | null
  isbn?: string | null
  pricePLN?: number | null
  description?: string | null
  status?: string // 'OWNED' | 'READ' | 'WISHLIST' | 'ORDERED' | 'NONE'
  purchasePrice?: number | null
  userRating?: number | null
  notes?: string | null
  shopUrl?: string | null
  shopLinks?: { name: string; url: string; price?: number; logo?: string }[]
}

interface VolumeDetailModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  volumeData: VolumeDetailData | null
  onSave?: (savedData: {
    status: string
    purchasePrice?: number | null
    userRating?: number | null
    notes?: string | null
    coverUrl?: string
  }) => Promise<void> | void
  isAdmin?: boolean
}

interface VolumeShopPrice {
  id: string
  price: number | string
  url: string
  inStock: boolean
  shop: {
    name: string
    logo?: string | null
  }
}

function detectStoreFromUrl(url?: string | null) {
  if (!url) return { name: 'Sklep Wydawcy', logo: null }
  const lower = url.toLowerCase()
  if (lower.includes('yatta.pl')) return { name: 'Yatta.pl', logo: 'https://yatta.pl/favicon.ico' }
  if (lower.includes('waneko.pl')) return { name: 'Sklep Waneko', logo: 'https://sklep.waneko.pl/favicon.ico' }
  if (lower.includes('gildia.pl')) return { name: 'Gildia.pl', logo: 'https://www.gildia.pl/favicon.ico' }
  if (lower.includes('empik.com')) return { name: 'Empik.com', logo: 'https://www.empik.com/favicon.ico' }
  if (lower.includes('mangarden.pl')) return { name: 'Mangarden.pl', logo: 'https://mangarden.pl/favicon.ico' }
  if (lower.includes('sklep-dango.pl') || lower.includes('dango')) return { name: 'Sklep Dango', logo: 'https://sklep-dango.pl/favicon.ico' }
  return { name: 'Sklep Wydawcy', logo: null }
}

export function VolumeDetailModal({
  open,
  onOpenChange,
  volumeData,
  onSave,
  isAdmin = true,
}: VolumeDetailModalProps) {
  const [activeTab, setActiveTab] = useState('status')
  const [status, setStatus] = useState<string>(volumeData?.status || 'OWNED')
  const [purchasePrice, setPurchasePrice] = useState<string>(
    volumeData?.purchasePrice ? String(volumeData.purchasePrice) : ''
  )
  const [userRating, setUserRating] = useState<number>(volumeData?.userRating || 0)
  const [notes, setNotes] = useState(volumeData?.notes || '')
  const [isSaving, setIsSaving] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [currentCover, setCurrentCover] = useState(volumeData?.coverUrl || '')
  const [coverEditOpen, setCoverEditOpen] = useState(false)

  // Prices state
  const [prices, setPrices] = useState<VolumeShopPrice[]>([])
  const [pricesLoading, setPricesLoading] = useState(false)

  const coverPrice = volumeData?.pricePLN ?? 34.99
  const numPurchasePrice = parseFloat(purchasePrice.replace(',', '.'))
  const hasCustomPrice = !isNaN(numPurchasePrice) && numPurchasePrice > 0
  const savings = hasCustomPrice && numPurchasePrice < coverPrice ? coverPrice - numPurchasePrice : 0

  useEffect(() => {
    if (volumeData && open) {
      const timer = setTimeout(() => {
        setStatus(volumeData.status || 'OWNED')
        setPurchasePrice(volumeData.purchasePrice ? String(volumeData.purchasePrice) : '')
        setUserRating(volumeData.userRating || 0)
        setNotes(volumeData.notes || '')
        setCurrentCover(volumeData.coverUrl)
        setSaveSuccess(false)
        setPricesLoading(true)
      }, 0)

      // Fetch prices from /api/volume-prices
      fetch(`/api/volume-prices?volumeId=${volumeData.id || volumeData.mangaId}`)
        .then((res) => (res.ok ? res.json() : Promise.reject(res)))
        .then((data) => {
          const fetchedPrices: VolumeShopPrice[] = data.prices || []

          // Prepend custom shop links if provided by admin/user
          const customLinks: VolumeShopPrice[] = (volumeData.shopLinks || []).map((s, idx) => ({
            id: `custom-link-${idx}`,
            price: s.price || volumeData.pricePLN || 34.99,
            url: s.url,
            inStock: true,
            shop: {
              name: s.name,
              logo: s.logo || detectStoreFromUrl(s.url).logo,
            },
          }))

          if (volumeData.shopUrl && !customLinks.some((c) => c.url === volumeData.shopUrl)) {
            const detected = detectStoreFromUrl(volumeData.shopUrl)
            customLinks.unshift({
              id: 'custom-shop-main',
              price: volumeData.pricePLN || 34.99,
              url: volumeData.shopUrl,
              inStock: true,
              shop: {
                name: detected.name,
                logo: detected.logo,
              },
            })
          }

          // Combine with deduplication
          const combined = [...customLinks]
          fetchedPrices.forEach((fp) => {
            if (!combined.some((c) => c.shop.name.toLowerCase() === fp.shop.name.toLowerCase() || c.url === fp.url)) {
              combined.push(fp)
            }
          })

          setPrices(combined)
        })
        .catch(() => {
          const customLinks: VolumeShopPrice[] = (volumeData.shopLinks || []).map((s, idx) => ({
            id: `custom-link-${idx}`,
            price: s.price || volumeData.pricePLN || 34.99,
            url: s.url,
            inStock: true,
            shop: {
              name: s.name,
              logo: s.logo || detectStoreFromUrl(s.url).logo,
            },
          }))
          if (volumeData.shopUrl && !customLinks.some((c) => c.url === volumeData.shopUrl)) {
            const detected = detectStoreFromUrl(volumeData.shopUrl)
            customLinks.unshift({
              id: 'custom-shop-main',
              price: volumeData.pricePLN || 34.99,
              url: volumeData.shopUrl,
              inStock: true,
              shop: {
                name: detected.name,
                logo: detected.logo,
              },
            })
          }
          setPrices(customLinks)
        })
        .finally(() => {
          setPricesLoading(false)
        })

      return () => clearTimeout(timer)
    }
  }, [volumeData, open])

  if (!volumeData) return null

  const handleConfirmSave = async () => {
    setIsSaving(true)
    try {
      if (onSave) {
        await onSave({
          status,
          purchasePrice: purchasePrice ? parseFloat(purchasePrice) : null,
          userRating: userRating || null,
          notes: notes || null,
        })
      }
      setSaveSuccess(true)
      setTimeout(() => {
        setIsSaving(false)
        onOpenChange(false)
      }, 700)
    } catch (error) {
      console.error('Error saving volume:', error)
      setIsSaving(false)
    }
  }

  const regularPrice = volumeData.pricePLN || 34.99
  const lowestPrice = prices.length > 0 ? Math.min(...prices.map((p) => Number(p.price))) : regularPrice
  const effectiveShopUrl = volumeData.shopUrl || volumeData.shopLinks?.[0]?.url || null
  const detectedShop = detectStoreFromUrl(effectiveShopUrl)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl bg-[#0B0F1A]/95 border-white/15 text-white backdrop-blur-2xl shadow-2xl rounded-3xl p-0 overflow-hidden sm:max-w-2xl">
        {/* Header with Title & Badges & Ambient Glow */}
        <div className="relative p-6 pb-3 border-b border-white/10 bg-gradient-to-r from-purple-950/30 via-transparent to-cyan-950/20 overflow-hidden">
          {/* Ambient Glow Backdrop */}
          <div className="absolute inset-0 -z-10 pointer-events-none overflow-hidden opacity-25">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={getCoverUrl(currentCover || volumeData.coverUrl)}
              alt=""
              aria-hidden="true"
              className="w-full h-full object-cover blur-3xl scale-150"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#0B0F1A] via-transparent to-[#0B0F1A]/80" />
          </div>
          <DialogHeader>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-cyan-500/30 bg-cyan-500/10 px-3 py-0.5 text-[11px] font-bold text-cyan-300">
                <Sparkles className="h-3 w-3" />
                Pływające Okno Tomu
              </span>
            </div>
            <DialogTitle className="text-xl sm:text-2xl font-extrabold text-white mt-1">
              {volumeData.title} — Tom {volumeData.volumeNumber}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground flex items-center gap-2 flex-wrap mt-0.5">
              <span>Wydawca: <strong className="text-white">{volumeData.publisher || 'Waneko'}</strong></span>
              {volumeData.isbn && <span>• ISBN: {volumeData.isbn}</span>}
              <span>• Cena katalogowa: <strong className="text-emerald-400">{regularPrice.toFixed(2)} zł</strong></span>
            </DialogDescription>
          </DialogHeader>

          {/* Navigation Tabs in Polish */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-4">
            <TabsList className="bg-white/5 border border-white/10 p-1 rounded-xl h-auto">
              <TabsTrigger
                value="status"
                className="text-xs py-1.5 px-4 rounded-lg data-[state=active]:bg-primary data-[state=active]:text-white font-bold"
              >
                <BookOpen className="h-3.5 w-3.5 mr-1.5" />
                Mój Stan & Edycja
              </TabsTrigger>
              <TabsTrigger
                value="prices"
                className="text-xs py-1.5 px-4 rounded-lg data-[state=active]:bg-primary data-[state=active]:text-white font-bold"
              >
                <ShoppingCart className="h-3.5 w-3.5 mr-1.5" />
                Porównywarka Cen ({prices.length})
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* Modal Body */}
        <div className="p-6 max-h-[65vh] overflow-y-auto space-y-6">
          {activeTab === 'status' && (
            <div className="space-y-6">
              {/* Pre-order / Buy in Store Banner if shop link exists */}
              {effectiveShopUrl && (
                <div className="p-3.5 rounded-2xl bg-gradient-to-r from-cyan-950/40 via-purple-950/30 to-white/[0.02] border border-cyan-500/30 flex items-center justify-between gap-3 shadow-lg">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/10 border border-white/15 overflow-hidden p-1 shadow-sm">
                      {detectedShop.logo ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={detectedShop.logo}
                          alt={detectedShop.name}
                          className="h-full w-full object-contain"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <Store className="h-4 w-4 text-cyan-300" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-extrabold text-white truncate flex items-center gap-1.5">
                        <span>Oferta w sklepie: {detectedShop.name}</span>
                      </div>
                      <div className="text-[10px] text-cyan-300 font-medium truncate">
                        Kliknij, aby przejść bezpośrednio do pre-orderu lub zakupu
                      </div>
                    </div>
                  </div>

                  <a
                    href={effectiveShopUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="shrink-0"
                  >
                    <Button
                      size="sm"
                      className="h-8 px-3.5 text-xs font-bold bg-gradient-to-r from-cyan-500 to-primary text-white shadow-md shadow-cyan-500/25 gap-1.5 rounded-xl"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                      Kup w Sklepie
                    </Button>
                  </a>
                </div>
              )}

              {/* Cover + Info Row */}
              <div className="flex flex-col sm:flex-row gap-5 items-start">
                <div className="relative mx-auto sm:mx-0 group shrink-0">
                  {/* Atmospheric Glow behind cover */}
                  <div className="absolute -inset-2 -z-10 rounded-2xl bg-gradient-to-tr from-cyan-500/30 via-purple-500/30 to-primary/25 blur-xl opacity-75 group-hover:opacity-100 transition-opacity" />
                  <div className="relative aspect-[2/3] w-32 overflow-hidden rounded-xl border border-primary/50 bg-black shadow-lg shadow-primary/20 ring-1 ring-primary/40">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={currentCover || volumeData.coverUrl}
                      alt={volumeData.title}
                      className="h-full w-full object-cover"
                    />
                    <div className="absolute top-1.5 right-1.5 rounded bg-black/80 px-1.5 py-0.5 text-[9px] font-bold text-cyan-300">
                      T.{volumeData.volumeNumber}
                    </div>

                    {/* Admin Pencil Overlay */}
                    {isAdmin && (
                      <button
                        type="button"
                        onClick={() => setCoverEditOpen(true)}
                        className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-white gap-1 text-[10px] font-bold"
                        title="Zmień lub wykadruj okładkę tomu"
                      >
                        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-white shadow-md">
                          <Edit2 className="h-3.5 w-3.5" />
                        </div>
                        <span>Zmień</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Cover Edit Modal */}
                <CoverEditModal
                  open={coverEditOpen}
                  onOpenChange={setCoverEditOpen}
                  currentCoverUrl={currentCover || volumeData.coverUrl}
                  title={volumeData.title}
                  volumeNumber={volumeData.volumeNumber}
                  publisher={volumeData.publisher || 'Waneko'}
                  onCoverUpdated={(newUrl) => {
                    setCurrentCover(newUrl)
                  }}
                />

                <div className="flex-1 space-y-3 w-full">
                  <div>
                    <Label className="text-xs font-bold text-muted-foreground uppercase">Status w mojej kolekcji</Label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-1.5">
                      {[
                        { val: 'OWNED', label: 'Posiadane', color: 'border-emerald-500/50 bg-emerald-500/10 text-emerald-300' },
                        { val: 'READ', label: 'Przeczytane', color: 'border-purple-500/50 bg-purple-500/10 text-purple-300' },
                        { val: 'WISHLIST', label: 'Chcę kupić', color: 'border-pink-500/50 bg-pink-500/10 text-pink-300' },
                        { val: 'ORDERED', label: 'Zamówione', color: 'border-cyan-500/50 bg-cyan-500/10 text-cyan-300' },
                      ].map((item) => (
                        <button
                          key={item.val}
                          type="button"
                          onClick={() => setStatus(item.val)}
                          className={`p-2 rounded-xl text-xs font-bold border transition-all text-center ${
                            status === item.val
                              ? `${item.color} ring-2 ring-primary shadow-md scale-105`
                              : 'border-white/10 bg-white/5 text-muted-foreground hover:text-white'
                          }`}
                        >
                          {item.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Purchase Price & Cover Price */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                    <div>
                      <div className="flex items-center justify-between">
                        <Label htmlFor="price-input" className="text-xs font-bold text-muted-foreground">
                          Cena zakupu (PLN)
                        </Label>
                        <button
                          type="button"
                          onClick={() => setPurchasePrice(coverPrice.toFixed(2))}
                          className="text-[10px] text-cyan-400 hover:text-cyan-300 underline"
                        >
                          Okładkowa: {coverPrice.toFixed(2)} zł
                        </button>
                      </div>
                      <div className="relative mt-1">
                        <Input
                          id="price-input"
                          type="number"
                          step="0.01"
                          placeholder={`np. ${coverPrice.toFixed(2)}`}
                          value={purchasePrice}
                          onChange={(e) => setPurchasePrice(e.target.value)}
                          className="bg-white/5 border-white/15 text-white pr-10 text-xs h-9 rounded-xl font-bold"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground font-bold">
                          zł
                        </span>
                      </div>
                      {savings > 0 && (
                        <p className="text-[10px] text-emerald-400 font-bold mt-1">
                          🎉 Zaoszczędzono: {savings.toFixed(2)} zł
                        </p>
                      )}
                    </div>

                    {/* Rating Stars */}
                    <div>
                      <Label className="text-xs font-bold text-muted-foreground">Twoja ocena tomu</Label>
                      <div className="flex items-center gap-1 mt-2">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <button
                            key={star}
                            type="button"
                            onClick={() => setUserRating(star * 2)}
                            className="text-muted-foreground hover:text-amber-400 transition-colors"
                          >
                            <Star
                              className={`h-5 w-5 ${
                                userRating >= star * 2
                                  ? 'fill-amber-400 text-amber-400'
                                  : 'text-muted-foreground/40'
                              }`}
                            />
                          </button>
                        ))}
                        <span className="text-xs font-bold text-amber-400 ml-2">
                          {userRating > 0 ? `${userRating}/10` : 'Brak'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Description */}
              <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 space-y-1.5">
                <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Opis tomu</h4>
                <p className="text-xs text-white/90 leading-relaxed">
                  {volumeData.description || 'Brak opisu dla tego tomu.'}
                </p>
              </div>
            </div>
          )}

          {activeTab === 'prices' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 rounded-2xl bg-gradient-to-r from-emerald-500/15 via-cyan-500/10 to-transparent border border-emerald-500/30">
                <div>
                  <span className="text-[11px] text-muted-foreground font-medium">Najniższa cena w sieci</span>
                  <div className="text-xl font-black text-emerald-400">
                    {lowestPrice.toFixed(2)} PLN
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-[11px] text-muted-foreground font-medium">Cena okładkowa</span>
                  <div className="text-sm font-bold text-white line-through opacity-70">
                    {regularPrice.toFixed(2)} PLN
                  </div>
                </div>
              </div>

              {pricesLoading ? (
                <div className="flex items-center justify-center py-10 gap-2">
                  <Loader2 className="h-5 w-5 animate-spin text-primary" />
                  <span className="text-xs text-muted-foreground">Pobieranie ofert ze sklepów...</span>
                </div>
              ) : prices.length > 0 ? (
                <div className="space-y-2.5">
                  {prices.map((p) => (
                    <div
                      key={p.id}
                      className="flex items-center justify-between p-3 rounded-xl bg-white/[0.03] border border-white/10 hover:border-primary/50 transition-all"
                    >
                      <div className="flex items-center gap-3">
                        <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/10 border border-white/15 overflow-hidden p-1 shadow-sm">
                          {p.shop.logo ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={p.shop.logo}
                              alt={p.shop.name}
                              className="h-full w-full object-contain"
                              referrerPolicy="no-referrer"
                              onError={(e) => {
                                ;(e.target as HTMLImageElement).style.display = 'none'
                                const next = (e.target as HTMLElement).nextElementSibling as HTMLElement
                                if (next) next.style.display = 'flex'
                              }}
                            />
                          ) : null}
                          <span
                            className="text-xs font-black text-cyan-300"
                            style={{ display: p.shop.logo ? 'none' : 'flex' }}
                          >
                            {p.shop.name.slice(0, 3).toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <h4 className="font-bold text-xs text-white flex items-center gap-1.5">
                            <span>{p.shop.name}</span>
                          </h4>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            {p.inStock ? (
                              <span className="flex items-center gap-1 text-[10px] text-emerald-400 font-semibold">
                                <CheckCircle2 className="h-3 w-3" />
                                Dostępny / Pre-order
                              </span>
                            ) : (
                              <span className="flex items-center gap-1 text-[10px] text-rose-400 font-semibold">
                                <XCircle className="h-3 w-3" />
                                Brak
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <span className="text-sm font-extrabold text-white">
                          {Number(p.price).toFixed(2)} PLN
                        </span>
                        <a
                          href={p.url}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <Button size="sm" className="h-7 px-3 text-[11px] font-bold bg-primary hover:bg-primary/80 text-white rounded-lg">
                            <ExternalLink className="h-3 w-3 mr-1" />
                            Kup
                          </Button>
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-8 text-center text-xs text-muted-foreground">
                  Brak dostępnych ofert dla tego tomu.
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer with Confirm / Save */}
        <div className="p-4 border-t border-white/10 bg-[#090D16] flex items-center justify-between gap-3">
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            className="text-xs text-muted-foreground hover:text-white"
          >
            Anuluj
          </Button>

          <Button
            onClick={handleConfirmSave}
            disabled={isSaving}
            className="text-xs font-bold px-6 bg-gradient-to-r from-primary to-cyan-500 shadow-lg shadow-primary/30 text-white min-w-[140px]"
          >
            {isSaving ? (
              <>
                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                Zapisywanie...
              </>
            ) : saveSuccess ? (
              <>
                <Check className="mr-1.5 h-3.5 w-3.5 text-emerald-300" />
                Zapisano!
              </>
            ) : (
              'Zapisz i Potwierdź'
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
