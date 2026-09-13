'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Plus, Search, Edit, Sparkles, Bookmark, RefreshCw } from 'lucide-react'
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
  getEffectiveVolumeCover,
} from '@/lib/admin-store'
import { getSavedCollection } from '@/lib/collection-store'
import { normalizeTitleKey, areSameSeries, formatVolumeCount } from '@/lib/title-utils'
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

export default function AdminMangaPage() {
  const [search, setSearch] = useState('')
  const [mangas, setMangas] = useState<ManagedMangaItem[]>([])
  const [isRefreshing, setIsRefreshing] = useState(false)

  const loadManagedMangas = async () => {
    try {
      // 1. Fetch live series directly from PostgreSQL database (source of truth)
      const res = await fetch('/api/admin/manga')
      const data = res.ok ? await res.json() : null
      const dbMangas: any[] = data?.success && Array.isArray(data.mangas) ? data.mangas : []

      // 2. Get user collection and admin overrides for decoration
      const userCollection = getSavedCollection()
      const overrides = getAdminMangaOverrides()

      const managedList: ManagedMangaItem[] = []

      // Process DB mangas first
      for (const dbM of dbMangas) {
        const matchingUserSeries = userCollection.find((s) => areSameSeries(s, dbM))
        const ov = overrides[dbM.id] || overrides[normalizeTitleKey(dbM.title)] || Object.values(overrides).find((o) => areSameSeries(o, dbM))

        const finalCover = ov?.customCoverUrl || dbM.coverUrl || getEffectiveVolumeCover(dbM.title, 1, '')
        const finalPolandCount = ov?.totalVolumes || dbM.volumesCount || 1
        const finalJapanCount = ov?.totalVolumesJapan !== undefined ? ov.totalVolumesJapan : dbM.totalVolumesJapan
        const finalStatus = ov?.statusInPoland || dbM.statusInPoland || 'ONGOING'
        const finalPublisher = ov?.publisher || dbM.publisherName || 'Inne'
        const finalPolishTitle = ov?.polishTitle || dbM.polishTitle || dbM.title

        managedList.push({
          id: dbM.id,
          title: dbM.title,
          polishTitle: finalPolishTitle,
          publisherName: finalPublisher,
          statusInPoland: finalStatus,
          volumesCount: finalPolandCount,
          totalVolumesJapan: finalJapanCount,
          coverUrl: finalCover,
          inUserCollection: Boolean(dbM.inUserCollection || matchingUserSeries),
          hasAdminEdits: Boolean(dbM.hasAdminEdits || ov || dbM.customCoverUrl),
        })
      }

      // If any series in user collection is NOT in DB yet, add it cleanly without duplicates
      for (const uc of userCollection) {
        const alreadyInList = managedList.some((m) => areSameSeries(m, uc))
        if (!alreadyInList) {
          const ov = overrides[uc.mangaId] || overrides[uc.id] || Object.values(overrides).find((o) => areSameSeries(o, uc))
          managedList.push({
            id: uc.mangaId || uc.id,
            title: uc.title,
            polishTitle: ov?.polishTitle || uc.polishTitle || uc.title,
            publisherName: ov?.publisher || uc.publisher || 'Inne',
            statusInPoland: ov?.statusInPoland || 'ONGOING',
            volumesCount: ov?.totalVolumes || uc.totalVolumes || 1,
            totalVolumesJapan: ov?.totalVolumesJapan ?? uc.totalVolumesJapan,
            coverUrl: ov?.customCoverUrl || uc.coverUrl,
            inUserCollection: true,
            hasAdminEdits: Boolean(ov),
          })
        }
      }

      setMangas(managedList)
    } catch (err) {
      console.warn('Error loading managed mangas:', err)
    }
  }

  useEffect(() => {
    loadManagedMangas()

    const handleUpdate = () => loadManagedMangas()
    window.addEventListener('mangowo_admin_updated', handleUpdate)
    window.addEventListener('mangowo_collection_updated', handleUpdate)
    return () => {
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
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => {
              setIsRefreshing(true)
              loadManagedMangas()
              setTimeout(() => setIsRefreshing(false), 800)
            }}
            disabled={isRefreshing}
            className="border-white/10 hover:bg-white/10 font-bold text-xs rounded-xl gap-2 text-white"
            title="Pobierz najświeższy stan mang z bazy danych"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            Odśwież
          </Button>
          <Link href="/admin/manga/new">
            <Button className="bg-primary hover:bg-primary/80 font-bold text-xs rounded-xl gap-2 text-white">
              <Plus className="h-4 w-4" />
              Dodaj nową mangę
            </Button>
          </Link>
        </div>
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
                        ;(e.target as HTMLImageElement).src = getCoverUrl('')
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
                      🇵🇱 {formatVolumeCount(manga.volumesCount)} <span className="text-[10px] text-muted-foreground font-normal">w PL</span>
                    </span>
                    {manga.totalVolumesJapan ? (
                      <span className="text-[10px] text-amber-300 font-bold">
                        🇯🇵 {formatVolumeCount(manga.totalVolumesJapan)} <span className="text-muted-foreground font-normal">w JP</span>
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
