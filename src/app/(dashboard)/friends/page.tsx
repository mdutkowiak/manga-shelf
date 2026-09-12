'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { UserPlus, UserCheck, UserX, Search, Users, BookOpen, Loader2 } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'

interface Friend {
  friendshipId: string
  id: string
  username: string
  name: string | null
  avatar: string | null
  bio?: string | null
  _count: {
    collections: number
  }
}

interface UserSearchResult {
  id: string
  username: string
  name: string | null
  avatar: string | null
  bio?: string | null
  _count?: {
    collections: number
  }
}

export default function FriendsPage() {
  const { data: session } = useSession()
  const userId = (session?.user as { id?: string })?.id

  const [friends, setFriends] = useState<Friend[]>([])
  const [pendingReceived, setPendingReceived] = useState<Friend[]>([])
  const [pendingSent, setPendingSent] = useState<Friend[]>([])
  const [loading, setLoading] = useState(true)

  // Search
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<UserSearchResult[]>([])
  const [searching, setSearching] = useState(false)

  const fetchFriends = useCallback(async () => {
    if (!userId) return
    try {
      const res = await fetch(`/api/friends?userId=${userId}`)
      if (res.ok) {
        const data = await res.json()
        setFriends(data.friends)
        setPendingReceived(data.pendingReceived)
        setPendingSent(data.pendingSent)
      }
    } catch (error) {
      console.error('Fetch friends error:', error)
    } finally {
      setLoading(false)
    }
  }, [userId])

  useEffect(() => {
    if (!userId) return
    const timer = setTimeout(() => {
      fetchFriends()
    }, 0)
    return () => clearTimeout(timer)
  }, [userId, fetchFriends])

  const handleAddFriend = async (addresseeId: string) => {
    try {
      const res = await fetch('/api/friends', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requesterId: userId, addresseeId }),
      })

      if (res.ok) {
        fetchFriends()
        setSearchResults([])
        setSearchQuery('')
      }
    } catch (error) {
      console.error('Add friend error:', error)
    }
  }

  const handleAccept = async (friendshipId: string) => {
    try {
      await fetch('/api/friends', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ friendshipId, action: 'accept' }),
      })
      fetchFriends()
    } catch (error) {
      console.error('Accept error:', error)
    }
  }

  const handleReject = async (friendshipId: string) => {
    try {
      await fetch('/api/friends', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ friendshipId, action: 'reject' }),
      })
      fetchFriends()
    } catch (error) {
      console.error('Reject error:', error)
    }
  }

  const handleRemove = async (friendshipId: string) => {
    try {
      await fetch(`/api/friends?id=${friendshipId}`, { method: 'DELETE' })
      fetchFriends()
    } catch (error) {
      console.error('Remove error:', error)
    }
  }

  const handleSearch = async () => {
    if (!searchQuery.trim()) return
    setSearching(true)
    try {
      const res = await fetch(`/api/users/search?q=${encodeURIComponent(searchQuery)}`)
      if (res.ok) {
        const data = await res.json()
        // Filtruj siebie i obecnych znajomych
        const friendIds = friends.map((f) => f.id)
        const filtered = data.users.filter(
          (u: UserSearchResult) => u.id !== userId && !friendIds.includes(u.id)
        )
        setSearchResults(filtered)
      }
    } catch (error) {
      console.error('Search error:', error)
    } finally {
      setSearching(false)
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-xs text-muted-foreground mt-2">Ładowanie listy znajomych...</p>
      </div>
    )
  }

  if (!userId) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Users className="mb-4 h-12 w-12 text-muted-foreground" />
        <p className="text-muted-foreground">Zaloguj się, aby zobaczyć znajomych</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Znajomi</h1>
        <p className="text-muted-foreground">Zarządzaj swoimi znajomymi</p>
      </div>

      <Tabs defaultValue="friends">
        <TabsList>
          <TabsTrigger value="friends" className="flex items-center gap-1">
            <Users className="h-4 w-4" />
            Znajomi ({friends.length})
          </TabsTrigger>
          <TabsTrigger value="received" className="flex items-center gap-1">
            <UserPlus className="h-4 w-4" />
            Otrzymane ({pendingReceived.length})
          </TabsTrigger>
          <TabsTrigger value="sent" className="flex items-center gap-1">
            <UserCheck className="h-4 w-4" />
            Wysłane ({pendingSent.length})
          </TabsTrigger>
          <TabsTrigger value="search" className="flex items-center gap-1">
            <Search className="h-4 w-4" />
            Szukaj
          </TabsTrigger>
        </TabsList>

        {/* Lista znajomych */}
        <TabsContent value="friends" className="mt-4">
          {friends.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Users className="mb-4 h-12 w-12 text-muted-foreground" />
              <p className="text-lg font-medium">Brak znajomych</p>
              <p className="text-sm text-muted-foreground">Dodaj znajomych, aby widzieć ich kolekcje</p>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {friends.map((friend) => (
                <Card key={friend.id}>
                  <CardContent className="pt-4">
                    <div className="flex items-start gap-4">
                      <Link href={`/users/${friend.username}`}>
                        <div className="relative h-16 w-16 flex-shrink-0">
                          {friend.avatar ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={friend.avatar}
                              alt={friend.username}
                              className="h-full w-full rounded-full object-cover"
                            />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center rounded-full bg-muted">
                              <span className="text-xl font-bold text-muted-foreground">
                                {friend.username[0].toUpperCase()}
                              </span>
                            </div>
                          )}
                        </div>
                      </Link>

                      <div className="flex-1 min-w-0">
                        <Link href={`/users/${friend.username}`} className="hover:underline">
                          <p className="font-medium text-white">{friend.name || friend.username}</p>
                        </Link>
                        <p className="text-sm text-cyan-400">@{friend.username}</p>
                        {friend.bio && (
                          <p className="text-xs text-muted-foreground line-clamp-1 italic mt-0.5">&ldquo;{friend.bio}&rdquo;</p>
                        )}
                        <p className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                          <BookOpen className="h-3 w-3" />
                          {friend._count.collections} tomów
                        </p>
                      </div>

                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => handleRemove(friend.friendshipId)}
                        className="text-destructive"
                      >
                        <UserX className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Otrzymane zaproszenia */}
        <TabsContent value="received" className="mt-4">
          {pendingReceived.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <UserPlus className="mb-4 h-12 w-12 text-muted-foreground" />
              <p className="text-lg font-medium">Brak otrzymanych zaproszeń</p>
            </div>
          ) : (
            <div className="space-y-3">
              {pendingReceived.map((friend) => (
                <Card key={friend.id}>
                  <CardContent className="pt-4">
                    <div className="flex items-center gap-4">
                      <Link href={`/users/${friend.username}`}>
                        <div className="relative h-12 w-12 flex-shrink-0">
                          {friend.avatar ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={friend.avatar}
                              alt={friend.username}
                              className="h-full w-full rounded-full object-cover"
                            />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center rounded-full bg-muted">
                              <span className="font-bold text-muted-foreground">
                                {friend.username[0].toUpperCase()}
                              </span>
                            </div>
                          )}
                        </div>
                      </Link>

                      <div className="flex-1">
                        <p className="font-medium">{friend.name || friend.username}</p>
                        <p className="text-sm text-muted-foreground">@{friend.username}</p>
                      </div>

                      <div className="flex gap-2">
                        <Button size="sm" onClick={() => handleAccept(friend.friendshipId)}>
                          <UserCheck className="mr-1 h-4 w-4" />
                          Akceptuj
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleReject(friend.friendshipId)}
                        >
                          <UserX className="mr-1 h-4 w-4" />
                          Odrzuć
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Wysłane zaproszenia */}
        <TabsContent value="sent" className="mt-4">
          {pendingSent.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <UserCheck className="mb-4 h-12 w-12 text-muted-foreground" />
              <p className="text-lg font-medium">Brak wysłanych zaproszeń</p>
            </div>
          ) : (
            <div className="space-y-3">
              {pendingSent.map((friend) => (
                <Card key={friend.id}>
                  <CardContent className="pt-4">
                    <div className="flex items-center gap-4">
                      <div className="relative h-12 w-12 flex-shrink-0">
                        {friend.avatar ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={friend.avatar}
                            alt={friend.username}
                            className="h-full w-full rounded-full object-cover"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center rounded-full bg-muted">
                            <span className="font-bold text-muted-foreground">
                              {friend.username[0].toUpperCase()}
                            </span>
                          </div>
                        )}
                      </div>

                      <div className="flex-1">
                        <p className="font-medium">{friend.name || friend.username}</p>
                        <p className="text-sm text-muted-foreground">@{friend.username}</p>
                      </div>

                      <Badge variant="secondary">Oczekuje</Badge>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Szukaj */}
        <TabsContent value="search" className="mt-4">
          <div className="space-y-4">
            <div className="flex gap-2">
              <Input
                placeholder="Szukaj użytkownika..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              />
              <Button onClick={handleSearch} disabled={searching}>
                <Search className="h-4 w-4" />
              </Button>
            </div>

            {searchResults.length > 0 ? (
              <div className="space-y-3">
                {searchResults.map((user) => (
                  <Card key={user.id}>
                    <CardContent className="pt-4">
                      <div className="flex items-center gap-4">
                        <Link href={`/users/${user.username}`}>
                          <div className="relative h-12 w-12 flex-shrink-0">
                            {user.avatar ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={user.avatar}
                                alt={user.username}
                                className="h-full w-full rounded-full object-cover"
                              />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center rounded-full bg-muted">
                                <span className="font-bold text-muted-foreground">
                                  {user.username[0].toUpperCase()}
                                </span>
                              </div>
                            )}
                          </div>
                        </Link>

                        <div className="flex-1">
                          <p className="font-medium text-white">{user.name || user.username}</p>
                          <p className="text-sm text-cyan-400">@{user.username}</p>
                          {user.bio && (
                            <p className="text-xs text-muted-foreground line-clamp-1 italic mt-0.5">&ldquo;{user.bio}&rdquo;</p>
                          )}
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {user._count?.collections ?? 0} tomów
                          </p>
                        </div>

                        <Button size="sm" onClick={() => handleAddFriend(user.id)}>
                          <UserPlus className="mr-1 h-4 w-4" />
                          Dodaj
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : searchQuery && !searching ? (
              <p className="text-center text-muted-foreground">Nie znaleziono użytkowników</p>
            ) : null}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
