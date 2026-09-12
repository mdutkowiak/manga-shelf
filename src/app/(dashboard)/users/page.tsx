'use client'

import { useState } from 'react'
import { Search, User, BookOpen } from 'lucide-react'
import Link from 'next/link'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'

interface SearchResult {
  id: string
  username: string
  name: string | null
  avatar: string | null
  bio: string | null
  _count: {
    collections: number
  }
}

export default function UsersPage() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [searching, setSearching] = useState(false)
  const [searched, setSearched] = useState(false)

  const handleSearch = async () => {
    if (!query.trim()) return
    setSearching(true)
    setSearched(true)

    try {
      const res = await fetch(`/api/users/search?q=${encodeURIComponent(query)}`)
      if (res.ok) {
        const data = await res.json()
        setResults(data.users)
      }
    } catch (error) {
      console.error('Search error:', error)
    } finally {
      setSearching(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Szukaj użytkowników</h1>
        <p className="text-muted-foreground">Znajdź innych kolekcjonerów manga</p>
      </div>

      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Nazwa użytkownika..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            className="pl-9"
          />
        </div>
        <button
          onClick={handleSearch}
          disabled={searching}
          className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
        >
          {searching ? 'Szukanie...' : 'Szukaj'}
        </button>
      </div>

      {results.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {results.map((user) => (
            <Link key={user.id} href={`/users/${user.username}`}>
              <Card className="transition-colors hover:bg-muted/50">
                <CardContent className="pt-4">
                  <div className="flex items-start gap-4">
                    <div className="relative h-16 w-16 flex-shrink-0">
                      {user.avatar ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={user.avatar}
                          alt={user.username}
                          className="h-full w-full rounded-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center rounded-full bg-muted">
                          <User className="h-8 w-8 text-muted-foreground" />
                        </div>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="font-medium">{user.name || user.username}</p>
                      <p className="text-sm text-muted-foreground">@{user.username}</p>
                      {user.bio && (
                        <p className="mt-1 text-sm text-muted-foreground line-clamp-2">{user.bio}</p>
                      )}
                      <p className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
                        <BookOpen className="h-3 w-3" />
                        {user._count.collections} tomów w kolekcji
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      ) : searched && !searching ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <User className="mb-4 h-12 w-12 text-muted-foreground" />
          <p className="text-lg font-medium">Nie znaleziono</p>
          <p className="text-sm text-muted-foreground">Spróbuj innej frazy</p>
        </div>
      ) : !searched ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <User className="mb-4 h-12 w-12 text-muted-foreground" />
          <p className="text-lg font-medium">Wyszukaj użytkownika</p>
          <p className="text-sm text-muted-foreground">Wpisz nazwę użytkownika, aby znaleźć jego profil</p>
        </div>
      ) : null}
    </div>
  )
}
