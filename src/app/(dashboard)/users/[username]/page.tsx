'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { useParams } from 'next/navigation'
import { useSession } from 'next-auth/react'
import {
  User,
  BookOpen,
  Calendar,
  Star,
  UserPlus,
  UserCheck,
  Clock,
  Sparkles,
  Heart,
  CheckCircle2,
  RefreshCw,
  Layers,
  MessageSquare,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { getSavedCollection, applyAdminOverridesToSeries, type CollectionSeriesItem, type CollectionVolumeItem } from '@/lib/collection-store'
import { getCoverUrl } from '@/lib/cover-utils'
import { UserSeriesDetailModal } from '@/components/manga/user-series-detail-modal'
import { BadgeShowcase } from '@/components/manga/badge-showcase'

interface UserProfile {
  id: string
  username: string
  name: string | null
  bio: string | null
  avatar: string | null
  pinnedBadges?: string[]
  createdAt: string
  _count: {
    collections: number
  }
}

interface UserVolume {
  id: string
  volumeNumber: number
  coverImage: string | null
  customCoverUrl: string | null
  manga: {
    title: string
    polishTitle?: string | null
    defaultCover: string | null
    customCoverUrl: string | null
  }
  collection: {
    status: string
    userRating: number | null
  } | null
}

type FriendshipStatus = 'none' | 'pending_sent' | 'pending_received' | 'friends'

export default function UserProfilePage() {
  const params = useParams()
  const username = params.username as string
  const { data: session } = useSession()
  const currentUserId = (session?.user as { id?: string })?.id

  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [seriesList, setSeriesList] = useState<CollectionSeriesItem[]>([])
  const [volumes, setVolumes] = useState<UserVolume[]>([])
  const [loading, setLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [friendshipStatus, setFriendshipStatus] = useState<FriendshipStatus>('none')
  const [friendshipId, setFriendshipId] = useState<string | null>(null)
  const [addingFriend, setAddingFriend] = useState(false)

  // Selected series for UserSeriesDetailModal
  const [selectedSeriesModal, setSelectedSeriesModal] = useState<CollectionSeriesItem | null>(null)
  const [seriesModalOpen, setSeriesModalOpen] = useState(false)

  const fetchProfile = useCallback(async (isBackground = false) => {
    if (!isBackground) setLoading(true)
    else setIsRefreshing(true)

    try {
      const res = await fetch(`/api/users/${encodeURIComponent(username)}`)
      if (!res.ok) {
        const errData = await res.json().catch(() => null)
        if (!isBackground) {
          setError(errData?.error || 'Nie znaleziono użytkownika')
        }
        return
      }
      const data = await res.json()
      setProfile(data.profile)
      const rawSeries: CollectionSeriesItem[] = data.series || []
      const withOverrides = rawSeries.map(applyAdminOverridesToSeries)
      setSeriesList(withOverrides)
      setVolumes(data.volumes || [])
      setError(null)
    } catch {
      if (!isBackground) setError('Błąd podczas ładowania profilu')
    } finally {
      if (!isBackground) setLoading(false)
      setIsRefreshing(false)
    }
  }, [username])


  // Initial fetch and auto-polling every 10 seconds for real-time changes
  useEffect(() => {
    fetchProfile(false)

    const interval = setInterval(() => {
      fetchProfile(true)
    }, 10000)

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        fetchProfile(true)
      }
    }
    document.addEventListener('visibilitychange', handleVisibility)

    return () => {
      clearInterval(interval)
      document.removeEventListener('visibilitychange', handleVisibility)
    }
  }, [fetchProfile])

  // Sprawdź status znajomości
  useEffect(() => {
    if (!currentUserId || !profile || currentUserId === profile.id) return

    const checkFriendship = async () => {
      try {
        const res = await fetch(`/api/friends?userId=${currentUserId}`)
        if (res.ok) {
          const data = await res.json()

          // Sprawdź czy jest znajomym
          const isFriend = data.friends?.find((f: { id: string; friendshipId: string }) => f.id === profile.id)
          if (isFriend) {
            setFriendshipStatus('friends')
            setFriendshipId(isFriend.friendshipId)
            return
          }

          // Sprawdź czy wysłano zaproszenie
          const sentPending = data.pendingSent?.find((p: { id: string; friendshipId: string }) => p.id === profile.id)
          if (sentPending) {
            setFriendshipStatus('pending_sent')
            setFriendshipId(sentPending.friendshipId)
            return
          }

          // Sprawdź czy otrzymano zaproszenie
          const receivedPending = data.pendingReceived?.find((p: { id: string; friendshipId: string }) => p.id === profile.id)
          if (receivedPending) {
            setFriendshipStatus('pending_received')
            setFriendshipId(receivedPending.friendshipId)
            return
          }

          setFriendshipStatus('none')
          setFriendshipId(null)
        }
      } catch (error) {
        console.error('Check friendship error:', error)
      }
    }

    checkFriendship()
  }, [currentUserId, profile])

  const handleAddFriend = async () => {
    if (!profile) return
    setAddingFriend(true)

    try {
      const res = await fetch('/api/friends', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requesterId: currentUserId, addresseeId: profile.id }),
      })

      if (res.ok) {
        const data = await res.json()
        setFriendshipStatus('pending_sent')
        setFriendshipId(data.friendship.id)
      }
    } catch (error) {
      console.error('Add friend error:', error)
    } finally {
      setAddingFriend(false)
    }
  }

  const handleAcceptFriend = async () => {
    if (!friendshipId) return

    try {
      await fetch('/api/friends', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ friendshipId, action: 'accept' }),
      })
      setFriendshipStatus('friends')
      fetchProfile(true)
    } catch (error) {
      console.error('Accept friend error:', error)
    }
  }

  const handleRemoveFriend = async () => {
    if (!friendshipId) return

    try {
      await fetch(`/api/friends?id=${friendshipId}`, { method: 'DELETE' })
      setFriendshipStatus('none')
      setFriendshipId(null)
    } catch (error) {
      console.error('Remove friend error:', error)
    }
  }

  // Renderuj przycisk znajomości
  const renderFriendButton = () => {
    if (!currentUserId || !profile || currentUserId === profile.id) return null

    switch (friendshipStatus) {
      case 'friends':
        return (
          <Button variant="outline" size="sm" onClick={handleRemoveFriend} className="rounded-xl border-emerald-500/40 text-emerald-300 bg-emerald-950/20 text-xs font-bold">
            <UserCheck className="mr-1.5 h-4 w-4" />
            Znajomy
          </Button>
        )
      case 'pending_sent':
        return (
          <Button variant="outline" size="sm" disabled className="rounded-xl border-white/20 text-muted-foreground text-xs">
            <Clock className="mr-1.5 h-4 w-4" />
            Wysłano zaproszenie
          </Button>
        )
      case 'pending_received':
        return (
          <Button size="sm" onClick={handleAcceptFriend} className="rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md shadow-emerald-600/30">
            <UserPlus className="mr-1.5 h-4 w-4" />
            Zaakceptuj zaproszenie
          </Button>
        )
      default:
        return (
          <Button size="sm" onClick={handleAddFriend} disabled={addingFriend} className="rounded-xl bg-primary hover:bg-primary/90 text-white text-xs font-bold shadow-md shadow-primary/30">
            <UserPlus className="mr-1.5 h-4 w-4" />
            {addingFriend ? 'Wysyłanie...' : 'Dodaj do znajomych'}
          </Button>
        )
    }
  }

  const comparisonData = useMemo(() => {
    if (typeof window === 'undefined') {
      return { sharedSeries: [], wishlistMatches: [], matchPercentage: 0 }
    }

    const myCollection = getSavedCollection()
    const mySeriesMap = new Map(myCollection.map((s) => [s.title.toLowerCase().trim(), s]))

    // 1. Shared series
    const sharedSeries: {
      title: string
      myCount: number
      otherCount: number
      cover: string
    }[] = []

    const otherTitles = Array.from(new Set(volumes.map((v) => v.manga.title.toLowerCase().trim())))

    otherTitles.forEach((t) => {
      const mySeries = mySeriesMap.get(t)
      if (mySeries) {
        const myOwnedCount = mySeries.volumes.filter(
          (v) => v.status === 'OWNED' || v.status === 'READ'
        ).length
        const otherCount = volumes.filter(
          (v) =>
            v.manga.title.toLowerCase().trim() === t &&
            (v.collection?.status === 'OWNED' || v.collection?.status === 'READ')
        ).length

        sharedSeries.push({
          title: mySeries.title,
          myCount: myOwnedCount,
          otherCount,
          cover: mySeries.coverUrl,
        })
      }
    })

    // 2. Volumes other user has that logged in user has on wishlist or missing
    const wishlistMatches: {
      title: string
      volumeNumber: number
      cover: string
    }[] = []

    volumes.forEach((v) => {
      if (v.collection?.status === 'OWNED' || v.collection?.status === 'READ') {
        const mySeries = mySeriesMap.get(v.manga.title.toLowerCase().trim())
        if (mySeries) {
          const myVol = mySeries.volumes.find((mv) => mv.volumeNumber === v.volumeNumber)
          if (myVol && (myVol.status === 'WISHLIST' || myVol.status === 'NONE')) {
            wishlistMatches.push({
              title: v.manga.title,
              volumeNumber: v.volumeNumber,
              cover:
                v.customCoverUrl ||
                v.manga.customCoverUrl ||
                v.coverImage ||
                v.manga.defaultCover ||
                mySeries.coverUrl,
            })
          }
        }
      }
    })

    const matchPercentage =
      myCollection.length > 0
        ? Math.min(100, Math.round((sharedSeries.length / Math.max(1, myCollection.length)) * 100))
        : 0

    return {
      sharedSeries,
      wishlistMatches,
      matchPercentage,
    }
  }, [volumes])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="flex flex-col items-center gap-3 text-muted-foreground">
          <RefreshCw className="h-8 w-8 animate-spin text-cyan-400" />
          <p className="text-sm font-semibold">Ładowanie profilu i kolekcji...</p>
        </div>
      </div>
    )
  }

  if (error || !profile) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <User className="mb-4 h-16 w-16 text-muted-foreground" />
        <h1 className="text-2xl font-bold">Nie znaleziono</h1>
        <p className="text-muted-foreground">{error || 'Użytkownik nie istnieje'}</p>
      </div>
    )
  }

  const ownedVolumes = volumes.filter((v) => v.collection?.status === 'OWNED' || v.collection?.status === 'READ')
  const readVolumes = volumes.filter((v) => v.collection?.status === 'READ')
  const wishlistVolumes = volumes.filter((v) => v.collection?.status === 'WISHLIST')
  const orderedVolumes = volumes.filter((v) => v.collection?.status === 'ORDERED')

  // Filter series based on user status
  const seriesWithOwned = seriesList.filter((s) => s.volumes.some((v) => v.status === 'OWNED' || v.status === 'READ'))
  const seriesWithRead = seriesList.filter((s) => s.volumes.some((v) => v.status === 'READ'))
  const seriesWithWishlist = seriesList.filter((s) => s.volumes.some((v) => v.status === 'WISHLIST'))

  return (
    <>
      {/* Interactive Modal for viewing friend's series and its exact volumes */}
      <UserSeriesDetailModal
        open={seriesModalOpen}
        onOpenChange={setSeriesModalOpen}
        series={selectedSeriesModal}
        username={profile.username}
        userDisplayName={profile.name}
      />

      <div className="space-y-6">
        {/* Profile header */}
        <Card className="border-white/10 bg-[#0C101D]/80 backdrop-blur-xl shadow-xl">
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
              <div className="relative h-24 w-24 flex-shrink-0">
                {profile.avatar ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={profile.avatar}
                    alt={profile.username}
                    referrerPolicy="no-referrer"
                    className="h-full w-full rounded-full object-cover border-2 border-cyan-400/40 shadow-lg shadow-cyan-500/20"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center rounded-full bg-gradient-to-tr from-cyan-950 to-purple-950 border-2 border-white/20 text-2xl font-black text-white">
                    {profile.name?.[0] || profile.username[0]?.toUpperCase()}
                  </div>
                )}
              </div>

              <div className="flex-1 space-y-2 w-full">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h1 className="text-2xl font-black tracking-tight text-white">{profile.name || profile.username}</h1>
                    <p className="text-sm font-semibold text-cyan-400">@{profile.username}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => fetchProfile(true)}
                      disabled={isRefreshing}
                      className="rounded-xl border-white/15 text-xs text-muted-foreground hover:text-white"
                      title="Odśwież dane na żywo"
                    >
                      <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${isRefreshing ? 'animate-spin text-cyan-400' : ''}`} />
                      {isRefreshing ? 'Odświeżanie...' : 'Odśwież'}
                    </Button>
                    {renderFriendButton()}
                    {currentUserId && currentUserId !== profile.id && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          window.dispatchEvent(
                            new CustomEvent('open_chat_with_user', {
                              detail: {
                                id: profile.id,
                                username: profile.username,
                                name: profile.name,
                                avatar: profile.avatar,
                              },
                            })
                          )
                        }}
                        className="rounded-xl border-cyan-500/40 bg-cyan-950/40 text-cyan-300 hover:bg-cyan-900/60 hover:text-white text-xs font-bold gap-1.5 shadow-sm"
                        title="Napisz prywatną wiadomość do tego użytkownika"
                      >
                        <MessageSquare className="h-3.5 w-3.5" />
                        Wiadomość
                      </Button>
                    )}
                  </div>
                </div>

                {profile.bio && (
                  <p className="text-xs text-muted-foreground max-w-2xl leading-relaxed">{profile.bio}</p>
                )}

                <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground pt-1 font-medium">
                  <span className="flex items-center gap-1.5 text-white font-semibold">
                    <Layers className="h-4 w-4 text-cyan-400" />
                    {seriesList.length} {seriesList.length === 1 ? 'seria' : 'serii'}
                  </span>
                  <span className="flex items-center gap-1.5 text-white font-semibold">
                    <BookOpen className="h-4 w-4 text-purple-400" />
                    {ownedVolumes.length} {ownedVolumes.length === 1 ? 'posiadany tom' : 'posiadanych tomów'}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    Dołączył {new Date(profile.createdAt).toLocaleDateString('pl-PL')}
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Stats cards */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Card className="border-white/10 bg-[#0E1424]">
            <CardContent className="pt-4 pb-4">
              <div className="text-center">
                <p className="text-2xl font-black text-cyan-300">{seriesList.length}</p>
                <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Wszystkie Serie</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-white/10 bg-[#0E1424]">
            <CardContent className="pt-4 pb-4">
              <div className="text-center">
                <p className="text-2xl font-black text-emerald-400">{ownedVolumes.length}</p>
                <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Posiadane Tomy</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-white/10 bg-[#0E1424]">
            <CardContent className="pt-4 pb-4">
              <div className="text-center">
                <p className="text-2xl font-black text-purple-400">{readVolumes.length}</p>
                <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Przeczytane</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-white/10 bg-[#0E1424]">
            <CardContent className="pt-4 pb-4">
              <div className="text-center">
                <p className="text-2xl font-black text-rose-400">{wishlistVolumes.length}</p>
                <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Chcę kupić</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Gablotka Osiągnięć i Rangi Użytkownika */}
        <BadgeShowcase
          pinnedBadges={profile.pinnedBadges || []}
          userXP={ownedVolumes.length * 50 + readVolumes.length * 100}
          isOwner={session?.user?.id === profile.id}
        />

        {/* Collection tabs */}
        <Tabs defaultValue="all">
          <TabsList className="bg-white/5 border border-white/10 p-1 rounded-2xl flex flex-wrap gap-1">
            <TabsTrigger value="all" className="rounded-xl text-xs font-bold data-[state=active]:bg-primary data-[state=active]:text-white">
              Wszystkie ({seriesList.length})
            </TabsTrigger>
            <TabsTrigger value="owned" className="rounded-xl text-xs font-bold data-[state=active]:bg-emerald-600 data-[state=active]:text-white">
              Posiadane ({seriesWithOwned.length})
            </TabsTrigger>
            <TabsTrigger value="read" className="rounded-xl text-xs font-bold data-[state=active]:bg-purple-600 data-[state=active]:text-white">
              Przeczytane ({seriesWithRead.length})
            </TabsTrigger>
            {seriesWithWishlist.length > 0 && (
              <TabsTrigger value="wishlist" className="rounded-xl text-xs font-bold data-[state=active]:bg-rose-600 data-[state=active]:text-white">
                Chcę kupić ({seriesWithWishlist.length})
              </TabsTrigger>
            )}
            <TabsTrigger
              value="compare"
              className="rounded-xl text-xs font-bold text-cyan-400 data-[state=active]:bg-cyan-500/20 data-[state=active]:text-cyan-300"
            >
              <Sparkles className="h-3.5 w-3.5 mr-1" />
              Porównaj Półki ({comparisonData.sharedSeries.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="mt-5">
            <SeriesGrid
              seriesList={seriesList}
              onSelect={(series) => {
                setSelectedSeriesModal(series)
                setSeriesModalOpen(true)
              }}
            />
          </TabsContent>

          <TabsContent value="owned" className="mt-5">
            <SeriesGrid
              seriesList={seriesWithOwned}
              onSelect={(series) => {
                setSelectedSeriesModal(series)
                setSeriesModalOpen(true)
              }}
            />
          </TabsContent>

          <TabsContent value="read" className="mt-5">
            <SeriesGrid
              seriesList={seriesWithRead}
              onSelect={(series) => {
                setSelectedSeriesModal(series)
                setSeriesModalOpen(true)
              }}
            />
          </TabsContent>

          <TabsContent value="wishlist" className="mt-5">
            <SeriesGrid
              seriesList={seriesWithWishlist}
              onSelect={(series) => {
                setSelectedSeriesModal(series)
                setSeriesModalOpen(true)
              }}
            />
          </TabsContent>

          {/* Tab: Shelf Comparison */}
          <TabsContent value="compare" className="mt-5 space-y-6">
            <div className="p-5 rounded-2xl bg-gradient-to-r from-cyan-950/40 via-purple-950/30 to-[#0B0F19] border border-cyan-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-cyan-500/20 border border-cyan-500/40 text-cyan-300 font-black text-xl shadow-lg shadow-cyan-500/20">
                  {comparisonData.matchPercentage}%
                </div>
                <div>
                  <h3 className="text-sm font-black text-white flex items-center gap-1.5">
                    <Sparkles className="h-4 w-4 text-cyan-400" />
                    Współczynnik Zgodności Gustu Mangowego
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Dzielicie {comparisonData.sharedSeries.length} wspólnych serii.{' '}
                    {comparisonData.wishlistMatches.length > 0
                      ? `${profile.name || profile.username} posiada ${comparisonData.wishlistMatches.length} tomów, których szukasz!`
                      : ''}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-cyan-300 bg-cyan-500/10 px-3 py-1.5 rounded-xl border border-cyan-500/20">
                  Wspólne serie: {comparisonData.sharedSeries.length}
                </span>
              </div>
            </div>

            {comparisonData.wishlistMatches.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Heart className="h-4 w-4 text-rose-400 fill-rose-400" />
                  <h4 className="text-sm font-black text-white">
                    Tomy, które {profile.name || profile.username} posiada, a Ty masz na Liście Życzeń ({comparisonData.wishlistMatches.length})
                  </h4>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                  {comparisonData.wishlistMatches.map((item, idx) => (
                    <div
                      key={`${item.title}-${item.volumeNumber}-${idx}`}
                      className="p-2.5 rounded-xl bg-[#0E1424] border border-rose-500/30 hover:border-rose-400 transition-all group"
                    >
                      <div className="relative aspect-[2/3] w-full overflow-hidden rounded-lg bg-black border border-white/10 mb-2">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={getCoverUrl(item.cover)}
                          alt={item.title}
                          className="h-full w-full object-cover group-hover:scale-105 transition-transform"
                        />
                        <div className="absolute top-1 right-1 bg-black/80 text-[8px] font-black text-white px-1.5 py-0.5 rounded">
                          T.{item.volumeNumber}
                        </div>
                      </div>
                      <p className="text-xs font-bold text-white truncate">{item.title}</p>
                      <p className="text-[10px] text-cyan-400 font-semibold">Tom {item.volumeNumber}</p>
                      <span className="inline-block mt-1 text-[9px] font-bold border border-rose-500/40 text-rose-300 bg-rose-500/10 px-1.5 py-0.5 rounded">
                        Chcesz kupić
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-cyan-400" />
                <h4 className="text-sm font-black text-white">
                  Wspólne Serie w Waszych Kolekcjach ({comparisonData.sharedSeries.length})
                </h4>
              </div>

              {comparisonData.sharedSeries.length === 0 ? (
                <div className="p-8 rounded-2xl bg-white/[0.02] border border-white/10 text-center text-xs text-muted-foreground">
                  Nie macie jeszcze żadnych wspólnych serii w biblioteczkach.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  {comparisonData.sharedSeries.map((series) => (
                    <div
                      key={series.title}
                      className="p-3 rounded-xl bg-[#0E1424] border border-white/10 flex items-center gap-3"
                    >
                      <div className="relative aspect-[2/3] w-12 overflow-hidden rounded-lg bg-black shrink-0 border border-white/10">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={getCoverUrl(series.cover)}
                          alt={series.title}
                          className="h-full w-full object-cover"
                        />
                      </div>
                      <div className="min-w-0 flex-1 space-y-1">
                        <p className="text-xs font-bold text-white truncate">{series.title}</p>
                        <div className="text-[10px] space-y-0.5">
                          <div className="flex justify-between text-muted-foreground">
                            <span>Twoja półka:</span>
                            <span className="font-bold text-cyan-300">{series.myCount} tomów</span>
                          </div>
                          <div className="flex justify-between text-muted-foreground">
                            <span>{profile.name || profile.username}:</span>
                            <span className="font-bold text-purple-300">{series.otherCount} tomów</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </>
  )
}

/**
 * SeriesGrid renders collection series as modern cards (matching /collection)
 * Clicking a card opens the UserSeriesDetailModal to inspect every volume!
 */
function SeriesGrid({
  seriesList,
  onSelect,
}: {
  seriesList: CollectionSeriesItem[]
  onSelect: (series: CollectionSeriesItem) => void
}) {
  if (seriesList.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center border border-white/10 rounded-2xl bg-white/[0.02]">
        <BookOpen className="mb-3 h-12 w-12 text-muted-foreground/60" />
        <p className="text-sm font-semibold text-white">Brak serii w tej kategorii</p>
        <p className="text-xs text-muted-foreground mt-1">Użytkownik nie dodał jeszcze mang do tej grupy.</p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
      {seriesList.map((series) => {
        const ownedVolumes = series.volumes.filter((v) => v.status === 'OWNED' || v.status === 'READ')
        const ownedCount = ownedVolumes.length
        const targetTotal = Math.max(series.totalVolumes || 0, series.totalVolumesJapan || 0, series.volumes.length, 1)
        const percent = Math.min(100, Math.round((ownedCount / targetTotal) * 100))

        // Prefer custom series cover, then Volume 1 custom cover, then Volume 1 cover, then series default cover
        const vol1 = series.volumes.find((v) => v.volumeNumber === 1)
        const displayCover = series.customCoverUrl || vol1?.customCoverUrl || vol1?.coverUrl || series.coverUrl

        return (
          <div
            key={series.id}
            onClick={() => onSelect(series)}
            className="group relative flex flex-col rounded-2xl bg-[#0E1424] p-2.5 border border-purple-500/30 shadow-lg shadow-purple-500/10 hover:border-cyan-400 hover:shadow-cyan-500/20 transition-all duration-300 hover:-translate-y-1 cursor-pointer"
          >
            {/* Series Cover Poster */}
            <div className="relative aspect-[2/3] w-full overflow-hidden rounded-xl bg-black border border-white/10 shadow-xl">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={getCoverUrl(displayCover)}
                alt={series.title}
                referrerPolicy="no-referrer"
                crossOrigin="anonymous"
                onError={(e) => {
                  ;(e.target as HTMLImageElement).src = getCoverUrl('')
                }}
                className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-500"
              />

              {/* Publisher Tag */}
              <div className="absolute top-2 left-2 rounded-md bg-black/80 backdrop-blur-xs px-2 py-0.5 text-[9px] font-extrabold text-cyan-300 border border-cyan-500/30 z-10">
                {series.publisher}
              </div>

              {/* User Rating Tag */}
              {series.userSeriesRating && (
                <div className="absolute top-2 right-2 rounded-md bg-black/80 backdrop-blur-xs px-1.5 py-0.5 text-[9px] font-black text-amber-400 flex items-center gap-0.5 border border-amber-500/30 z-10">
                  <Star className="h-2.5 w-2.5 fill-amber-400" />
                  {series.userSeriesRating}/10
                </div>
              )}

              {/* Progress overlay bar */}
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/95 via-black/80 to-transparent p-2 z-10">
                <div className="flex items-center justify-between text-[9px] font-bold text-white mb-1">
                  <span className="text-white/90">{ownedCount} / {targetTotal} tomów</span>
                  <span className="text-cyan-300 font-extrabold">{percent}%</span>
                </div>
                <div className="h-1.5 w-full rounded-full bg-white/20 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-purple-400 shadow-sm"
                    style={{ width: `${percent}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Title and metadata */}
            <div className="mt-2.5 space-y-0.5 min-w-0">
              <h4 className="text-xs font-black text-white truncate group-hover:text-cyan-300 transition-colors">
                {series.polishTitle || series.title}
              </h4>
              {series.polishTitle && series.polishTitle !== series.title && (
                <p className="text-[10px] text-muted-foreground truncate">
                  {series.title}
                </p>
              )}
              <div className="flex items-center justify-between pt-1 text-[10px] text-muted-foreground">
                <span className="text-emerald-400 font-semibold">{ownedCount} posiadanych</span>
                <span className="text-cyan-400/80 group-hover:text-cyan-300 font-medium">Szczegóły →</span>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
