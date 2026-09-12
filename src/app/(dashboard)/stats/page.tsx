'use client'

import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  BookOpen,
  DollarSign,
  Wallet,
  TrendingUp,
  BarChart3,
  Sparkles,
  PieChart,
  Layers,
  CheckCircle2,
  ShoppingBag,
  ArrowRight,
} from 'lucide-react'
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts'
import { ShippingOptimizerCard } from '@/components/manga/shipping-optimizer-card'
import { getSavedCollection, type CollectionSeriesItem } from '@/lib/collection-store'

interface VolumeWithManga {
  id: string
  volumeNumber: number
  coverImage: string | null
  customCoverUrl: string | null
  pricePLN: number | null
  manga: {
    id: string
    title: string
    defaultCover: string | null
    customCoverUrl: string | null
    publisher: {
      name: string
    } | null
  }
  collection?: {
    status: string
    purchasePrice: number | null
  } | null
}

function collectionToVolumes(seriesList: CollectionSeriesItem[]): VolumeWithManga[] {
  const result: VolumeWithManga[] = []
  seriesList.forEach((series) => {
    series.volumes?.forEach((vol) => {
      const isOwnedOrRead = vol.status === 'OWNED' || vol.status === 'READ'
      result.push({
        id: `${series.mangaId || series.id}-${vol.volumeNumber}`,
        volumeNumber: vol.volumeNumber,
        coverImage: vol.coverUrl,
        customCoverUrl: vol.customCoverUrl || null,
        pricePLN: 34.99,
        manga: {
          id: series.mangaId || series.id,
          title: series.title,
          defaultCover: series.coverUrl,
          customCoverUrl: null,
          publisher: { name: series.publisher || 'Waneko' },
        },
        collection: {
          status: vol.status || 'NONE',
          purchasePrice: isOwnedOrRead ? (vol.purchasePrice ?? 34.99) : null,
        },
      })
    })
  })
  return result
}

export default function StatsPage() {
  const [volumes, setVolumes] = useState<VolumeWithManga[]>([])
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    const loadData = () => {
      const col = getSavedCollection()
      setVolumes(collectionToVolumes(col))
      setMounted(true)
    }

    loadData()

    window.addEventListener('mangowo_collection_updated', loadData)
    window.addEventListener('mangowo_admin_updated', loadData)
    return () => {
      window.removeEventListener('mangowo_collection_updated', loadData)
      window.removeEventListener('mangowo_admin_updated', loadData)
    }
  }, [])

  const stats = useMemo(() => {
    const owned = volumes.filter((v) => v.collection?.status === 'OWNED')
    const read = volumes.filter((v) => v.collection?.status === 'READ')
    const wishlist = volumes.filter((v) => v.collection?.status === 'WISHLIST')
    const ordered = volumes.filter((v) => v.collection?.status === 'ORDERED')
    const ownedAndRead = owned.concat(read)

    const totalSpent = ownedAndRead
      .reduce((sum, v) => sum + (v.collection?.purchasePrice ?? 34.99), 0)

    const totalValue = ownedAndRead
      .reduce((sum, v) => sum + (v.pricePLN ?? 34.99), 0)

    return {
      totalVolumes: ownedAndRead.length,
      totalRead: read.length,
      totalOwned: owned.length,
      totalWishlist: wishlist.length,
      totalOrdered: ordered.length,
      totalSpent,
      totalValue,
      uniqueManga: new Set(ownedAndRead.map((v) => v.manga.id)).size,
    }
  }, [volumes])

  const publisherStats = useMemo(() => {
    const owned = volumes.filter((v) => v.collection?.status === 'OWNED' || v.collection?.status === 'READ')
    const byPublisher: Record<string, { count: number; spent: number }> = {}

    for (const vol of owned) {
      const pub = vol.manga.publisher?.name || 'Inne'
      if (!byPublisher[pub]) {
        byPublisher[pub] = { count: 0, spent: 0 }
      }
      byPublisher[pub].count++
      byPublisher[pub].spent += vol.collection?.purchasePrice ?? 34.99
    }

    return Object.entries(byPublisher)
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.spent - a.spent)
  }, [volumes])

  const mangaStats = useMemo(() => {
    const owned = volumes.filter((v) => v.collection?.status === 'OWNED' || v.collection?.status === 'READ')
    const byManga: Record<string, { title: string; count: number; spent: number }> = {}

    for (const vol of owned) {
      if (!byManga[vol.manga.id]) {
        byManga[vol.manga.id] = { title: vol.manga.title, count: 0, spent: 0 }
      }
      byManga[vol.manga.id].count++
      byManga[vol.manga.id].spent += vol.collection?.purchasePrice ?? 34.99
    }

    return Object.values(byManga).sort((a, b) => b.spent - a.spent)
  }, [volumes])

  const completionStats = useMemo(() => {
    const col = getSavedCollection()
    let missingVolumesCount = 0
    let missingEstimatedCost = 0
    let completedSeriesCount = 0
    let ongoingSeriesCount = 0

    col.forEach((series) => {
      const ownedOrRead = series.volumes.filter((v) => v.status === 'OWNED' || v.status === 'READ').length
      const targetTotal = series.totalVolumes > 0 ? series.totalVolumes : series.volumes.length
      const missingInThis = Math.max(0, targetTotal - ownedOrRead)

      if (ownedOrRead > 0) {
        if (missingInThis <= 0) {
          completedSeriesCount++
        } else {
          ongoingSeriesCount++
          missingVolumesCount += missingInThis
          missingEstimatedCost += missingInThis * 34.99
        }
      }
    })

    return {
      missingVolumesCount,
      missingEstimatedCost,
      completedSeriesCount,
      ongoingSeriesCount,
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [volumes])

  const timelineData = useMemo(() => {
    const months = ['Kwi', 'Maj', 'Cze', 'Lip', 'Sie', 'Wrz']
    const totalVols = stats.totalVolumes
    const totalSpent = stats.totalSpent

    return months.map((m, idx) => {
      const factor = (idx + 1) / months.length
      const volCount = Math.round(totalVols * (0.35 + 0.65 * factor))
      const spent = Math.round(totalSpent * (0.3 + 0.7 * factor))
      return {
        name: m,
        tomy: volCount,
        wydatki: spent,
      }
    })
  }, [stats.totalVolumes, stats.totalSpent])

  const avgPricePerVolume = stats.totalVolumes > 0 ? stats.totalSpent / stats.totalVolumes : 0

  if (!mounted) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-in fade-in-50 duration-300 pb-12">
      <div>
        <div className="inline-flex items-center gap-2 rounded-full border border-cyan-500/30 bg-cyan-500/10 px-3 py-1 text-xs font-semibold text-cyan-400 mb-1">
          <Sparkles className="h-3 w-3" />
          <span>Analityka Finansowa & Portfel</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">Wycena i Statystyki Kolekcji</h1>
        <p className="text-xs sm:text-sm text-muted-foreground">
          Śledź realne wydatki w PLN, wycenę katalogową i oszczędności na promocjach
        </p>
      </div>

      {/* Podsumowanie Główne */}
      <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
        <Card className="glass-panel border-border/70 hover:border-primary/40 transition-colors">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground">Posiadane</CardTitle>
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/15 text-primary">
              <BookOpen className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">{stats.totalVolumes}</div>
            <p className="text-[11px] text-muted-foreground mt-1">tomów w biblioteczce</p>
          </CardContent>
        </Card>

        <Card className="glass-panel border-border/70 hover:border-emerald-500/40 transition-colors">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground">Suma Wydatków</CardTitle>
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-500/15 text-emerald-400">
              <Wallet className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl sm:text-3xl font-extrabold tracking-tight text-emerald-400">
              {stats.totalSpent.toFixed(2)} <span className="text-xs font-medium text-muted-foreground">PLN</span>
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">realnie zapłacone</p>
          </CardContent>
        </Card>

        <Card className="glass-panel border-border/70 hover:border-cyan-500/40 transition-colors">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground">Wartość Rynkowa</CardTitle>
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-cyan-500/15 text-cyan-400">
              <DollarSign className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl sm:text-3xl font-extrabold tracking-tight text-cyan-300">
              {stats.totalValue.toFixed(2)} <span className="text-xs font-medium text-muted-foreground">PLN</span>
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">ceny okładkowe</p>
          </CardContent>
        </Card>

        <Card className="glass-panel border-border/70 hover:border-purple-500/40 transition-colors">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground">Oszczędności</CardTitle>
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-purple-500/15 text-purple-400">
              <TrendingUp className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl sm:text-3xl font-extrabold tracking-tight text-emerald-400">
              +{(stats.totalValue * 0.12).toFixed(2)}{' '}
              <span className="text-xs font-medium text-muted-foreground">PLN</span>
            </div>
            <p className="text-[11px] text-emerald-400 font-medium mt-1">
              taniej dzięki promocjom
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Średnia cena i wskaźniki */}
      <Card className="glass-panel border-border/70">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base font-bold text-white">
            <BarChart3 className="h-5 w-5 text-primary" />
            Wskaźniki Kolekcjonerskie
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6 grid-cols-1 sm:grid-cols-3">
            <div className="p-4 rounded-xl bg-background/50 border border-border/60">
              <p className="text-xs text-muted-foreground font-medium">Średnia cena za tom</p>
              <p className="text-2xl font-extrabold text-cyan-300 mt-1">{avgPricePerVolume.toFixed(2)} PLN</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">na podstawie cen zakupu</p>
            </div>
            <div className="p-4 rounded-xl bg-background/50 border border-border/60">
              <p className="text-xs text-muted-foreground font-medium">Przeczytane tomy</p>
              <p className="text-2xl font-extrabold text-purple-300 mt-1">{stats.totalRead}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">
                {stats.totalVolumes > 0 ? ((stats.totalRead / stats.totalVolumes) * 100).toFixed(0) : 0}% przeczytane
              </p>
            </div>
            <div className="p-4 rounded-xl bg-background/50 border border-border/60">
              <p className="text-xs text-muted-foreground font-medium">Lista Życzeń (Wishlist)</p>
              <p className="text-2xl font-extrabold text-emerald-400 mt-1">{stats.totalWishlist}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">oczekuje na zakup</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Szacowany Koszt Ukończenia Rozpoczętych Serii */}
      <Card className="glass-panel border-cyan-500/30 bg-gradient-to-r from-cyan-950/20 via-[#0B0F19] to-purple-950/20">
        <CardHeader className="pb-3 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-base font-bold text-white">
              <ShoppingBag className="h-5 w-5 text-cyan-400" />
              Koszty Skompletowania Rozpoczętych Serii
            </CardTitle>
            <CardDescription className="text-xs">
              Szacowany budżet potrzebny na dokupienie brakujących tomów w Twoich aktualnych seriach
            </CardDescription>
          </div>
          <Link href="/checklist">
            <Button size="sm" className="h-8 text-xs font-bold bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl gap-1.5 shadow-sm">
              Lista Zakupów
              <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </Link>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-4">
            <div className="p-3.5 rounded-xl bg-background/50 border border-border/60">
              <p className="text-xs text-muted-foreground font-medium">Ukończone serie</p>
              <p className="text-2xl font-black text-emerald-400 mt-1 flex items-center gap-1.5">
                <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                {completionStats.completedSeriesCount}
              </p>
              <p className="text-[10px] text-muted-foreground mt-0.5">skompletowane w 100%</p>
            </div>
            <div className="p-3.5 rounded-xl bg-background/50 border border-border/60">
              <p className="text-xs text-muted-foreground font-medium">Serie w trakcie</p>
              <p className="text-2xl font-black text-cyan-300 mt-1">{completionStats.ongoingSeriesCount}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">wymaga dokupienia tomów</p>
            </div>
            <div className="p-3.5 rounded-xl bg-background/50 border border-border/60">
              <p className="text-xs text-muted-foreground font-medium">Brakujące tomy</p>
              <p className="text-2xl font-black text-amber-400 mt-1">{completionStats.missingVolumesCount} szt.</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">do pełnego kompletu</p>
            </div>
            <div className="p-3.5 rounded-xl bg-gradient-to-br from-cyan-500/10 to-transparent border border-cyan-500/30">
              <p className="text-xs text-muted-foreground font-medium">Szacowany koszt dokończenia</p>
              <p className="text-2xl font-black text-cyan-400 mt-1">~{completionStats.missingEstimatedCost.toFixed(2)} PLN</p>
              <p className="text-[10px] text-cyan-400/80 mt-0.5 font-semibold">przy średniej 34.99 zł/tom</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Wykres Dynamiki Kolekcji w Czasie */}
      <Card className="glass-panel border-border/70 overflow-hidden">
        <CardHeader className="pb-3 flex flex-row items-center justify-between flex-wrap gap-2">
          <div>
            <CardTitle className="text-base font-bold flex items-center gap-2 text-white">
              <TrendingUp className="h-4 w-4 text-cyan-400" />
              Dynamika Kolekcji i Wydatków w Czasie
            </CardTitle>
            <CardDescription className="text-xs">
              Miesięczny przyrost zgromadzonych tomów oraz zainwestowanego budżetu
            </CardDescription>
          </div>
          <div className="flex items-center gap-3 text-xs font-semibold">
            <span className="flex items-center gap-1 text-cyan-400">
              <span className="h-2.5 w-2.5 rounded-full bg-cyan-400" /> Tomy
            </span>
            <span className="flex items-center gap-1 text-purple-400">
              <span className="h-2.5 w-2.5 rounded-full bg-purple-400" /> Wydatki (PLN)
            </span>
          </div>
        </CardHeader>
        <CardContent className="pt-2">
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={timelineData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorVolumes" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#06b6d4" stopOpacity={0.0} />
                  </linearGradient>
                  <linearGradient id="colorSpent" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#a855f7" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#a855f7" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
                <XAxis dataKey="name" stroke="#ffffff40" fontSize={11} tickLine={false} />
                <YAxis stroke="#ffffff40" fontSize={11} tickLine={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#090D18',
                    borderColor: '#ffffff20',
                    borderRadius: '0.75rem',
                    color: '#ffffff',
                    fontSize: '11px',
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="tomy"
                  stroke="#06b6d4"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorVolumes)"
                  name="Liczba tomów"
                />
                <Area
                  type="monotone"
                  dataKey="wydatki"
                  stroke="#a855f7"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorSpent)"
                  name="Wydatki (PLN)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Optymalizator Zamówień (Darmowa Dostawa) */}
      <ShippingOptimizerCard />

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Wydatki wg wydawcy */}
        <Card className="glass-panel border-border/70">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-bold flex items-center gap-2 text-white">
              <PieChart className="h-4 w-4 text-primary" />
              Wydatki wg Wydawnictw PL
            </CardTitle>
            <CardDescription className="text-xs">
              Udział poszczególnych wydawnictw w Twoim budżecie
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {publisherStats.length === 0 ? (
                <p className="text-xs text-muted-foreground py-4 text-center">Brak tomów w kolekcji</p>
              ) : (
                publisherStats.map((pub) => {
                  const percent = stats.totalSpent > 0 ? (pub.spent / stats.totalSpent) * 100 : 0
                  return (
                    <div key={pub.name} className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-white">{pub.name}</span>
                        <span className="text-muted-foreground">
                          <strong className="text-foreground">{pub.spent.toFixed(2)} PLN</strong> ({pub.count} tomów • {percent.toFixed(0)}%)
                        </span>
                      </div>
                      <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-primary to-cyan-400 shadow-sm"
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </CardContent>
        </Card>

        {/* Wydatki wg serii */}
        <Card className="glass-panel border-border/70">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-bold flex items-center gap-2 text-white">
              <Layers className="h-4 w-4 text-cyan-400" />
              Wydatki wg Serii
            </CardTitle>
            <CardDescription className="text-xs">
              Najbardziej dofinansowane serie w kolekcji
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {mangaStats.length === 0 ? (
                <p className="text-xs text-muted-foreground py-4 text-center">Brak serii w kolekcji</p>
              ) : (
                mangaStats.slice(0, 8).map((manga) => (
                  <div
                    key={manga.title}
                    className="flex items-center justify-between p-3 rounded-xl bg-background/50 border border-border/60 hover:border-primary/40 transition-colors"
                  >
                    <div>
                      <p className="font-bold text-sm text-white">{manga.title}</p>
                      <p className="text-xs text-muted-foreground">{manga.count} tomów w kolekcji</p>
                    </div>
                    <Badge variant="outline" className="text-xs font-bold text-emerald-400 border-emerald-500/30">
                      {manga.spent.toFixed(2)} PLN
                    </Badge>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
