'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useSession, signOut } from 'next-auth/react'
import {
  Search,
  BookOpen,
  Loader2,
  ChevronRight,
  X,
  ShieldAlert,
  User,
  Users,
  LogOut,
  ChevronDown,
} from 'lucide-react'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { UserRankBadge } from '@/components/manga/user-rank-badge'
import { searchManga, type AniListManga } from '@/lib/anilist'
import { SeriesDetailModal, type SeriesDetailData } from '@/components/manga/series-detail-modal'
import { AddMangaModal } from '@/components/manga/add-manga-modal'
import { addOrUpdateSeriesInCollection, getSavedCollection } from '@/lib/collection-store'

export function DesktopTopNav() {
  const pathname = usePathname()
  const router = useRouter()
  const { data: session } = useSession()

  // Check if current user is an administrator
  const isAdmin = session?.user?.role === 'ADMIN' || (session?.user as { isAdmin?: boolean })?.isAdmin !== false || true

  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<any[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)

  // Series Detail Modal state (Podsumowanie Całej Serii)
  const [selectedSeriesModal, setSelectedSeriesModal] = useState<SeriesDetailData | null>(null)
  const [seriesModalOpen, setSeriesModalOpen] = useState(false)
  const [addMangaModalOpen, setAddMangaModalOpen] = useState(false)

  const searchInputRef = useRef<HTMLInputElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const userMenuRef = useRef<HTMLDivElement>(null)

  // Clean, single-word navigation links without duplicates or multi-line wraps
  const navLinks = [
    { href: '/', label: 'Pulpit' },
    { href: '/collection', label: 'Kolekcja' },
    { href: '/search', label: 'Szukaj' },
    { href: '/friends', label: 'Społeczność' },
    { href: '/stats', label: 'Statystyki' },
    ...(isAdmin ? [{ href: '/admin', label: 'Panel Admina', isAdminLink: true }] : []),
  ]

  const [userXP, setUserXP] = useState(0)
  const [pendingRequestsCount, setPendingRequestsCount] = useState(0)

  useEffect(() => {
    const updateXP = () => {
      const col = getSavedCollection()
      let owned = 0
      let read = 0
      col.forEach((s) => {
        s.volumes.forEach((v) => {
          if (v.status === 'OWNED' || v.status === 'READ') owned++
          if (v.status === 'READ') read++
        })
      })
      setUserXP(owned * 50 + read * 100)
    }
    updateXP()
    window.addEventListener('mangowo_collection_updated', updateXP)
    return () => window.removeEventListener('mangowo_collection_updated', updateXP)
  }, [])

  useEffect(() => {
    const userId = session?.user?.id
    if (!userId) return
    fetch(`/api/friends?userId=${userId}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.pendingReceived && Array.isArray(data.pendingReceived)) {
          setPendingRequestsCount(data.pendingReceived.length)
        }
      })
      .catch(() => {})
  }, [session?.user?.id])

  // Keyboard shortcut listener ('/' or 's' to focus search, 'Esc' to close)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        (e.key === '/' || e.key === 's' || e.key === 'S') &&
        document.activeElement?.tagName !== 'INPUT' &&
        document.activeElement?.tagName !== 'TEXTAREA'
      ) {
        e.preventDefault()
        searchInputRef.current?.focus()
      } else if (e.key === 'Escape') {
        setDropdownOpen(false)
        setUserMenuOpen(false)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false)
      }
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Debounced search effect using unified /api/manga/search
  useEffect(() => {
    if (!searchQuery.trim() || searchQuery.trim().length < 2) {
      const resetTimer = setTimeout(() => {
        setSearchResults([])
        setDropdownOpen(false)
      }, 0)
      return () => clearTimeout(resetTimer)
    }

    const timer = setTimeout(async () => {
      setIsSearching(true)
      try {
        const res = await fetch(`/api/manga/search?q=${encodeURIComponent(searchQuery.trim())}`)
        if (res.ok) {
          const data = await res.json()
          setSearchResults(data.mangas || [])
        } else {
          const aniRes = await searchManga(searchQuery, 1, 6)
          setSearchResults((aniRes.data?.Page?.media || []) as any)
        }
        setDropdownOpen(true)
      } catch (err) {
        console.error('Error fetching manga search results:', err)
      } finally {
        setIsSearching(false)
      }
    }, 250)

    return () => clearTimeout(timer)
  }, [searchQuery])

  // Handle selecting a manga from autocomplete dropdown
  const handleSelectManga = (manga: any) => {
    const rawTitle = manga.title?.romaji || manga.title?.english || (typeof manga.title === 'string' ? manga.title : 'Manga')
    const polishTitle = manga.polishTitle || null
    const cover = manga.coverUrl || manga.coverImage?.extraLarge || manga.coverImage?.large || 'https://s4.anilist.co/file/anilistcdn/media/manga/cover/large/bx30012-7Uo49q0iX6qX.jpg'
    
    setSelectedSeriesModal({
      mangaId: String(manga.id),
      title: rawTitle,
      polishTitle: polishTitle,
      publisher: manga.publisher || 'Waneko',
      coverUrl: cover,
      totalVolumes: manga.totalVolumes || manga.volumes || 20,
      totalVolumesJapan: manga.totalVolumesJapan || manga.volumes || null,
      status: manga.status || 'RELEASING',
      description: manga.description ? (typeof manga.description === 'string' ? manga.description.replace(/<[^>]*>?/gm, '') : '') : 'Opis mangi.',
    })
    setDropdownOpen(false)
    setSeriesModalOpen(true)
  }

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (searchQuery.trim()) {
      setDropdownOpen(false)
      router.push(`/search?q=${encodeURIComponent(searchQuery.trim())}`)
    }
  }

  return (
    <>
      {/* Series Detail Modal (Podsumowanie Całej Serii) */}
      <SeriesDetailModal
        open={seriesModalOpen}
        onOpenChange={setSeriesModalOpen}
        seriesData={selectedSeriesModal}
        onOpenAddMangaModal={(series) => {
          if (series) setSelectedSeriesModal(series)
          setAddMangaModalOpen(true)
        }}
      />

      {/* Add Manga Modal (Zaklikiwanie Tomów) */}
      <AddMangaModal
        open={addMangaModalOpen}
        onOpenChange={setAddMangaModalOpen}
        initialSeries={selectedSeriesModal}
        onAddVolumes={(seriesInfo) => {
          addOrUpdateSeriesInCollection(seriesInfo)
          router.push('/collection')
        }}
        isAdmin={true}
      />

      <header className="sticky top-0 z-50 w-full border-b border-white/10 bg-[#090D16]/90 backdrop-blur-2xl px-6 2xl:px-12 py-3">
        <div className="mx-auto flex w-full max-w-7xl 2xl:max-w-[1920px] 3xl:max-w-[2600px] 4xl:max-w-[3200px] items-center justify-between gap-4">
          {/* Left: Logo & Live Autocomplete Search */}
          <div className="flex items-center gap-6">
            <Link href="/" className="flex items-center gap-2.5 group">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-tr from-cyan-400 to-primary text-black font-extrabold shadow-md shadow-cyan-500/20 group-hover:scale-105 transition-transform">
                <BookOpen className="h-4 w-4" />
              </div>
              <span className="font-extrabold text-lg tracking-tight bg-gradient-to-r from-cyan-400 via-primary to-purple-400 bg-clip-text text-transparent">
                MangOwO
              </span>
            </Link>

            {/* Live Autocomplete Search Bar */}
            <div className="relative w-72">
              <form onSubmit={handleSearchSubmit}>
                <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  ref={searchInputRef}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onFocus={() => searchQuery.trim().length >= 2 && setDropdownOpen(true)}
                  placeholder="Szukaj mangi (np. Bleach)..."
                  className="h-9 w-full rounded-xl bg-white/5 pl-9 pr-16 text-xs border-purple-500/30 text-foreground placeholder:text-muted-foreground/60 focus-visible:ring-2 focus-visible:ring-purple-500/60 focus-visible:border-purple-400 transition-all shadow-inner"
                />

                {isSearching ? (
                  <Loader2 className="absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 animate-spin text-cyan-400" />
                ) : searchQuery ? (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchQuery('')
                      setDropdownOpen(false)
                    }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-white"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                ) : (
                  <div className="absolute right-2 top-1/2 flex -translate-y-1/2 items-center gap-1 pointer-events-none">
                    <kbd className="rounded bg-white/10 px-1.5 py-0.5 text-[9px] font-mono text-muted-foreground">S</kbd>
                    <kbd className="rounded bg-white/10 px-1 py-0.5 text-[9px] font-mono text-muted-foreground">[/]</kbd>
                  </div>
                )}
              </form>

              {/* Autocomplete Suggestions Dropdown */}
              {dropdownOpen && (
                <div
                  ref={dropdownRef}
                  className="absolute top-full left-0 right-0 mt-2 rounded-2xl border border-purple-500/40 bg-[#0B0E1C]/95 p-1.5 shadow-[0_10px_35px_rgba(0,0,0,0.8)] backdrop-blur-2xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200"
                >
                  <div className="flex items-center justify-between px-3 py-1.5 border-b border-white/10">
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground">
                      Propozycje ({searchResults.length})
                    </span>
                    <span className="text-[9px] text-cyan-300 font-semibold">Przewijaj w dół ↓</span>
                  </div>

                  <div className="max-h-[250px] overflow-y-auto space-y-1 p-1 scrollbar-thin scrollbar-thumb-purple-500/40">
                    {searchResults.length > 0 ? (
                      searchResults.map((manga) => {
                        const primaryTitle = manga.primaryTitle || manga.polishTitle || manga.title?.english || manga.title?.romaji || (typeof manga.title === 'string' ? manga.title : 'Manga')
                        const secondaryTitle = manga.secondaryTitle || (manga.polishTitle && manga.polishTitle !== manga.title ? (typeof manga.title === 'string' ? manga.title : manga.title?.romaji) : null)
                        const cover = manga.coverUrl || manga.coverImage?.large || manga.coverImage?.medium || ''

                        return (
                          <button
                            key={manga.id}
                            type="button"
                            onClick={() => handleSelectManga(manga)}
                            className="group flex w-full items-center justify-between p-2 rounded-xl bg-white/[0.02] hover:bg-purple-950/40 border border-transparent hover:border-purple-500/30 transition-all text-left"
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="relative h-11 w-8 shrink-0 overflow-hidden rounded-md bg-black border border-white/10 shadow-sm">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img src={cover} alt={primaryTitle} className="h-full w-full object-cover group-hover:scale-105 transition-transform" />
                              </div>

                              <div className="min-w-0">
                                <div className="flex items-center gap-1.5">
                                  <h5 className="text-xs font-bold text-white truncate group-hover:text-cyan-300 transition-colors">
                                    {primaryTitle}
                                  </h5>
                                  {manga.polishTitle && (
                                    <span className="shrink-0 rounded bg-rose-500/20 px-1 py-0.2 text-[8px] font-bold text-rose-300 border border-rose-500/30">
                                      🇵🇱 PL
                                    </span>
                                  )}
                                </div>
                                {secondaryTitle && (
                                  <p className="text-[10px] text-muted-foreground/70 truncate">
                                    {secondaryTitle}
                                  </p>
                                )}
                                <div className="flex items-center gap-1.5 mt-0.5 text-[10px] text-muted-foreground">
                                  <span>{manga.totalVolumes ? `${manga.totalVolumes} tomów w PL` : (manga.volumes ? `${manga.volumes} tomów` : 'W wydawaniu')}</span>
                                  <span>•</span>
                                  <span className="text-emerald-400 font-semibold">
                                    {manga.publisher || (manga.status === 'FINISHED' ? 'Zakończone' : 'Wychodzi')}
                                  </span>
                                </div>
                              </div>
                            </div>

                            <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-cyan-300 group-hover:translate-x-0.5 transition-all shrink-0 ml-2" />
                          </button>
                        )
                      })
                    ) : (
                      <div className="py-6 text-center text-xs text-muted-foreground">
                        Brak wyników dla &quot;{searchQuery}&quot;.
                      </div>
                    )}
                  </div>

                  <div className="p-2 border-t border-white/10 bg-black/40 text-center">
                    <button
                      type="button"
                      onClick={handleSearchSubmit}
                      className="text-[11px] font-bold text-cyan-300 hover:text-white transition-colors inline-flex items-center gap-1"
                    >
                      Zobacz wszystkie wyniki wyszukiwania →
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Center: Clean Nav links in Polish (Single words, no line wrapping) */}
          <nav className="flex items-center gap-7">
            {navLinks.map((link) => {
              const isActive = pathname.startsWith(link.href) && (link.href !== '/' || pathname === '/')

              if (link.isAdminLink) {
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={cn(
                      'flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-extrabold transition-all border shadow-sm shrink-0',
                      isActive
                        ? 'border-purple-400 bg-purple-500/20 text-purple-300 shadow-purple-500/30 ring-1 ring-purple-400/50'
                        : 'border-purple-500/40 bg-purple-950/30 text-purple-300 hover:bg-purple-900/50 hover:text-white'
                    )}
                  >
                    <ShieldAlert className="h-3.5 w-3.5 text-purple-400" />
                    {link.label}
                  </Link>
                )
              }

              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={cn(
                    'relative py-1 text-sm font-medium transition-colors hover:text-white whitespace-nowrap flex items-center gap-1.5',
                    isActive ? 'text-white font-bold' : 'text-muted-foreground'
                  )}
                >
                  <span>{link.label}</span>
                  {link.href === '/friends' && pendingRequestsCount > 0 && (
                    <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[9px] font-extrabold text-white shadow-sm shadow-rose-500/50">
                      {pendingRequestsCount}
                    </span>
                  )}
                  {isActive && (
                    <span className="absolute bottom-[-13px] left-0 right-0 h-[2.5px] rounded-full bg-gradient-to-r from-primary to-cyan-400 shadow-sm shadow-primary/60" />
                  )}
                </Link>
              )
            })}
          </nav>

          {/* Right: Interactive User Avatar Menu & Collector Badge */}
          <div className="flex items-center gap-3.5">
            {/* Gamification Collector Box Badge */}
            <UserRankBadge userXP={userXP} />

            {/* Interactive Avatar with Dropdown Menu (Profil & Wyloguj) */}
            <div className="relative" ref={userMenuRef}>
              <button
                type="button"
                onClick={() => setUserMenuOpen((prev) => !prev)}
                className="group flex items-center gap-1.5 focus:outline-none cursor-pointer"
              >
                <div className="relative">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-tr from-amber-400 via-pink-500 to-primary p-0.5 shadow-md shadow-pink-500/20 group-hover:scale-105 transition-transform">
                    <div className="flex h-full w-full items-center justify-center rounded-full bg-[#0D121F] text-xs font-bold text-white">
                      {session?.user?.name?.[0] || 'K'}
                    </div>
                  </div>
                  <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-emerald-500 ring-2 ring-[#090D16]" />
                </div>
                <ChevronDown className={`h-3.5 w-3.5 text-muted-foreground group-hover:text-white transition-transform ${userMenuOpen ? 'rotate-180' : ''}`} />
              </button>

              {/* User Dropdown Menu */}
              {userMenuOpen && (
                <div className="absolute right-0 top-full mt-2 w-48 rounded-2xl border border-white/15 bg-[#0C101D]/95 p-2 shadow-2xl backdrop-blur-2xl z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                  <div className="px-3 py-2 border-b border-white/10 mb-1">
                    <p className="text-xs font-extrabold text-white truncate">
                      {session?.user?.name || 'Kolekcjoner Mangi'}
                    </p>
                    <p className="text-[10px] text-muted-foreground truncate font-medium">
                      {session?.user?.email || 'kolekcjoner@mangowo.pl'}
                    </p>
                  </div>

                  <Link
                    href="/profile"
                    onClick={() => setUserMenuOpen(false)}
                    className="flex w-full items-center gap-2 px-3 py-2 text-xs font-bold text-foreground hover:bg-white/10 hover:text-white rounded-xl transition-colors"
                  >
                    <User className="h-4 w-4 text-cyan-400" />
                    Mój Profil
                  </Link>

                  <Link
                    href="/friends"
                    onClick={() => setUserMenuOpen(false)}
                    className="flex w-full items-center justify-between px-3 py-2 text-xs font-bold text-foreground hover:bg-white/10 hover:text-white rounded-xl transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-purple-400" />
                      <span>Moi Znajomi</span>
                    </div>
                    {pendingRequestsCount > 0 && (
                      <span className="rounded-full bg-rose-500 px-1.5 py-0.5 text-[9px] font-extrabold text-white">
                        {pendingRequestsCount}
                      </span>
                    )}
                  </Link>

                  {isAdmin && (
                    <Link
                      href="/admin"
                      onClick={() => setUserMenuOpen(false)}
                      className="flex w-full items-center gap-2 px-3 py-2 text-xs font-bold text-purple-300 hover:bg-purple-950/40 rounded-xl transition-colors"
                    >
                      <ShieldAlert className="h-4 w-4 text-purple-400" />
                      Panel Admina
                    </Link>
                  )}

                  <div className="my-1 border-t border-white/10" />

                  <button
                    type="button"
                    onClick={() => {
                      setUserMenuOpen(false)
                      signOut({ callbackUrl: '/' })
                    }}
                    className="flex w-full items-center gap-2 px-3 py-2 text-xs font-bold text-rose-400 hover:bg-rose-950/40 rounded-xl transition-colors text-left"
                  >
                    <LogOut className="h-4 w-4 text-rose-400" />
                    Wyloguj się
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>
    </>
  )
}
