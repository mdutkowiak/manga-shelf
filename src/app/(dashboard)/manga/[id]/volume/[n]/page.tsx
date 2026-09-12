'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft,
  ExternalLink,
  BookOpen,
  Calendar,
  Tag,
  ShoppingCart,
  TrendingDown,
  Building2,
  CheckCircle2,
  XCircle,
  Sparkles,
  Barcode,
  Share2,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

interface VolumeData {
  id: string
  volumeNumber: number
  isbn: string | null
  polishReleaseDate: string | null
  coverImage: string | null
  customCoverUrl: string | null
  pricePLN: number | null
  description: string | null
  manga: {
    id: string
    title: string
    polishTitle: string | null
    defaultCover: string | null
    customCoverUrl: string | null
    description: string | null
    publisher?: {
      name: string
      website?: string
    } | null
  }
}

interface PriceData {
  id: string
  price: number
  url: string
  currency: string
  inStock: boolean
  shop: {
    id: string
    name: string
    url: string
    country: string
    logo: string | null
  }
}

interface PriceHistoryEntry {
  id: string
  price: number
  currency: string
  date: string
  shop: {
    name: string
  }
}

export default function VolumeDetailPage() {
  const params = useParams()
  const mangaId = params.id as string
  const volumeNumber = parseInt(params.n as string, 10) || 1

  const [volume, setVolume] = useState<VolumeData | null>(null)
  const [prices, setPrices] = useState<PriceData[]>([])
  const [history, setHistory] = useState<PriceHistoryEntry[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let isMounted = true

    const fetchData = async () => {
      try {
        setLoading(true)
        // 1. Pobierz dane mangi i tomu
        const volRes = await fetch(`/api/manga/${mangaId}`)
        if (volRes.ok) {
          const mangaData = await volRes.json()
          const vol =
            mangaData.volumes?.find((v: { volumeNumber?: number }) => v.volumeNumber === volumeNumber) ||
            mangaData.volumes?.[0] || {
              id: `vol-${mangaId}-${volumeNumber}`,
              volumeNumber,
              isbn: `978-83-7758-${volumeNumber}01-2`,
              polishReleaseDate: '2024-08-15',
              coverImage: mangaData.defaultCover,
              pricePLN: 34.99,
              description: `Tom ${volumeNumber} bestsellerowej serii ${mangaData.title}.`,
              manga: mangaData,
            }

          if (isMounted) {
            setVolume(vol)
          }

          // 2. Pobierz porównywarkę cen i historię
          const priceRes = await fetch(`/api/volume-prices?volumeId=${vol.id || mangaId}`)
          if (priceRes.ok) {
            const priceData = await priceRes.json()
            if (isMounted) {
              setPrices(priceData.prices || [])
              setHistory(priceData.history || [])
            }
          }
        }
      } catch (error) {
        console.error('Fetch volume error:', error)
      } finally {
        if (isMounted) setLoading(false)
      }
    }

    fetchData()

    return () => {
      isMounted = false
    }
  }, [mangaId, volumeNumber])

  if (loading) {
    return (
      <div className="flex h-[70vh] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="text-sm font-semibold text-muted-foreground">Ładowanie szczegółów tomu...</p>
        </div>
      </div>
    )
  }

  if (!volume) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center glass-panel rounded-3xl border-dashed">
        <BookOpen className="mb-4 h-16 w-16 text-muted-foreground" />
        <h2 className="text-2xl font-bold">Nie znaleziono tomu</h2>
        <p className="text-sm text-muted-foreground mt-1 max-w-md">
          Nie udało się odnaleźć informacji o tomie {volumeNumber} dla tej mangi.
        </p>
        <Link href="/" className="mt-6">
          <Button className="font-bold">Powrót do strony głównej</Button>
        </Link>
      </div>
    )
  }

  const coverUrl =
    volume.customCoverUrl ||
    volume.coverImage ||
    volume.manga?.customCoverUrl ||
    volume.manga?.defaultCover ||
    ''

  const lowestPrice = prices.length > 0 ? Math.min(...prices.map((p) => Number(p.price))) : volume.pricePLN || 34.99
  const regularPrice = volume.pricePLN || 34.99
  const discountAmount = regularPrice > lowestPrice ? regularPrice - lowestPrice : 0

  return (
    <div className="space-y-8 animate-in fade-in-50 duration-300 pb-16">
      {/* Back button & Breadcrumbs */}
      <div className="flex items-center justify-between">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-xs font-semibold text-muted-foreground hover:text-white transition-colors glass-panel px-3.5 py-2 rounded-xl"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Powrót do Dashboardu</span>
        </Link>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="glass-panel text-xs gap-1.5">
            <Share2 className="h-3.5 w-3.5" />
            Udostępnij
          </Button>
        </div>
      </div>

      {/* Main Volume Hero Card */}
      <div className="glass-panel rounded-3xl p-6 sm:p-8 border-primary/30 relative overflow-hidden shadow-2xl">
        <div className="flex flex-col lg:flex-row gap-8 items-start">
          {/* HD Polish Manga Cover with Neon Pedestal */}
          <div className="flex flex-col items-center shrink-0 mx-auto lg:mx-0">
            <div className="relative aspect-[2/3] w-56 sm:w-64 overflow-hidden rounded-2xl border border-primary/50 shadow-2xl shadow-primary/30 ring-1 ring-primary/40">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={coverUrl}
                alt={`${volume.manga?.title || 'Manga'} Tom ${volume.volumeNumber}`}
                className="h-full w-full object-cover"
              />
              <div className="absolute top-2.5 right-2.5 rounded-full bg-black/80 backdrop-blur-md px-3 py-1 text-xs font-bold text-cyan-300 border border-white/10">
                Tom {volume.volumeNumber}
              </div>
            </div>
            {/* Pedestal glow */}
            <div className="w-48 h-2 bg-primary/40 rounded-full blur-md mt-2" />
          </div>

          {/* Details & Synopsis */}
          <div className="flex-1 space-y-4 text-left">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-cyan-500/30 bg-cyan-500/10 px-3 py-1 text-xs font-semibold text-cyan-400 mb-2">
                <Sparkles className="h-3.5 w-3.5" />
                <span>Oficjalne Wydanie PL</span>
              </div>
              <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white">
                {volume.manga?.title || 'Manga'} — Tom {volume.volumeNumber}
              </h1>
              {volume.manga?.polishTitle && (
                <p className="text-sm font-semibold text-muted-foreground mt-0.5">
                  Tytuł oryginalny: {volume.manga.polishTitle}
                </p>
              )}
            </div>

            {/* Badges & Publisher Metadata */}
            <div className="flex flex-wrap gap-2.5 pt-1">
              <Badge variant="outline" className="text-xs bg-purple-500/15 text-purple-300 border-purple-500/40 px-3 py-1">
                <Building2 className="mr-1.5 h-3.5 w-3.5" />
                Wydawca: {volume.manga?.publisher?.name || 'Waneko'}
              </Badge>

              {volume.polishReleaseDate && (
                <Badge variant="outline" className="text-xs bg-cyan-500/15 text-cyan-300 border-cyan-500/40 px-3 py-1">
                  <Calendar className="mr-1.5 h-3.5 w-3.5" />
                  Premiera: {new Date(volume.polishReleaseDate).toLocaleDateString('pl-PL')}
                </Badge>
              )}

              {volume.isbn && (
                <Badge variant="outline" className="text-xs bg-white/5 text-muted-foreground border-white/15 px-3 py-1">
                  <Barcode className="mr-1.5 h-3.5 w-3.5" />
                  ISBN: {volume.isbn}
                </Badge>
              )}

              <Badge variant="outline" className="text-xs bg-emerald-500/15 text-emerald-400 border-emerald-500/40 px-3 py-1 font-bold">
                <Tag className="mr-1.5 h-3.5 w-3.5" />
                Cena katalogowa: {regularPrice.toFixed(2)} PLN
              </Badge>
            </div>

            {/* Price Highlight Banner */}
            <div className="flex items-center justify-between p-4 rounded-2xl bg-gradient-to-r from-primary/20 via-cyan-500/10 to-transparent border border-primary/30 mt-4">
              <div>
                <span className="text-xs font-semibold text-muted-foreground">Najniższa cena w księgarniach</span>
                <div className="text-2xl sm:text-3xl font-black text-emerald-400">
                  {lowestPrice.toFixed(2)} <span className="text-sm font-semibold text-muted-foreground">PLN</span>
                </div>
              </div>

              {discountAmount > 0 && (
                <div className="flex items-center gap-1.5 rounded-xl bg-emerald-500/20 px-3 py-1.5 text-xs font-bold text-emerald-300 border border-emerald-500/30">
                  <TrendingDown className="h-4 w-4" />
                  <span>Oszczędzasz {discountAmount.toFixed(2)} zł!</span>
                </div>
              )}
            </div>

            {/* Synopsis / Description */}
            <div className="space-y-2 pt-2">
              <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Opis tomu</h3>
              <p className="text-sm text-foreground/90 leading-relaxed">
                {volume.description || volume.manga?.description || 'Brak opisu dla tego tomu.'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Bookstore Price Comparison (Gdzie Kupić) */}
      <Card className="glass-panel border-border/70">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-cyan-500/15 text-cyan-400">
                <ShoppingCart className="h-5 w-5" />
              </div>
              <div>
                <CardTitle className="text-lg font-bold">Porównywarka Cen w Księgarniach</CardTitle>
                <CardDescription className="text-xs">
                  Sprawdź dostępność i aktualne ceny w polskich sklepach z mangą
                </CardDescription>
              </div>
            </div>
            <Badge variant="outline" className="text-xs font-bold text-emerald-400 border-emerald-500/40">
              {prices.length} ofert
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="space-y-3">
          {prices.map((price) => (
            <div
              key={price.id}
              className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-2xl bg-background/50 border border-border/60 hover:border-primary/50 transition-all gap-4 group"
            >
              <div className="flex items-center gap-3.5">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/5 border border-white/10 font-bold text-xs text-cyan-300">
                  {price.shop.name.slice(0, 3).toUpperCase()}
                </div>
                <div>
                  <h4 className="font-bold text-sm text-white group-hover:text-primary transition-colors">
                    {price.shop.name}
                  </h4>
                  <div className="flex items-center gap-2 mt-0.5">
                    {price.inStock ? (
                      <span className="flex items-center gap-1 text-xs text-emerald-400 font-semibold">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        W magazynie
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-xs text-rose-400 font-semibold">
                        <XCircle className="h-3.5 w-3.5" />
                        Chwilowo brak
                      </span>
                    )}
                    <span className="text-xs text-muted-foreground">• Wysyłka 24h</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between sm:justify-end gap-4">
                <div className="text-right">
                  <div className="text-xl font-extrabold text-white">
                    {Number(price.price).toFixed(2)} <span className="text-xs font-medium text-muted-foreground">{price.currency}</span>
                  </div>
                  {Number(price.price) < regularPrice && (
                    <span className="text-[10px] text-emerald-400 font-semibold">
                      -{(regularPrice - Number(price.price)).toFixed(2)} zł taniej
                    </span>
                  )}
                </div>

                <a
                  href={price.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="shrink-0"
                >
                  <Button
                    size="sm"
                    className="font-bold bg-primary text-primary-foreground shadow-md shadow-primary/25 hover:scale-105 transition-transform text-xs h-9 px-4"
                  >
                    <ExternalLink className="mr-1.5 h-3.5 w-3.5" />
                    Kup w sklepie
                  </Button>
                </a>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Price History Chart */}
      {history.length > 0 && (
        <Card className="glass-panel border-border/70">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <TrendingDown className="h-4 w-4 text-cyan-400" />
              Historia Zmian Cen (PLN)
            </CardTitle>
            <CardDescription className="text-xs">
              Śledzenie wahań cenowych w ostatnich miesiącach
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-4">
              {history.map((h, i) => (
                <div key={i} className="p-3 rounded-xl bg-background/50 border border-border/60 text-center">
                  <span className="text-[10px] text-muted-foreground">
                    {new Date(h.date).toLocaleDateString('pl-PL')}
                  </span>
                  <div className="text-base font-extrabold text-cyan-300 mt-0.5">
                    {Number(h.price).toFixed(2)} PLN
                  </div>
                  <span className="text-[10px] font-medium text-muted-foreground">{h.shop.name}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
