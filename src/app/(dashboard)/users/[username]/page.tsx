'use client'

import { useState, useEffect, useMemo } from 'react'
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
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { getSavedCollection } from '@/lib/collection-store'
import { getCoverUrl } from '@/lib/cover-utils'

interface UserProfile {
  id: string
  username: string
  name: string | null
  bio: string | null
  avatar: string | null
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
  const [volumes, setVolumes] = useState<UserVolume[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [friendshipStatus, setFriendshipStatus] = useState<FriendshipStatus>('none')
  const [friendshipId, setFriendshipId] = useState<string | null>(null)
  const [addingFriend, setAddingFriend] = useState(false)

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await fetch(`/api/users/${username}`)
        if (!res.ok) {
          setError('Nie znaleziono użytkownika')
          return
        }
        const data = await res.json()
        setProfile(data.profile)
        setVolumes(data.volumes)
      } catch {
        setError('Błąd podczas ładowania profilu')
      } finally {
        setLoading(false)
      }
    }
    fetchProfile()
  }, [username])

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
          <Button variant="outline" onClick={handleRemoveFriend}>
            <UserCheck className="mr-2 h-4 w-4" />
            Znajomy
          </Button>
        )
      case 'pending_sent':
        return (
          <Button variant="outline" disabled>
            <Clock className="mr-2 h-4 w-4" />
            Wysłano zaproszenie
          </Button>
        )
      case 'pending_received':
        return (
          <Button onClick={handleAcceptFriend}>
            <UserPlus className="mr-2 h-4 w-4" />
            Zaakceptuj zaproszenie
          </Button>
        )
      default:
        return (
          <Button onClick={handleAddFriend} disabled={addingFriend}>
            <UserPlus className="mr-2 h-4 w-4" />
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
      <div className="flex items-center justify-center py-20">
        <div className="text-muted-foreground">Ładowanie...</div>
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

  const ownedVolumes = volumes.filter((v) => v.collection?.status === 'OWNED')
  const readVolumes = volumes.filter((v) => v.collection?.status === 'READ')
  const wishlistVolumes = volumes.filter((v) => v.collection?.status === 'WISHLIST')
  const orderedVolumes = volumes.filter((v) => v.collection?.status === 'ORDERED')

  return (
    <div className="space-y-6">
      {/* Profile header */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-start gap-6">
            <div className="relative h-24 w-24 flex-shrink-0">
              {profile.avatar ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={profile.avatar}
                  alt={profile.username}
                  className="h-full w-full rounded-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center rounded-full bg-muted">
                  <User className="h-12 w-12 text-muted-foreground" />
                </div>
              )}
            </div>

            <div className="flex-1 space-y-2">
              <div className="flex items-start justify-between">
                <div>
                  <h1 className="text-2xl font-bold">{profile.name || profile.username}</h1>
                  <p className="text-muted-foreground">@{profile.username}</p>
                </div>
                {renderFriendButton()}
              </div>

              {profile.bio && (
                <p className="text-sm text-muted-foreground">{profile.bio}</p>
              )}

              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <span className="flex items-center gap-1">
                  <BookOpen className="h-4 w-4" />
                  {profile._count.collections} tomów
                </span>
                <span className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  Dołączył {new Date(profile.createdAt).toLocaleDateString('pl-PL')}
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Card>
          <CardContent className="pt-4">
            <div className="text-center">
              <p className="text-2xl font-bold">{ownedVolumes.length}</p>
              <p className="text-xs text-muted-foreground">Posiadane</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-center">
              <p className="text-2xl font-bold">{readVolumes.length}</p>
              <p className="text-xs text-muted-foreground">Przeczytane</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-center">
              <p className="text-2xl font-bold">{wishlistVolumes.length}</p>
              <p className="text-xs text-muted-foreground">Chcę kupić</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-center">
              <p className="text-2xl font-bold">{orderedVolumes.length}</p>
              <p className="text-xs text-muted-foreground">Zamówione</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Collection tabs */}
      <Tabs defaultValue="owned">
        <TabsList>
          <TabsTrigger value="owned" className="flex items-center gap-1">
            Posiadane ({ownedVolumes.length})
          </TabsTrigger>
          <TabsTrigger value="read" className="flex items-center gap-1">
            Przeczytane ({readVolumes.length})
          </TabsTrigger>
          <TabsTrigger value="wishlist" className="flex items-center gap-1">
            Chcę kupić ({wishlistVolumes.length})
          </TabsTrigger>
          <TabsTrigger
            value="compare"
            className="flex items-center gap-1.5 text-cyan-400 font-bold data-[state=active]:bg-cyan-500/20 data-[state=active]:text-cyan-300"
          >
            <Sparkles className="h-3.5 w-3.5" />
            Porównaj Półki ({comparisonData.sharedSeries.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="owned" className="mt-4">
          <VolumeList volumes={ownedVolumes} />
        </TabsContent>
        <TabsContent value="read" className="mt-4">
          <VolumeList volumes={readVolumes} />
        </TabsContent>
        <TabsContent value="wishlist" className="mt-4">
          <VolumeList volumes={wishlistVolumes} />
        </TabsContent>

        {/* Tab: Shelf Comparison */}
        <TabsContent value="compare" className="mt-4 space-y-6">
          {/* Compatibility Score Banner */}
          <div className="p-4 rounded-2xl bg-gradient-to-r from-cyan-950/40 via-purple-950/30 to-[#0B0F19] border border-cyan-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-cyan-500/20 border border-cyan-500/40 text-cyan-300 font-black text-lg shadow-lg shadow-cyan-500/20">
                {comparisonData.matchPercentage}%
              </div>
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
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
              <span className="text-xs font-semibold text-cyan-400/90 bg-cyan-500/10 px-3 py-1.5 rounded-xl border border-cyan-500/20">
                Wspólne serie: {comparisonData.sharedSeries.length}
              </span>
            </div>
          </div>

          {/* Section 1: Volumes They Have That You Want */}
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

          {/* Section 2: Shared Series Overview */}
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
  )
}

function VolumeList({ volumes }: { volumes: UserVolume[] }) {
  if (volumes.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <BookOpen className="mb-4 h-12 w-12 text-muted-foreground" />
        <p className="text-muted-foreground">Brak tomów</p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6">
      {volumes.map((volume) => (
        <div key={volume.id} className="group relative">
          <div className="relative aspect-[2/3] w-full overflow-hidden rounded-lg">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={
                volume.customCoverUrl ||
                volume.manga.customCoverUrl ||
                volume.coverImage ||
                volume.manga.defaultCover ||
                ''
              }
              alt={`${volume.manga.title} tom ${volume.volumeNumber}`}
              className="h-full w-full object-cover"
            />
            {volume.collection?.userRating && (
              <div className="absolute top-2 right-2 flex items-center gap-0.5 rounded bg-black/70 px-1.5 py-0.5 text-xs text-white">
                <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                {volume.collection.userRating}
              </div>
            )}
          </div>
          <p className="mt-1 text-xs font-medium leading-tight text-muted-foreground line-clamp-2">
            {volume.manga.title}
          </p>
          <p className="text-xs text-muted-foreground">Tom {volume.volumeNumber}</p>
        </div>
      ))}
    </div>
  )
}
