'use client'

import { useState, useEffect, useCallback } from 'react'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import {
  ShoppingBag,
  ExternalLink,
  Plus,
  Trash2,
  Sparkles,
  Loader2,
  Check,
  AlertCircle,
  Globe,
} from 'lucide-react'

interface ShopItem {
  id: string
  name: string
  url: string
  country: string
  logo?: string | null
  isActive: boolean
}

interface VolumePriceItem {
  id: string
  volumeId: string
  shopId: string
  price: number
  url: string
  currency: string
  inStock: boolean
  scrapedAt: string
  shop: {
    id: string
    name: string
    url: string
    country: string
    logo?: string | null
  }
}

interface VolumeShopPricesModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  mangaId: string
  mangaTitle: string
  volumeNumber: number
  onPricesUpdated?: () => void
}

export function VolumeShopPricesModal({
  open,
  onOpenChange,
  mangaId,
  mangaTitle,
  volumeNumber,
  onPricesUpdated,
}: VolumeShopPricesModalProps) {
  const [shops, setShops] = useState<ShopItem[]>([])
  const [prices, setPrices] = useState<VolumePriceItem[]>([])
  const [loading, setLoading] = useState(true)

  // Add form state
  const [selectedShopId, setSelectedShopId] = useState<string>('')
  const [productUrl, setProductUrl] = useState<string>('')
  const [priceInput, setPriceInput] = useState<string>('')
  const [inStock, setInStock] = useState<boolean>(true)

  const [isScraping, setIsScraping] = useState(false)
  const [scrapeMessage, setScrapeMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  // Fetch shops & existing prices when modal opens
  const loadData = useCallback(async () => {
    if (!open || !mangaId || !volumeNumber) return
    setLoading(true)
    setErrorMessage(null)
    setScrapeMessage(null)

    try {
      const [shopsRes, pricesRes] = await Promise.all([
        fetch('/api/shops'),
        fetch(`/api/volume-prices?mangaId=${encodeURIComponent(mangaId)}&volumeNumber=${volumeNumber}`),
      ])

      if (shopsRes.ok) {
        const shopsData = await shopsRes.json()
        const activeShops = (shopsData.shops || []).filter((s: ShopItem) => s.isActive)
        setShops(activeShops)
        if (activeShops.length > 0 && !selectedShopId) {
          setSelectedShopId(activeShops[0].id)
        }
      }

      if (pricesRes.ok) {
        const pricesData = await pricesRes.json()
        setPrices(pricesData.prices || [])
      }
    } catch (err) {
      console.error('Błąd wczytywania cen tomów:', err)
    } finally {
      setLoading(false)
    }
  }, [open, mangaId, volumeNumber, selectedShopId])

  useEffect(() => {
    loadData()
  }, [loadData])

  // Automatic shop detection when user pastes URL
  const handleUrlChange = (val: string) => {
    setProductUrl(val)
    const lower = val.toLowerCase()

    const matchedShop = shops.find((s) => {
      const shopDomain = s.url.replace(/^https?:\/\/(www\.)?/, '').split('/')[0].toLowerCase()
      return lower.includes(shopDomain)
    })

    if (matchedShop) {
      setSelectedShopId(matchedShop.id)
    }
  }

  // Scrape price from the given product URL
  const handleScrapePrice = async () => {
    if (!productUrl.trim()) {
      setScrapeMessage({ type: 'error', text: 'Wklej link do produktu w sklepie' })
      return
    }

    setIsScraping(true)
    setScrapeMessage(null)

    try {
      const res = await fetch('/api/volume-prices/scrape', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: productUrl.trim() }),
      })

      const data = await res.json()

      if (res.ok && data.success && typeof data.price === 'number') {
        setPriceInput(data.price.toFixed(2))
        setInStock(data.inStock !== false)
        setScrapeMessage({
          type: 'success',
          text: `Odczytano cenę ze sklepu: ${data.price.toFixed(2)} PLN ${data.inStock === false ? '(brak w magazynie)' : ''}`,
        })
      } else {
        setScrapeMessage({
          type: 'error',
          text: data.error || 'Nie udało się automatycznie zaciągnąć ceny. Wpisz ją ręcznie poniżej.',
        })
      }
    } catch {
      setScrapeMessage({ type: 'error', text: 'Błąd połączenia z serwerem podczas odczytu ceny' })
    } finally {
      setIsScraping(false)
    }
  }

  // Save new volume price
  const handleSavePrice = async () => {
    if (!selectedShopId) {
      setErrorMessage('Wybierz sklep z listy')
      return
    }
    if (!productUrl.trim()) {
      setErrorMessage('Wklej link do oferty w sklepie')
      return
    }
    const numPrice = parseFloat(priceInput.replace(',', '.'))
    if (isNaN(numPrice) || numPrice < 0) {
      setErrorMessage('Wpisz poprawną kwotę w PLN')
      return
    }

    setIsSaving(true)
    setErrorMessage(null)

    try {
      const res = await fetch('/api/volume-prices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mangaId,
          volumeNumber,
          shopId: selectedShopId,
          url: productUrl.trim(),
          price: numPrice,
          inStock,
        }),
      })

      const data = await res.json()
      if (!res.ok || !data.success) {
        setErrorMessage(data.error || 'Błąd zapisu oferty')
        return
      }

      // Reset form
      setProductUrl('')
      setPriceInput('')
      setScrapeMessage(null)

      // Reload prices list and notify parent
      await loadData()
      onPricesUpdated?.()
    } catch {
      setErrorMessage('Błąd zapisu oferty sklepu')
    } finally {
      setIsSaving(false)
    }
  }

  // Delete an existing price offer
  const handleDeletePrice = async (priceId: string) => {
    try {
      const res = await fetch(`/api/volume-prices?id=${priceId}`, {
        method: 'DELETE',
      })

      if (res.ok) {
        setPrices((prev) => prev.filter((p) => p.id !== priceId))
        onPricesUpdated?.()
      } else {
        alert('Błąd podczas usuwania oferty')
      }
    } catch {
      alert('Błąd połączenia z serwerem')
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-[#0C101D] border-white/15 text-white max-w-3xl sm:max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="border-b border-white/10 pb-3">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
              <ShoppingBag className="h-4 w-4" />
            </div>
            <div>
              <DialogTitle className="text-base font-black text-white">
                Linki do Sklepów i Porównywarka Cen
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                {mangaTitle} • <strong className="text-cyan-300">Tom {volumeNumber}</strong>
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-12 gap-2">
            <Loader2 className="h-7 w-7 animate-spin text-cyan-400" />
            <span className="text-xs text-muted-foreground">Wczytywanie ofert sklepów...</span>
          </div>
        ) : (
          <div className="space-y-5 py-2">
            {/* Existing Prices List */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                  Podpięte Oferty Sklepów ({prices.length})
                </span>
                <span className="text-[10px] text-muted-foreground">
                  Widoczne w porównywarce i kalendarzu
                </span>
              </div>

              {prices.length === 0 ? (
                <div className="p-4 rounded-xl border border-dashed border-white/15 text-center text-xs text-muted-foreground bg-white/[0.01]">
                  Brak przypisanych linków do sklepów dla tego tomu. Dodaj pierwszy sklep poniżej!
                </div>
              ) : (
                <div className="space-y-2">
                  {prices.map((pr) => (
                    <div
                      key={pr.id}
                      className="flex items-center justify-between p-3 rounded-xl bg-white/[0.03] border border-white/10 hover:border-white/20 transition-all gap-3"
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div className="h-8 w-8 rounded-lg bg-black/40 border border-white/10 overflow-hidden flex items-center justify-center shrink-0">
                          {pr.shop?.logo ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={pr.shop.logo}
                              alt={pr.shop.name}
                              className="h-full w-full object-contain p-0.5"
                              onError={(e) => {
                                ;(e.target as HTMLElement).style.display = 'none'
                              }}
                            />
                          ) : (
                            <Globe className="h-4 w-4 text-cyan-400" />
                          )}
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-extrabold text-white truncate">
                              {pr.shop?.name || 'Sklep'}
                            </span>
                            {pr.inStock ? (
                              <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30 text-[9px] px-1.5 py-0">
                                Dostępny
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-rose-400 border-rose-500/30 text-[9px] px-1.5 py-0">
                                Brak
                              </Badge>
                            )}
                          </div>
                          <a
                            href={pr.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[11px] text-cyan-400 hover:underline truncate inline-flex items-center gap-1 font-medium max-w-[280px]"
                          >
                            <span className="truncate">{pr.url}</span>
                            <ExternalLink className="h-2.5 w-2.5 shrink-0" />
                          </a>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 shrink-0">
                        <div className="text-right">
                          <span className="text-sm font-black text-emerald-400">
                            {pr.price.toFixed(2)} PLN
                          </span>
                        </div>

                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeletePrice(pr.id)}
                          className="h-7 w-7 text-muted-foreground hover:text-rose-400 hover:bg-rose-950/40 rounded-lg"
                          title="Usuń ofertę tego sklepu"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Add New Offer Form */}
            <div className="p-4 rounded-2xl bg-white/[0.02] border border-cyan-500/20 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-cyan-300 flex items-center gap-1.5">
                  <Plus className="h-3.5 w-3.5" />
                  Dodaj Link do Sklepu dla Tomu {volumeNumber}
                </span>
                <span className="text-[10px] text-muted-foreground">Scraper zaciągnie aktualną cenę</span>
              </div>

              {errorMessage && (
                <div className="p-2.5 rounded-xl bg-rose-950/60 border border-rose-500/40 text-xs text-rose-300 font-semibold flex items-center gap-2">
                  <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}

              <div className="grid gap-3 sm:grid-cols-3">
                <div className="space-y-1 sm:col-span-1">
                  <Label className="text-[11px] font-bold text-muted-foreground">Wybierz Sklep</Label>
                  <Select value={selectedShopId} onValueChange={(val: string | null) => setSelectedShopId(val || '')}>
                    <SelectTrigger className="bg-white/5 border-white/10 text-xs h-9 rounded-xl text-white">
                      <SelectValue placeholder="Wybierz sklep" />
                    </SelectTrigger>
                    <SelectContent className="bg-[#0D121F] border-white/15 text-white text-xs">
                      {shops.map((shop) => (
                        <SelectItem key={shop.id} value={shop.id}>
                          <div className="flex items-center gap-2">
                            {shop.logo && (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={shop.logo} alt="" className="h-3.5 w-3.5 object-contain" />
                            )}
                            <span>{shop.name}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1 sm:col-span-2">
                  <Label className="text-[11px] font-bold text-muted-foreground">
                    Link do produktu w sklepie
                  </Label>
                  <div className="flex items-center gap-1.5">
                    <Input
                      type="url"
                      placeholder="https://yatta.pl/... lub https://www.gildia.pl/..."
                      value={productUrl}
                      onChange={(e) => handleUrlChange(e.target.value)}
                      className="bg-white/5 border-white/10 text-xs h-9 rounded-xl text-white flex-1"
                    />
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={handleScrapePrice}
                      disabled={isScraping || !productUrl.trim()}
                      className="h-9 px-3 text-xs font-bold rounded-xl gap-1.5 bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 hover:bg-cyan-500/30 shrink-0"
                    >
                      {isScraping ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Sparkles className="h-3.5 w-3.5" />
                      )}
                      {isScraping ? 'Pobieram...' : 'Pobierz cenę'}
                    </Button>
                  </div>
                </div>
              </div>

              {scrapeMessage && (
                <div
                  className={`p-2.5 rounded-xl border text-xs font-semibold flex items-center gap-2 ${
                    scrapeMessage.type === 'success'
                      ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-300'
                      : 'bg-amber-950/60 border-amber-500/40 text-amber-300'
                  }`}
                >
                  {scrapeMessage.type === 'success' ? (
                    <Check className="h-3.5 w-3.5 shrink-0" />
                  ) : (
                    <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                  )}
                  <span>{scrapeMessage.text}</span>
                </div>
              )}

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
                <div className="flex items-center gap-3">
                  <div className="space-y-1">
                    <Label className="text-[11px] font-bold text-muted-foreground">Cena w PLN</Label>
                    <div className="flex items-center gap-1.5">
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="np. 29.99"
                        value={priceInput}
                        onChange={(e) => setPriceInput(e.target.value)}
                        className="bg-white/5 border-white/10 text-xs h-9 w-28 rounded-xl text-emerald-400 font-extrabold"
                      />
                      <span className="text-xs text-muted-foreground font-bold">PLN</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-4">
                    <label className="flex items-center gap-1.5 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={inStock}
                        onChange={(e) => setInStock(e.target.checked)}
                        className="h-3.5 w-3.5 rounded border-white/20 bg-white/5 text-cyan-500"
                      />
                      <span className="text-[11px] text-muted-foreground font-bold">W magazynie</span>
                    </label>
                  </div>
                </div>

                <Button
                  type="button"
                  onClick={handleSavePrice}
                  disabled={isSaving || !productUrl.trim() || !priceInput.trim()}
                  className="bg-gradient-to-r from-primary to-cyan-500 hover:from-primary/90 text-white font-extrabold text-xs h-9 px-4 rounded-xl gap-1.5 shadow-md self-end sm:self-auto disabled:opacity-50"
                >
                  {isSaving ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Plus className="h-3.5 w-3.5" />
                  )}
                  Zapisz Ofertę Sklepu
                </Button>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
