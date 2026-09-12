'use client'

import { useState } from 'react'
import { Search, Plus, Check, Sparkles, BookOpen, ExternalLink } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { VolumeDetailModal, VolumeDetailData } from '@/components/manga/volume-detail-modal'
import { searchMangaFromAniList } from '@/lib/actions/search'

interface AniListResult {
  id: number
  title: {
    romaji: string
    english: string | null
  }
  description?: string | null
  coverImage: {
    large: string
  }
  status: string
  volumes: number | null
}

export default function SearchPage() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<AniListResult[]>([])
  const [loading, setLoading] = useState(false)
  const [imported, setImported] = useState<number[]>([])

  // Floating Modal State
  const [modalOpen, setModalOpen] = useState(false)
  const [selectedVolume, setSelectedVolume] = useState<VolumeDetailData | null>(null)

  const handleSearch = async () => {
    if (!query.trim()) return

    setLoading(true)
    try {
      const data = await searchMangaFromAniList(query)
      setResults(data.media as AniListResult[])
    } catch (error) {
      console.error('Search error:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleOpenModal = (manga: AniListResult) => {
    setSelectedVolume({
      mangaId: String(manga.id),
      volumeNumber: 1,
      title: manga.title.romaji,
      polishTitle: manga.title.english || manga.title.romaji,
      coverUrl: manga.coverImage.large,
      publisher: 'Waneko / Wydanie PL',
      pricePLN: 34.99,
      description: manga.description ? manga.description.replace(/<[^>]*>/g, '') : 'Brak opisu.',
      status: imported.includes(manga.id) ? 'OWNED' : 'WISHLIST',
    })
    setModalOpen(true)
  }

  const handleModalSave = () => {
    if (selectedVolume) {
      const anilistId = parseInt(selectedVolume.mangaId, 10)
      if (!isNaN(anilistId) && !imported.includes(anilistId)) {
        setImported((prev) => [...prev, anilistId])
      }
    }
  }

  return (
    <div className="space-y-6 animate-in fade-in-50 duration-300 pb-12">
      {/* Floating Detail Modal */}
      <VolumeDetailModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        volumeData={selectedVolume}
        onSave={handleModalSave}
      />

      <div>
        <div className="inline-flex items-center gap-2 rounded-full border border-cyan-500/30 bg-cyan-500/10 px-3 py-1 text-xs font-semibold text-cyan-400 mb-1">
          <Sparkles className="h-3 w-3" />
          <span>Globalna Baza AniList API</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">Wyszukaj Mangę</h1>
        <p className="text-xs sm:text-sm text-muted-foreground">
          Przeszukuj miliony japońskich i światowych serii i importuj je do swojej polskiej półki
        </p>
      </div>

      <div className="flex gap-2 max-w-2xl">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Wpisz tytuł mangi (np. Chainsaw Man, Berserk, Jujutsu Kaisen)..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            className="pl-10 text-sm glass-panel border-border/80 h-11 text-white"
          />
        </div>
        <Button onClick={handleSearch} disabled={loading} className="h-11 px-6 font-bold shadow-md shadow-primary/25">
          {loading ? 'Szukanie...' : 'Szukaj'}
        </Button>
      </div>

      {loading && (
        <div className="flex justify-center py-12">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      )}

      {results.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {results.map((manga) => (
            <Card
              key={manga.id}
              onClick={() => handleOpenModal(manga)}
              className="glass-panel border-border/70 hover:border-primary/50 transition-all duration-300 hover:shadow-lg hover:shadow-primary/10 cursor-pointer group"
            >
              <CardContent className="flex gap-4 p-4">
                <div className="relative h-28 w-20 shrink-0 overflow-hidden rounded-xl bg-muted border border-white/10 shadow-md">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={manga.coverImage.large}
                    alt={manga.title.romaji}
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                </div>
                <div className="flex flex-1 flex-col justify-between min-w-0">
                  <div>
                    <h3 className="font-bold text-sm truncate group-hover:text-primary transition-colors">
                      {manga.title.romaji}
                    </h3>
                    {manga.title.english && (
                      <p className="text-xs text-muted-foreground truncate">
                        {manga.title.english}
                      </p>
                    )}
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      <Badge variant="secondary" className="text-[10px] bg-primary/15 text-primary border-primary/30">
                        {manga.status}
                      </Badge>
                      {manga.volumes && (
                        <Badge variant="outline" className="text-[10px]">
                          {manga.volumes} tomów
                        </Badge>
                      )}
                    </div>
                  </div>

                  <div className="pt-2 flex items-center justify-between">
                    <span className="text-[10px] text-cyan-300 flex items-center gap-1 group-hover:underline">
                      Otwórz tom <ExternalLink className="h-2.5 w-2.5" />
                    </span>

                    <Button
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleOpenModal(manga)
                      }}
                      className={
                        imported.includes(manga.id)
                          ? 'bg-emerald-600 text-white font-bold h-7 px-3 text-xs'
                          : 'bg-primary font-semibold h-7 px-3 text-xs'
                      }
                    >
                      {imported.includes(manga.id) ? (
                        <>
                          <Check className="mr-1 h-3 w-3" />
                          Na Półce
                        </>
                      ) : (
                        <>
                          <Plus className="mr-1 h-3 w-3" />
                          Dodaj
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {!loading && results.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-center glass-panel rounded-2xl border-dashed">
          <BookOpen className="mb-3 h-12 w-12 text-muted-foreground/50" />
          <h3 className="text-base font-bold">Wpisz frazę i wyszukaj serię</h3>
          <p className="text-xs text-muted-foreground max-w-sm mt-1">
            Po wyszukaniu kliknij na dowolną mangę, aby otworzyć pływające okno z porównywarką cen i opcją dodania tomu.
          </p>
        </div>
      )}
    </div>
  )
}
