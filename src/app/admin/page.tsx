'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { BookOpen, Users, DollarSign, TrendingUp, Sparkles, RefreshCw, Layers, ArrowUpRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { getCoverUrl } from '@/lib/cover-utils'

interface AdminStats {
  mangaCount: number
  volumeCount: number
  userCount: number
  ownedVolumesCount: number
  totalCoverValue: number
  totalSpent: number
  totalSavings: number
}

interface ActivityItem {
  id: string
  type: string
  content: string | null
  createdAt: string
  user: {
    id: string
    name: string | null
    username: string
    avatar: string | null
  }
  volume: {
    id: string
    volumeNumber: number
    coverImage: string | null
  } | null
  manga: {
    id: string
    title: string
    polishTitle: string | null
    defaultCover: string | null
    customCoverUrl: string | null
  } | null
}

function formatRelativeTime(dateString: string): string {
  try {
    const date = new Date(dateString)
    const now = new Date()
    const diffSec = Math.floor((now.getTime() - date.getTime()) / 1000)

    if (diffSec < 60) return 'przed chwilą'
    const diffMin = Math.floor(diffSec / 60)
    if (diffMin < 60) return `${diffMin} min temu`
    const diffHours = Math.floor(diffMin / 60)
    if (diffHours < 24) return `${diffHours} godz. temu`
    const diffDays = Math.floor(diffHours / 24)
    if (diffDays === 1) return 'wczoraj'
    if (diffDays < 7) return `${diffDays} dni temu`
    return date.toLocaleDateString('pl-PL')
  } catch {
    return 'niedawno'
  }
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<AdminStats | null>(null)
  const [activities, setActivities] = useState<ActivityItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)

  const fetchStats = async () => {
    try {
      setIsRefreshing(true)
      const res = await fetch('/api/admin/stats')
      if (res.ok) {
        const data = await res.json()
        if (data.success) {
          setStats(data.stats)
          setActivities(data.activities || [])
        }
      }
    } catch (err) {
      console.error('Błąd pobierania statystyk admina:', err)
    } finally {
      setIsLoading(false)
      setIsRefreshing(false)
    }
  }

  useEffect(() => {
    fetchStats()
  }, [])

  return (
    <div className="space-y-6 animate-in fade-in-50 duration-300 pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary mb-1">
            <Sparkles className="h-3 w-3" />
            <span>Centrum Dowodzenia</span>
          </div>
          <h2 className="text-2xl font-black text-white">Panel Administratora</h2>
          <p className="text-xs text-muted-foreground">
            Bieżący podgląd stanu bazy danych PostgreSQL, aktywności i wartości zbiorów
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={fetchStats}
          disabled={isRefreshing}
          className="bg-white/5 border-white/10 hover:bg-white/10 text-xs rounded-xl text-white gap-2 self-start sm:self-auto"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? 'animate-spin text-cyan-400' : ''}`} />
          Odśwież dane
        </Button>
      </div>

      {/* KPI Stats Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="bg-[#0C101D]/90 border-white/10 shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
              Serie w Bazie
            </CardTitle>
            <BookOpen className="h-4 w-4 text-cyan-400" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black text-white">
              {isLoading ? '...' : (stats?.mangaCount ?? 0)}
            </div>
            <p className="text-[11px] text-muted-foreground mt-1 flex items-center gap-1">
              <span>Wszystkie dodane tytuły</span>
            </p>
          </CardContent>
        </Card>

        <Card className="bg-[#0C101D]/90 border-white/10 shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
              Tomy w Bazie
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-purple-400" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black text-white">
              {isLoading ? '...' : (stats?.volumeCount ?? 0)}
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">
              Posiadane przez użytkowników: <strong className="text-cyan-300">{stats?.ownedVolumesCount ?? 0}</strong>
            </p>
          </CardContent>
        </Card>

        <Card className="bg-[#0C101D]/90 border-white/10 shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
              Użytkownicy
            </CardTitle>
            <Users className="h-4 w-4 text-emerald-400" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black text-white">
              {isLoading ? '...' : (stats?.userCount ?? 0)}
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">
              Zarejestrowane konta w systemie
            </p>
          </CardContent>
        </Card>

        <Card className="bg-[#0C101D]/90 border-white/10 shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
              Wartość Zbiorów
            </CardTitle>
            <DollarSign className="h-4 w-4 text-amber-400" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black text-white">
              {isLoading ? '...' : `${(stats?.totalCoverValue ?? 0).toLocaleString('pl-PL')} zł`}
            </div>
            <div className="flex items-center gap-2 mt-1">
              <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/40 text-[10px]">
                Zaoszczędzono: {(stats?.totalSavings ?? 0).toLocaleString('pl-PL')} zł
              </Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Real Live Activities Stream */}
        <Card className="lg:col-span-2 bg-[#0C101D]/90 border-white/10 shadow-xl">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <div>
              <CardTitle className="text-base font-bold text-white">Ostatnie Aktywności Użytkowników</CardTitle>
              <CardDescription className="text-xs">
                Rzeczywiste działania w czasie rzeczywistym z bazy danych
              </CardDescription>
            </div>
            <Badge variant="outline" className="text-[10px] border-white/15 text-muted-foreground">
              Na żywo
            </Badge>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="py-12 text-center text-xs text-muted-foreground">
                Ładowanie aktywności...
              </div>
            ) : activities.length === 0 ? (
              <div className="py-12 text-center text-xs text-muted-foreground">
                Brak zarejestrowanych aktywności w serwisie.
              </div>
            ) : (
              <div className="divide-y divide-white/5 space-y-3">
                {activities.map((act) => {
                  const mangaCover = act.manga?.customCoverUrl || act.manga?.defaultCover || act.volume?.coverImage
                  const mangaTitle = act.manga?.polishTitle || act.manga?.title

                  return (
                    <div key={act.id} className="pt-3 first:pt-0 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        {mangaCover ? (
                          <div className="relative h-10 w-7 shrink-0 overflow-hidden rounded bg-black border border-white/10">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={getCoverUrl(mangaCover)}
                              alt={mangaTitle || 'Okładka'}
                              className="h-full w-full object-cover"
                            />
                          </div>
                        ) : (
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/20 text-primary font-bold text-xs">
                            {act.user.name?.[0] || act.user.username[0].toUpperCase()}
                          </div>
                        )}

                        <div className="min-w-0">
                          <p className="text-xs font-bold text-white truncate">
                            {act.user.name || act.user.username}
                          </p>
                          <p className="text-[11px] text-muted-foreground truncate">
                            {act.content || (mangaTitle ? `działał przy ${mangaTitle}` : act.type)}
                          </p>
                        </div>
                      </div>

                      <span className="text-[10px] font-medium text-muted-foreground whitespace-nowrap shrink-0">
                        {formatRelativeTime(act.createdAt)}
                      </span>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Actions Panel */}
        <div className="space-y-6">
          <Card className="bg-[#0C101D]/90 border-white/10 shadow-xl">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-bold text-white">Szybkie Akcje</CardTitle>
              <CardDescription className="text-xs">Zarządzaj zasobami i użytkownikami</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <Link href="/admin/manga" className="block">
                <Button variant="outline" className="w-full justify-between text-xs h-10 bg-white/5 border-white/10 hover:bg-white/10 text-white rounded-xl">
                  <span className="flex items-center gap-2">
                    <BookOpen className="h-4 w-4 text-cyan-400" />
                    Zarządzaj Mangami ({stats?.mangaCount ?? 0})
                  </span>
                  <ArrowUpRight className="h-3.5 w-3.5 text-muted-foreground" />
                </Button>
              </Link>

              <Link href="/admin/manga/new" className="block">
                <Button variant="outline" className="w-full justify-between text-xs h-10 bg-white/5 border-white/10 hover:bg-white/10 text-white rounded-xl">
                  <span className="flex items-center gap-2">
                    <Layers className="h-4 w-4 text-primary" />
                    Dodaj nową mangę do bazy
                  </span>
                  <ArrowUpRight className="h-3.5 w-3.5 text-muted-foreground" />
                </Button>
              </Link>

              <Link href="/admin/releases" className="block">
                <Button variant="outline" className="w-full justify-between text-xs h-10 bg-white/5 border-white/10 hover:bg-white/10 text-white rounded-xl">
                  <span className="flex items-center gap-2">
                    🗓️ Kalendarz premier & Scraper
                  </span>
                  <ArrowUpRight className="h-3.5 w-3.5 text-muted-foreground" />
                </Button>
              </Link>

              <Link href="/admin/users" className="block">
                <Button variant="outline" className="w-full justify-between text-xs h-10 bg-white/5 border-white/10 hover:bg-white/10 text-white rounded-xl">
                  <span className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-emerald-400" />
                    Zarządzaj użytkownikami ({stats?.userCount ?? 0})
                  </span>
                  <ArrowUpRight className="h-3.5 w-3.5 text-muted-foreground" />
                </Button>
              </Link>

              <Link href="/admin/publishers" className="block">
                <Button variant="outline" className="w-full justify-between text-xs h-10 bg-white/5 border-white/10 hover:bg-white/10 text-white rounded-xl">
                  <span className="flex items-center gap-2">
                    🏢 Polskie Wydawnictwa
                  </span>
                  <ArrowUpRight className="h-3.5 w-3.5 text-muted-foreground" />
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
