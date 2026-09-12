'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Plus, Search, Edit, Sparkles, Bookmark } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  getAdminMangaOverrides,
  getAdminCustomReleases,
  getAdminEditedReleases,
  getEffectiveVolumeCover,
} from '@/lib/admin-store'
import { getSavedCollection, normalizeTitleKey } from '@/lib/collection-store'
import { getCoverUrl } from '@/lib/cover-utils'

interface ManagedMangaItem {
  id: string
  title: string
  polishTitle?: string
  publisherName: string
  statusInPoland: 'ONGOING' | 'FINISHED' | 'CANCELLED' | 'HIATUS'
  volumesCount: number
  totalVolumesJapan?: number | null
  coverUrl: string
  inUserCollection: boolean
  hasAdminEdits: boolean
}

const basePopularMangas: ManagedMangaItem[] = [
  {
    id: '117195',
    title: 'Oshi no Ko',
    polishTitle: 'Oshi no Ko',
    statusInPoland: 'FINISHED',
    publisherName: 'Studio JG',
    volumesCount: 16,
    totalVolumesJapan: 16,
    coverUrl: 'https://s4.anilist.co/file/anilistcdn/media/manga/cover/large/bx117195-2s5b3n4pZ9Ea.jpg',
    inUserCollection: true,
    hasAdminEdits: true,
  },
  {
    id: '1',
    title: 'Attack on Titan',
    polishTitle: 'Atak Tytanów',
    statusInPoland: 'FINISHED',
    publisherName: 'Waneko',
    volumesCount: 34,
    totalVolumesJapan: 34,
    coverUrl: 'https://uploads.mangadex.org/covers/304ceac3-8cd8-4571-8e6b-d88e0e64f9f2/87e83df4-6d9b-4ffc-a33d-7d8b52f1e679.512.jpg',
    inUserCollection: true,
    hasAdminEdits: false,
  },
  {
    id: '2',
    title: 'One Piece',
    polishTitle: 'One Piece',
    statusInPoland: 'ONGOING',
    publisherName: 'Waneko',
    volumesCount: 108,
    totalVolumesJapan: 115,
    coverUrl: 'https://uploads.mangadex.org/covers/a2c1d849-a169-4abf-9f4c-59b192f0779f/c6d05f33-14b3-46fb-9276-35b888ed45a5.512.jpg',
    inUserCollection: true,
    hasAdminEdits: false,
  },
  {
    id: '3',
    title: 'Chainsaw Man',
    polishTitle: 'Chainsaw Man',
    statusInPoland: 'ONGOING',
    publisherName: 'Studio JG',
    volumesCount: 16,
    totalVolumesJapan: 24,
    coverUrl: 'https://uploads.mangadex.org/covers/a7774285-d604-4863-9560-b9f5e040f7b1/5c5c1653-559d-4c3e-8628-98e37452d3a3.512.jpg',
    inUserCollection: true,
    hasAdminEdits: true,
  },
  {
    id: '101517',
    title: 'Jujutsu Kaisen',
    polishTitle: 'Jujutsu Kaisen',
    statusInPoland: 'ONGOING',
    publisherName: 'Waneko',
    volumesCount: 27,
    totalVolumesJapan: 30,
    coverUrl: 'https://uploads.mangadex.org/covers/c52b704d-ee54-4f81-a67b-1d70e1762c2f/ec649c0d-c0eb-433b-a567-5d51829e504c.512.jpg',
    inUserCollection: true,
    hasAdminEdits: false,
  },
  {
    id: '30012',
    title: 'Bleach',
    polishTitle: 'Bleach',
    statusInPoland: 'FINISHED',
    publisherName: 'J.P.Fantastica',
    volumesCount: 74,
    totalVolumesJapan: 74,
    coverUrl: 'https://uploads.mangadex.org/covers/b0b70a04-5853-4f9e-b9b5-776735e5d36e/a2c13d7d-2b4a-4e63-8a39-5a5ef524b07e.512.jpg',
    inUserCollection: true,
    hasAdminEdits: false,
  },
  {
    id: '118586',
    title: 'Frieren: Beyond Journey\'s End',
    polishTitle: 'Frieren. U kresu drogi',
    statusInPoland: 'ONGOING',
    publisherName: 'Studio JG',
    volumesCount: 13,
    coverUrl: 'https://s4.anilist.co/file/anilistcdn/media/manga/cover/large/bx118586-kXFpB7n16k5A.jpg',
    inUserCollection: true,
    hasAdminEdits: false,
  },
  {
    id: '125862',
    title: 'Sakamoto Days',
    polishTitle: 'Sakamoto Days',
    statusInPoland: 'ONGOING',
    publisherName: 'Waneko',
    volumesCount: 18,
    coverUrl: 'https://s4.anilist.co/file/anilistcdn/media/manga/cover/large/bx125862-2G9pU4F3xW6d.jpg',
    inUserCollection: true,
    hasAdminEdits: false,
  },
]

export default function AdminMangaPage() {
  const [search, setSearch] = useState('')
  const [mangas, setMangas] = useState<ManagedMangaItem[]>([])

  const loadManagedMangas = () => {
    // 1. Get user collection series
    const userCollection = getSavedCollection()
    const userSeriesKeys = new Set(userCollection.map((s) => normalizeTitleKey(s.title) || s.mangaId))

    // 2. Get admin manga overrides
    const overrides = getAdminMangaOverrides()

    // 3. Get admin custom releases & edited releases
    const customReleases = getAdminCustomReleases()
    const editedReleases = getAdminEditedReleases()

    // Create dynamic map keyed by normalized title or mangaId
    const mangaMap = new Map<string, ManagedMangaItem>()

    // Helper to add/update entry in map
    const addOrUpdate = (
      id: string,
      title: string,
      polishTitle: string | undefined,
      publisherName: string,
      statusInPoland: 'ONGOING' | 'FINISHED' | 'CANCELLED' | 'HIATUS',
      volumesCount: number,
      coverUrl: string,
      inCollection: boolean,
      isAdminEdited: boolean,
      totalVolumesJapan?: number | null
    ) => {
      const key = normalizeTitleKey(title) || id
      const existing = mangaMap.get(key)

      const effectiveCover = getEffectiveVolumeCover(title, 1, coverUrl)
      const ov = overrides[id] || overrides[title]

      const finalVolumes = ov?.totalVolumes || (existing ? Math.max(existing.volumesCount, volumesCount) : volumesCount)
      const finalJapanVolumes = ov?.totalVolumesJapan ?? (existing ? existing.totalVolumesJapan : totalVolumesJapan)
      const finalStatus = ov?.statusInPoland || statusInPoland || 'ONGOING'
      const finalPublisher = ov?.publisher || publisherName || 'Waneko'
      const finalCover = ov?.customCoverUrl || effectiveCover

      mangaMap.set(key, {
        id: id || (existing ? existing.id : `manga-${Date.now()}`),
        title,
        polishTitle: ov?.polishTitle || polishTitle || (existing ? existing.polishTitle : title),
        publisherName: finalPublisher,
        statusInPoland: finalStatus,
        volumesCount: finalVolumes,
        totalVolumesJapan: finalJapanVolumes,
        coverUrl: finalCover,
        inUserCollection: existing ? (existing.inUserCollection || inCollection) : inCollection,
        hasAdminEdits: existing ? (existing.hasAdminEdits || isAdminEdited || Boolean(ov)) : (isAdminEdited || Boolean(ov)),
      })
    }

    // Add base popular series first as fallback/seed
    basePopularMangas.forEach((b) => {
      addOrUpdate(
        b.id,
        b.title,
        b.polishTitle,
        b.publisherName,
        b.statusInPoland,
        b.volumesCount,
        b.coverUrl,
        userSeriesKeys.has(normalizeTitleKey(b.title)),
        b.hasAdminEdits,
        b.totalVolumesJapan
      )
    })

    // Add series from User Collection
    userCollection.forEach((uc) => {
      addOrUpdate(
        uc.mangaId || uc.id,
        uc.title,
        uc.polishTitle || uc.title,
        uc.publisher || 'Waneko',
        'ONGOING',
        uc.totalVolumes || uc.volumes?.length || 1,
        uc.coverUrl,
        true,
        false,
        uc.totalVolumesJapan
      )
    })

    // Add series from Admin Overrides
    Object.keys(overrides).forEach((ovKey) => {
      const ov = overrides[ovKey]
      addOrUpdate(
        ov.id,
        ov.title,
        ov.polishTitle,
        ov.publisher || 'Waneko',
        ov.statusInPoland,
        ov.totalVolumes,
        ov.customCoverUrl || '',
        userSeriesKeys.has(normalizeTitleKey(ov.title)),
        true,
        ov.totalVolumesJapan
      )
    })

    // Add series from Custom/Edited Releases
    const releasesList = [...customReleases, ...Object.values(editedReleases)]
    releasesList.forEach((rel) => {
      if (rel && rel.seriesTitle) {
        addOrUpdate(
          rel.mangaId || `rel-${rel.id}`,
          rel.seriesTitle,
          rel.seriesTitle,
          rel.publisher || 'Waneko',
          'ONGOING',
          rel.volumeNumber || 1,
          rel.coverUrl || '',
          userSeriesKeys.has(normalizeTitleKey(rel.seriesTitle)),
          true
        )
      }
    })

    setMangas(Array.from(mangaMap.values()))

    // Fetch live series from PostgreSQL database
    fetch('/api/admin/manga')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.success && Array.isArray(data.mangas)) {
          data.mangas.forEach((dbM: any) => {
            addOrUpdate(
              dbM.id,
              dbM.title,
              dbM.polishTitle,
              dbM.publisherName,
              dbM.statusInPoland,
              dbM.volumesCount,
              dbM.coverUrl,
              dbM.inUserCollection,
              dbM.hasAdminEdits,
              dbM.totalVolumesJapan
            )
          })
          setMangas(Array.from(mangaMap.values()))
        }
      })
      .catch((err) => console.warn('Fetch DB mangas error:', err))
  }

  useEffect(() => {
    const timer = setTimeout(() => {
      loadManagedMangas()
    }, 0)

    const handleUpdate = () => loadManagedMangas()
    window.addEventListener('mangowo_admin_updated', handleUpdate)
    window.addEventListener('mangowo_collection_updated', handleUpdate)
    return () => {
      clearTimeout(timer)
      window.removeEventListener('mangowo_admin_updated', handleUpdate)
      window.removeEventListener('mangowo_collection_updated', handleUpdate)
    }
  }, [])

  const filteredMangas = mangas.filter(
    (m) =>
      m.title.toLowerCase().includes(search.toLowerCase()) ||
      m.polishTitle?.toLowerCase().includes(search.toLowerCase()) ||
      m.publisherName.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="space-y-6 animate-in fade-in-50 duration-300 pb-16">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-black text-white">Zarządzanie Mangą ({mangas.length})</h2>
          <p className="text-xs text-muted-foreground">
            Wszystkie serie używane przez użytkowników w serwisie oraz zaktualizowane w panelu admina
          </p>
        </div>
        <Link href="/admin/manga/new">
          <Button className="bg-primary hover:bg-primary/80 font-bold text-xs rounded-xl gap-2 text-white">
            <Plus className="h-4 w-4" />
            Dodaj nową mangę
          </Button>
        </Link>
      </div>

      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Szukaj mangi po tytule lub wydawcy..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-white/5 border-white/10 text-xs rounded-xl text-white"
          />
        </div>
        <Link href="/admin/manga/bulk">
          <Button variant="outline" className="border-white/10 text-xs rounded-xl">
            Masowy import
          </Button>
        </Link>
      </div>

      <div className="rounded-2xl border border-white/10 bg-[#0C101D]/90 overflow-hidden shadow-xl">
        <Table>
          <TableHeader className="bg-white/5">
            <TableRow className="border-white/10">
              <TableHead className="w-[60px] text-xs font-bold">Okładka</TableHead>
              <TableHead className="text-xs font-bold">Tytuł Serii</TableHead>
              <TableHead className="text-xs font-bold">Wydawca</TableHead>
              <TableHead className="text-xs font-bold">Status PL</TableHead>
              <TableHead className="text-center text-xs font-bold">Tomy (PL / JP)</TableHead>
              <TableHead className="text-xs font-bold">Aktywność / Stan</TableHead>
              <TableHead className="w-[100px] text-right text-xs font-bold">Akcje</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredMangas.map((manga) => (
              <TableRow key={manga.id} className="border-white/5 hover:bg-white/[0.03]">
                <TableCell>
                  <div className="relative h-12 w-8 overflow-hidden rounded bg-black border border-white/10 shadow-sm">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={getCoverUrl(manga.coverUrl)}
                      alt={manga.title}
                      referrerPolicy="no-referrer"
                      crossOrigin="anonymous"
                      onError={(e) => {
                        ;(e.target as HTMLImageElement).src = 'https://s4.anilist.co/file/anilistcdn/media/manga/cover/large/bx117195-2s5b3n4pZ9Ea.jpg'
                      }}
                      className="h-full w-full object-cover"
                    />
                  </div>
                </TableCell>

                <TableCell>
                  <div>
                    <p className="font-bold text-xs text-white">{manga.title}</p>
                    {manga.polishTitle && manga.polishTitle !== manga.title && (
                      <p className="text-[10px] text-muted-foreground">{manga.polishTitle}</p>
                    )}
                  </div>
                </TableCell>

                <TableCell className="text-xs text-muted-foreground font-semibold">
                  {manga.publisherName || '-'}
                </TableCell>

                <TableCell>
                  <Badge
                    variant="outline"
                    className={`text-[10px] font-bold ${
                      manga.statusInPoland === 'FINISHED'
                        ? 'border-emerald-500/40 text-emerald-300 bg-emerald-950/40'
                        : 'border-cyan-500/40 text-cyan-300 bg-cyan-950/40'
                    }`}
                  >
                    {manga.statusInPoland === 'FINISHED' ? 'Zakończone' : 'Wychodzi'}
                  </Badge>
                </TableCell>

                <TableCell className="text-center">
                  <div className="inline-flex flex-col items-center gap-0.5">
                    <span className="font-extrabold text-xs text-white">
                      🇵🇱 {manga.volumesCount} <span className="text-[10px] text-muted-foreground font-normal">w PL</span>
                    </span>
                    {manga.totalVolumesJapan ? (
                      <span className="text-[10px] text-amber-300 font-bold">
                        🇯🇵 {manga.totalVolumesJapan} <span className="text-muted-foreground font-normal">w JP</span>
                      </span>
                    ) : (
                      <span className="text-[9px] text-muted-foreground italic">
                        🇯🇵 b/d
                      </span>
                    )}
                  </div>
                </TableCell>

                <TableCell>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {manga.inUserCollection && (
                      <Badge className="bg-cyan-500/15 text-cyan-300 border-cyan-500/30 text-[9px] gap-1">
                        <Bookmark className="h-2.5 w-2.5" />
                        W Kolekcji
                      </Badge>
                    )}
                    {manga.hasAdminEdits && (
                      <Badge className="bg-purple-500/15 text-purple-300 border-purple-500/30 text-[9px] gap-1">
                        <Sparkles className="h-2.5 w-2.5" />
                        Edycja Admina
                      </Badge>
                    )}
                  </div>
                </TableCell>

                <TableCell className="text-right">
                  <Link href={`/admin/manga/${manga.id}`}>
                    <Button variant="ghost" size="sm" className="h-8 px-2.5 text-xs text-cyan-300 hover:bg-white/10 gap-1 rounded-xl font-bold">
                      <Edit className="h-3.5 w-3.5" />
                      Edytuj
                    </Button>
                  </Link>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
