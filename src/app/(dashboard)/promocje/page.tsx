'use client'

import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import {
  Tag,
  ExternalLink,
  Sparkles,
  Search,
  Loader2,
  TrendingDown,
  ShoppingBag,
  Percent,
  SlidersHorizontal,
} from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { getCoverUrl } from '@/lib/cover-utils'

interface DealItem {
  id: string
  volumeId: string
  mangaId: string
  title: string
  originalTitle?: string
  volumeNumber: number
  coverUrl: string
  publisher: string
  shop: {
    id: string
    name: string
    url: string
    logo?: string | null
  }
  currentPrice: number
  coverPrice: number
  discountAmount: number
  discountPercent: number
  url: string
  inStock: boolean
  updatedAt: string
}

export default function PromotionsPage() {
  const [deals, setDeals] = useState<DealItem[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedShopId, setSelectedShopId] = useState<string>('ALL')
  const [sortBy, setSortBy] = useState<'discount' | 'priceAsc' | 'priceDesc'>('discount')

  useEffect(() => {
    let isMounted = true
    setLoading(true)

    fetch('/api/deals')
      .then((res) => (res.ok ? res.json() : Promise.reject(res)))
      .then((data) => {
        if (isMounted && data.deals) {
          setDeals(data.deals)
        }
      })
      .catch((err) => {
        console.warn('Error fetching deals:', err)
      })
      .finally(() => {
        if (isMounted) setLoading(false)
      })

    return () => {
      isMounted = false
    }
  }, [])

  // Unique shops for filter pills
  const availableShops = useMemo(() => {
    const map = new Map<string, { id: string; name: string; logo?: string | null }>()
    deals.forEach((d) => {
      if (d.shop && !map.has(d.shop.id)) {
        map.set(d.shop.id, d.shop)
      }
    })
    return Array.from(map.values())
  }, [deals])

  // Filtered and sorted deals
  const filteredDeals = useMemo(() => {
    return deals
      .filter((d) => {
        if (selectedShopId !== 'ALL' && d.shop?.id !== selectedShopId) {
          return false
        }
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase().trim()
          const matchesTitle = d.title.toLowerCase().includes(q)
          const matchesOriginal = d.originalTitle?.toLowerCase().includes(q)
          const matchesShop = d.shop?.name.toLowerCase().includes(q)
          if (!matchesTitle && !matchesOriginal && !matchesShop) return false
        }
        return true
      })
      .sort((a, b) => {
        if (sortBy === 'discount') {
          return b.discountPercent - a.discountPercent || b.discountAmount - a.discountAmount
        }
        if (sortBy === 'priceAsc') {
          return a.currentPrice - b.currentPrice
        }
        return b.currentPrice - a.currentPrice
      })
  }, [deals, selectedShopId, searchQuery, sortBy])

  // Max discount stat
  const maxDiscount = useMemo(() => {
    if (deals.length === 0) return 0
    return Math.max(...deals.map((d) => d.discountPercent))
  }, [deals])

  return (
    <div className="space-y-6 animate-in fade-in duration-300 pb-16">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-r from-[#0C101D] via-[#101426] to-[#0A0D1A] p-6 sm:p-8 shadow-2xl">
        <div className="absolute -right-12 -top-12 h-44 w-44 rounded-full bg-emerald-500/10 blur-3xl pointer-events-none" />
        <div className="absolute -left-12 -bottom-12 h-44 w-44 rounded-full bg-cyan-500/10 blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/40 bg-emerald-500/10 px-3 py-0.5 text-[11px] font-bold text-emerald-300">
              <Tag className="h-3.5 w-3.5 text-emerald-400" />
              <span>Łowca Okazji • Porównywarka Cen Księgarń</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              Promocje i Najniższe Ceny Tomów
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground max-w-xl">
              Śledź aktualne obniżki i promocje w polskich sklepach z mangą. Kupuj tomy taniej niż cena okładkowa.
            </p>
          </div>

          {/* Quick stats cards */}
          <div className="flex items-center gap-3 self-start md:self-auto">
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-2.5 text-center min-w-[100px]">
              <span className="text-[10px] uppercase font-bold text-muted-foreground block">Aktywne Oferty</span>
              <span className="text-xl font-black text-white">{deals.length}</span>
            </div>

            {maxDiscount > 0 && (
              <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-2.5 text-center min-w-[100px]">
                <span className="text-[10px] uppercase font-bold text-emerald-300 block">Rabat do</span>
                <span className="text-xl font-black text-emerald-400">-{maxDiscount}%</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-white/[0.02] border border-white/10 p-3 rounded-2xl">
        {/* Search input */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Szukaj tytułu mangi lub wydawcy..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="bg-white/5 border-white/10 text-xs h-9 pl-9 rounded-xl text-white placeholder:text-muted-foreground"
          />
        </div>

        {/* Sort & Shop Pills */}
        <div className="flex items-center gap-2 overflow-x-auto scrollbar-none pb-1 md:pb-0">
          <div className="flex items-center gap-1 bg-white/5 p-1 rounded-xl border border-white/10 shrink-0">
            <button
              type="button"
              onClick={() => setSelectedShopId('ALL')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                selectedShopId === 'ALL'
                  ? 'bg-cyan-500 text-black shadow-md'
                  : 'text-muted-foreground hover:text-white'
              }`}
            >
              Wszystkie Sklepy
            </button>
            {availableShops.map((shop) => (
              <button
                key={shop.id}
                type="button"
                onClick={() => setSelectedShopId(shop.id)}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
                  selectedShopId === shop.id
                    ? 'bg-cyan-500 text-black shadow-md'
                    : 'text-muted-foreground hover:text-white'
                }`}
              >
                {shop.logo && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={shop.logo} alt="" className="h-3 w-3 object-contain" />
                )}
                <span>{shop.name}</span>
              </button>
            ))}
          </div>

          <div className="flex items-center gap-1 bg-white/5 p-1 rounded-xl border border-white/10 shrink-0">
            <button
              type="button"
              onClick={() => setSortBy('discount')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                sortBy === 'discount' ? 'bg-primary text-white' : 'text-muted-foreground hover:text-white'
              }`}
            >
              % Rabatu
            </button>
            <button
              type="button"
              onClick={() => setSortBy('priceAsc')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                sortBy === 'priceAsc' ? 'bg-primary text-white' : 'text-muted-foreground hover:text-white'
              }`}
            >
              Najtańsze
            </button>
          </div>
        </div>
      </div>

      {/* Main Deals Grid */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-2">
          <Loader2 className="h-8 w-8 animate-spin text-cyan-400" />
          <span className="text-xs text-muted-foreground">Wyszukiwanie najlepszych promocji...</span>
        </div>
      ) : filteredDeals.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-white/15 p-12 text-center space-y-3">
          <ShoppingBag className="h-10 w-10 text-muted-foreground mx-auto" />
          <h3 className="text-base font-bold text-white">Brak promocji spełniających kryteria</h3>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto">
            {deals.length === 0
              ? 'W panelu administratora dodaj linki i ceny ze sklepów do poszczególnych tomów, a pojawią się one tutaj automatycznie.'
              : 'Spróbuj zmienić filtr sklepu lub frazę wyszukiwania.'}
          </p>
          {searchQuery && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSearchQuery('')}
              className="text-xs font-bold rounded-xl"
            >
              Wyczyść wyszukiwanie
            </Button>
          )}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {filteredDeals.map((deal) => (
            <div
              key={deal.id}
              className="group relative flex flex-col justify-between rounded-2xl border border-white/10 bg-[#0C101D]/90 p-3.5 hover:border-emerald-500/40 hover:shadow-xl hover:shadow-emerald-500/10 transition-all duration-300"
            >
              {/* Top: Cover & Discount Pill */}
              <div className="relative aspect-[2/3] w-full overflow-hidden rounded-xl border border-white/10 bg-black/60 mb-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={getCoverUrl(deal.coverUrl)}
                  alt={deal.title}
                  className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                />

                {/* Discount Badge */}
                {deal.discountPercent > 0 && (
                  <div className="absolute top-2 left-2 flex items-center gap-1 rounded-full bg-emerald-500 px-2 py-0.5 text-xs font-black text-black shadow-lg shadow-emerald-500/40">
                    <TrendingDown className="h-3 w-3" />
                    <span>-{deal.discountPercent}%</span>
                  </div>
                )}

                {/* Volume Badge */}
                <div className="absolute bottom-2 right-2 rounded-lg bg-black/80 backdrop-blur-md px-2 py-0.5 text-[10px] font-black text-white border border-white/15">
                  Tom {deal.volumeNumber}
                </div>
              </div>

              {/* Middle: Manga Info & Bookstore */}
              <div className="space-y-1 mb-3 flex-1">
                <div className="flex items-center justify-between gap-1 text-[10px] text-muted-foreground">
                  <span className="truncate">{deal.publisher}</span>
                  {deal.shop && (
                    <span className="inline-flex items-center gap-1 font-semibold text-cyan-300 shrink-0">
                      {deal.shop.logo && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={deal.shop.logo} alt="" className="h-3 w-3 object-contain" />
                      )}
                      {deal.shop.name}
                    </span>
                  )}
                </div>

                <h3 className="text-xs font-extrabold text-white group-hover:text-cyan-300 transition-colors line-clamp-2 leading-tight">
                  {deal.title}
                </h3>
              </div>

              {/* Bottom: Pricing & CTA Button */}
              <div className="pt-2 border-t border-white/10 space-y-2">
                <div className="flex items-baseline justify-between">
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-base font-black text-emerald-400">
                      {deal.currentPrice.toFixed(2)} zł
                    </span>
                    {deal.coverPrice > deal.currentPrice && (
                      <span className="text-xs text-muted-foreground line-through">
                        {deal.coverPrice.toFixed(2)} zł
                      </span>
                    )}
                  </div>

                  {deal.discountAmount > 0 && (
                    <span className="text-[10px] font-bold text-emerald-300">
                      Taniej o {deal.discountAmount.toFixed(2)} zł
                    </span>
                  )}
                </div>

                <a
                  href={deal.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full flex items-center justify-center gap-1.5 bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 text-black font-black text-xs py-2 rounded-xl shadow-md transition-all group/btn"
                >
                  <span>Kup w {deal.shop?.name || 'sklepie'}</span>
                  <ExternalLink className="h-3 w-3 transition-transform group-hover/btn:translate-x-0.5" />
                </a>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
