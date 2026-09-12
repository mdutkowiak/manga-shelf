'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import {
  User,
  BookOpen,
  Calendar,
  Edit,
  Crown,
  Sparkles,
  Shield,
  ArrowRight,
  Share2,
  Copy,
  Check,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { getSavedCollection } from '@/lib/collection-store'
import { getRankTier, calculateLevel } from '@/lib/gamification'
import { UserRankBadge } from '@/components/manga/user-rank-badge'

export default function ProfilePage() {
  const { data: session, status } = useSession()
  const [copied, setCopied] = useState(false)
  const [collectionStats, setCollectionStats] = useState({
    totalSeries: 0,
    totalVolumes: 0,
    totalRead: 0,
    totalCoverValue: 0,
    totalSpent: 0,
    totalSavings: 0,
  })

  const [dbUser, setDbUser] = useState<{
    id?: string
    name?: string | null
    username?: string
    bio?: string | null
    avatar?: string | null
    image?: string | null
    role?: string
    email?: string | null
  } | null>(null)

  const userId = session?.user?.id

  const fetchDbUser = useCallback(async () => {
    if (!userId) return
    try {
      const res = await fetch(`/api/users/me?userId=${userId}`)
      if (res.ok) {
        const data = await res.json()
        if (data.user) {
          setDbUser(data.user)
        }
      }
    } catch (err) {
      console.error('Failed to fetch user profile:', err)
    }
  }, [userId])

  useEffect(() => {
    fetchDbUser()

    const handleProfileUpdate = (e: CustomEvent) => {
      if (e.detail) {
        setDbUser((prev) => ({
          ...prev,
          name: e.detail.name ?? prev?.name,
          bio: e.detail.bio ?? prev?.bio,
          avatar: e.detail.avatar ?? prev?.avatar,
          image: e.detail.image ?? prev?.image,
        }))
      }
      fetchDbUser()
    }

    window.addEventListener('mangowo_profile_updated', handleProfileUpdate as EventListener)
    return () => {
      window.removeEventListener('mangowo_profile_updated', handleProfileUpdate as EventListener)
    }
  }, [fetchDbUser])

  useEffect(() => {
    const timer = setTimeout(() => {
      const col = getSavedCollection()
      let vols = 0
      let read = 0
      let coverVal = 0
      let spent = 0

      col.forEach((s) => {
        s.volumes.forEach((v) => {
          if (v.status === 'OWNED' || v.status === 'READ') {
            vols++
            const cPrice = v.coverPrice ?? 34.99
            const pPrice = v.purchasePrice ?? cPrice
            coverVal += cPrice
            spent += pPrice
          }
          if (v.status === 'READ') read++
        })
      })
      setCollectionStats({
        totalSeries: col.length,
        totalVolumes: vols,
        totalRead: read,
        totalCoverValue: Math.round(coverVal * 100) / 100,
        totalSpent: Math.round(spent * 100) / 100,
        totalSavings: Math.max(0, Math.round((coverVal - spent) * 100) / 100),
      })
    }, 0)
    return () => clearTimeout(timer)
  }, [])

  if (status === 'loading') {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    )
  }

  if (!session?.user) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center glass-panel rounded-2xl p-8 border-dashed">
        <User className="mb-4 h-16 w-16 text-muted-foreground" />
        <h1 className="text-2xl font-bold">Nie zalogowano</h1>
        <p className="text-muted-foreground text-sm mt-1">Zaloguj się, aby zarządzać swoim profilem</p>
        <Link href="/login" className="mt-4">
          <Button className="font-bold shadow-md shadow-primary/25">Zaloguj się</Button>
        </Link>
      </div>
    )
  }

  const sessionUser = session.user as {
    name?: string | null
    email?: string | null
    username?: string
    avatar?: string
    image?: string
    role?: string
    bio?: string
  }

  const displayName = dbUser?.name || sessionUser.name || sessionUser.username || 'Kolekcjoner'
  const displayUsername = dbUser?.username || sessionUser.username
  const displayEmail = dbUser?.email || sessionUser.email
  const displayAvatar = dbUser?.avatar || dbUser?.image || sessionUser.image || sessionUser.avatar
  const displayBio = dbUser?.bio || sessionUser.bio
  const displayRole = dbUser?.role || sessionUser.role || 'USER'

  const userXP = collectionStats.totalVolumes * 50 + collectionStats.totalRead * 100
  const currentTier = getRankTier(userXP)
  const currentLevel = calculateLevel(userXP)

  const shareUrl =
    typeof window !== 'undefined'
      ? `${window.location.origin}/users/${displayUsername || ''}`
      : ''

  const handleCopyLink = () => {
    if (shareUrl) {
      navigator.clipboard.writeText(shareUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2500)
    }
  }

  const handleNativeShare = async () => {
    if (typeof navigator !== 'undefined' && navigator.share && shareUrl) {
      try {
        await navigator.share({
          title: `Kolekcja Mang: ${displayName}`,
          text: `Sprawdź moją kolekcję ${collectionStats.totalVolumes} tomów mang na Manga-Shelf!`,
          url: shareUrl,
        })
      } catch {
        handleCopyLink()
      }
    } else {
      handleCopyLink()
    }
  }

  return (
    <div className="space-y-6 animate-in fade-in-50 duration-300 pb-12">
      <div>
        <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary mb-1">
          <Sparkles className="h-3 w-3" />
          <span>Konto Kolekcjonera</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">Mój Profil</h1>
        <p className="text-xs sm:text-sm text-muted-foreground">
          Zarządzaj swoimi danymi, awatarem i ustawieniami prywatności
        </p>
      </div>

      {/* Main Profile Header Card */}
      <Card className="glass-panel border-primary/30 neon-border-purple overflow-hidden">
        <CardContent className="p-6 sm:p-8">
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 text-center sm:text-left">
            <div className="relative h-24 w-24 shrink-0">
              {displayAvatar ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={displayAvatar}
                  alt={displayUsername || displayName || 'Avatar'}
                  referrerPolicy="no-referrer"
                  className="h-full w-full rounded-2xl object-cover ring-2 ring-primary/60 shadow-xl shadow-primary/25"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center rounded-2xl bg-gradient-to-tr from-primary to-cyan-500 text-white font-extrabold text-3xl shadow-xl shadow-primary/25">
                  {(displayName?.[0] || 'K').toUpperCase()}
                </div>
              )}
              <span className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500 ring-2 ring-background text-[10px] text-white font-bold">
                ✓
              </span>
            </div>

            <div className="flex-1 space-y-2">
              <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                <h2 className="text-2xl font-extrabold tracking-tight text-white">
                  {displayName}
                </h2>
                <UserRankBadge userXP={userXP} />
              </div>

              {displayUsername && <p className="text-sm font-semibold text-cyan-400">@{displayUsername}</p>}
              {displayEmail && <p className="text-xs text-muted-foreground">{displayEmail}</p>}

              {displayBio ? (
                <div className="mt-2.5 rounded-xl bg-white/[0.04] border border-white/10 p-3 text-xs text-muted-foreground leading-relaxed">
                  <p className="italic text-foreground/90 font-medium leading-relaxed">
                    &ldquo;{displayBio}&rdquo;
                  </p>
                </div>
              ) : (
                <p className="mt-2 text-xs italic text-muted-foreground/60">
                  Brak opisu profilu. Kliknij &quot;Edytuj Profil&quot;, aby dodać coś o sobie.
                </p>
              )}

              <div className="flex items-center justify-center sm:justify-start gap-4 text-xs text-muted-foreground pt-2">
                <span className="flex items-center gap-1.5 font-medium">
                  <Calendar className="h-4 w-4 text-primary" />
                  Status: Aktywny
                </span>
                <span className="flex items-center gap-1.5 font-medium">
                  <Shield className="h-4 w-4 text-cyan-400" />
                  Rola: {displayRole}
                </span>
              </div>
            </div>

            <Link href="/profile/edit" className="shrink-0">
              <Button variant="outline" size="sm" className="glass-panel text-xs">
                <Edit className="mr-1.5 h-3.5 w-3.5" />
                Edytuj Profil
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>

      {/* Wizytówka Kolekcjonerska (Public Share Card) */}
      <Card className="glass-panel border-cyan-500/30 bg-gradient-to-r from-cyan-950/30 via-[#0B0F19] to-purple-950/20 overflow-hidden">
        <CardHeader className="pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-cyan-500/30 bg-cyan-500/10 px-2.5 py-0.5 text-[10px] font-bold text-cyan-300">
                <Share2 className="h-3 w-3" />
                Wizytówka Kolekcjonera
              </span>
            </div>
            <CardTitle className="text-base font-bold text-white mt-1">
              Twoja Wizytówka Półki
            </CardTitle>
            <CardDescription className="text-xs">
              Udostępnij swoją półkę znajomym na Discordzie, Instagramie lub forach mangowych
            </CardDescription>
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleCopyLink}
              className="text-xs font-bold bg-white/5 border-white/15 hover:bg-white/10 text-white rounded-xl gap-1.5 h-8"
            >
              {copied ? (
                <>
                  <Check className="h-3.5 w-3.5 text-emerald-400" />
                  Skopiowano Link!
                </>
              ) : (
                <>
                  <Copy className="h-3.5 w-3.5 text-cyan-400" />
                  Kopiuj Link
                </>
              )}
            </Button>

            <Button
              type="button"
              size="sm"
              onClick={handleNativeShare}
              className="text-xs font-bold bg-gradient-to-r from-primary to-cyan-500 text-white rounded-xl gap-1.5 h-8 shadow-md shadow-primary/25"
            >
              <Share2 className="h-3.5 w-3.5" />
              Udostępnij Półkę
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-3 gap-3">
            <div className="p-3 rounded-xl bg-white/[0.03] border border-white/10 text-center">
              <span className="text-[10px] text-muted-foreground font-semibold block">Serie w Zbiorze</span>
              <span className="text-lg font-black text-white mt-0.5 block">{collectionStats.totalSeries}</span>
            </div>
            <div className="p-3 rounded-xl bg-white/[0.03] border border-white/10 text-center">
              <span className="text-[10px] text-muted-foreground font-semibold block">Posiadane Tomy</span>
              <span className="text-lg font-black text-cyan-300 mt-0.5 block">{collectionStats.totalVolumes}</span>
            </div>
            <div className="p-3 rounded-xl bg-white/[0.03] border border-white/10 text-center">
              <span className="text-[10px] text-muted-foreground font-semibold block">Przeczytane</span>
              <span className="text-lg font-black text-emerald-400 mt-0.5 block">{collectionStats.totalRead}</span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1 border-t border-white/5">
            <div className="p-2.5 rounded-xl bg-white/[0.02] border border-white/5 flex items-center justify-between sm:flex-col sm:items-center text-center">
              <span className="text-[10px] text-muted-foreground font-semibold">Wartość okładkowa</span>
              <span className="text-sm font-extrabold text-white mt-0.5">{collectionStats.totalCoverValue.toFixed(2)} zł</span>
            </div>
            <div className="p-2.5 rounded-xl bg-white/[0.02] border border-white/5 flex items-center justify-between sm:flex-col sm:items-center text-center">
              <span className="text-[10px] text-muted-foreground font-semibold">Faktycznie wydano</span>
              <span className="text-sm font-extrabold text-cyan-300 mt-0.5">{collectionStats.totalSpent.toFixed(2)} zł</span>
            </div>
            <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-between sm:flex-col sm:items-center text-center">
              <span className="text-[10px] text-emerald-400 font-semibold">Łącznie zaoszczędzono</span>
              <span className="text-sm font-black text-emerald-300 mt-0.5">+{collectionStats.totalSavings.toFixed(2)} zł</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 sm:grid-cols-2">
        <Card className="glass-panel border-border/70">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-bold">Szybkie Akcje</CardTitle>
            <CardDescription className="text-xs">Skróty do najważniejszych sekcji</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2.5">
            <Link href="/collection" className="block">
              <Button variant="outline" className="w-full justify-between text-xs h-10 glass-panel">
                <span className="flex items-center gap-2">
                  <BookOpen className="h-4 w-4 text-primary" />
                  Moja Półka i Kolekcja
                </span>
                <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
              </Button>
            </Link>

            <Link href="/stats" className="block">
              <Button variant="outline" className="w-full justify-between text-xs h-10 glass-panel">
                <span className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-cyan-400" />
                  Wycena & Statystyki Finansowe
                </span>
                <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
              </Button>
            </Link>

            <Link href={`/users/${displayUsername || ''}`} className="block">
              <Button variant="outline" className="w-full justify-between text-xs h-10 glass-panel">
                <span className="flex items-center gap-2">
                  <User className="h-4 w-4 text-purple-400" />
                  Zobacz mój publiczny profil
                </span>
                <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card className="glass-panel border-border/70">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-bold">Informacje o Koncie</CardTitle>
            <CardDescription className="text-xs">Podsumowanie profilu i uprawnień</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-xs">
            <div className="flex justify-between p-2.5 rounded-lg bg-background/50 border border-border/60">
              <span className="text-muted-foreground font-medium">Nazwa użytkownika</span>
              <span className="font-bold text-cyan-400">@{displayUsername || '-'}</span>
            </div>
            <div className="flex justify-between p-2.5 rounded-lg bg-background/50 border border-border/60">
              <span className="text-muted-foreground font-medium">Wyświetlane Imię</span>
              <span className="font-bold">{displayName || '-'}</span>
            </div>
            <div className="flex justify-between p-2.5 rounded-lg bg-background/50 border border-border/60">
              <span className="text-muted-foreground font-medium">Adres Email</span>
              <span className="font-bold">{displayEmail || '-'}</span>
            </div>
            <div className="flex justify-between p-2.5 rounded-lg bg-background/50 border border-border/60">
              <span className="text-muted-foreground font-medium">Ranga Systemowa</span>
              <Badge variant="outline" className="text-[10px] bg-primary/15 text-primary border-primary/40">
                {displayRole}
              </Badge>
            </div>
            <div className="flex justify-between p-2.5 rounded-lg bg-background/50 border border-border/60">
              <span className="text-muted-foreground font-medium">Ranga Kolekcjonerska</span>
              <span className="font-bold text-amber-300 flex items-center gap-1">
                <span>{currentTier.badgeIcon}</span>
                <span>{currentTier.title} (Lvl {currentLevel})</span>
              </span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
