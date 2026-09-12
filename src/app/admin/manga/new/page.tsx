'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Save, Search } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { CoverUpload } from '@/components/manga/cover-upload'
import { searchMangaFromAniList, createManga } from '@/lib/actions/manga'

interface AniListResult {
  id: number
  title: {
    romaji: string
    english: string | null
    native: string | null
  }
  coverImage: {
    large: string
  }
  description: string | null
  status: string
  volumes: number | null
}

export default function NewMangaPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<AniListResult[]>([])
  const [searching, setSearching] = useState(false)

  const [form, setForm] = useState({
    title: '',
    nativeTitle: '',
    polishTitle: '',
    description: '',
    defaultCover: '',
    customCoverUrl: null as string | null,
    anilistId: null as number | null,
    statusInPoland: 'UNKNOWN',
    publisherId: '',
    totalVolumesJapan: null as number | null,
    totalVolumesPoland: null as number | null,
  })

  const handleSearchAniList = async () => {
    if (!searchQuery.trim()) return
    setSearching(true)
    try {
      const data = await searchMangaFromAniList(searchQuery)
      setSearchResults(data.media as AniListResult[])
    } catch (error) {
      console.error('Search error:', error)
    } finally {
      setSearching(false)
    }
  }

  const handleSelectFromAniList = (manga: AniListResult) => {
    setForm({
      ...form,
      title: manga.title.romaji,
      nativeTitle: manga.title.native || '',
      polishTitle: manga.title.english || '',
      description: manga.description || '',
      defaultCover: manga.coverImage.large,
      anilistId: manga.id,
      totalVolumesJapan: manga.volumes || null,
    })
    setSearchResults([])
    setSearchQuery('')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const result = await createManga({
        ...form,
        anilistId: form.anilistId || undefined,
        statusInPoland: form.statusInPoland as 'UNKNOWN',
        totalVolumesJapan: form.totalVolumesJapan || undefined,
        totalVolumesPoland: form.totalVolumesPoland || undefined,
      })

      if (result.success) {
        router.push('/admin/manga')
      }
    } catch (error) {
      console.error('Create error:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link
          href="/admin/manga"
          className="inline-flex items-center text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="mr-1 h-4 w-4" />
          Powrót
        </Link>
        <div>
          <h2 className="text-lg font-semibold">Dodaj Mangę</h2>
          <p className="text-muted-foreground">Dodaj nową serię manga</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Import z AniList</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Input
              placeholder="Szukaj w AniList..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearchAniList()}
            />
            <Button onClick={handleSearchAniList} disabled={searching}>
              <Search className="h-4 w-4" />
            </Button>
          </div>

          {searchResults.length > 0 && (
            <div className="mt-4 space-y-2">
              {searchResults.map((manga) => (
                <div
                  key={manga.id}
                  className="flex items-center gap-4 rounded-md border p-3 hover:bg-muted cursor-pointer"
                  onClick={() => handleSelectFromAniList(manga)}
                >
                  <div className="relative h-16 w-12">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={manga.coverImage.large}
                      alt={manga.title.romaji}
                      className="h-full w-full rounded object-cover"
                    />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium">{manga.title.romaji}</p>
                    {manga.title.english && (
                      <p className="text-sm text-muted-foreground">{manga.title.english}</p>
                    )}
                    <div className="flex gap-2 mt-1">
                      <span className="text-xs bg-secondary px-2 py-0.5 rounded">
                        {manga.status}
                      </span>
                      {manga.volumes && (
                        <span className="text-xs text-muted-foreground">{manga.volumes} tomów</span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Dane manga</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="title">Tytuł (oryginalny)</Label>
                <Input
                  id="title"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="nativeTitle">Tytuł japoński</Label>
                <Input
                  id="nativeTitle"
                  value={form.nativeTitle}
                  onChange={(e) => setForm({ ...form, nativeTitle: e.target.value })}
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="polishTitle">Tytuł polski</Label>
                <Input
                  id="polishTitle"
                  value={form.polishTitle}
                  onChange={(e) => setForm({ ...form, polishTitle: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="statusInPoland">Status w Polsce</Label>
                <Select
                  value={form.statusInPoland}
                  onValueChange={(value: string | null) => setForm({ ...form, statusInPoland: value || 'UNKNOWN' })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="UNKNOWN">Nieznany</SelectItem>
                    <SelectItem value="ONGOING">Wychodzi</SelectItem>
                    <SelectItem value="FINISHED">Zakończone</SelectItem>
                    <SelectItem value="CANCELLED">Anulowane</SelectItem>
                    <SelectItem value="HIATUS">Przerwa</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 p-3.5 rounded-2xl bg-white/[0.02] border border-white/10">
              <div className="space-y-1.5">
                <Label htmlFor="totalVolumesPoland" className="text-xs font-bold text-cyan-300 flex items-center gap-1.5">
                  <span>🇵🇱</span> Liczba tomów w Polsce
                </Label>
                <Input
                  id="totalVolumesPoland"
                  type="number"
                  min="1"
                  max="200"
                  placeholder="np. 16"
                  value={form.totalVolumesPoland ?? ''}
                  onChange={(e) => {
                    const val = e.target.value === '' ? null : parseInt(e.target.value, 10)
                    setForm((f) => ({ ...f, totalVolumesPoland: isNaN(val as number) ? null : val }))
                  }}
                  className="bg-cyan-950/30 border-cyan-500/40 text-xs text-cyan-300 font-extrabold"
                />
                <p className="text-[10px] text-muted-foreground">
                  Ilość tomów wydanych lub zapowiedzianych w Polsce.
                </p>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="totalVolumesJapan" className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                  <span>🇯🇵</span> Liczba tomów w Japonii
                </Label>
                <Input
                  id="totalVolumesJapan"
                  type="number"
                  min="1"
                  max="300"
                  placeholder="np. 24"
                  value={form.totalVolumesJapan ?? ''}
                  onChange={(e) => {
                    const val = e.target.value === '' ? null : parseInt(e.target.value, 10)
                    setForm((f) => ({ ...f, totalVolumesJapan: isNaN(val as number) ? null : val }))
                  }}
                  className="bg-amber-950/30 border-amber-500/40 text-xs text-amber-300 font-extrabold"
                />
                <p className="text-[10px] text-muted-foreground">
                  Oryginalna liczba tomów w Japonii (pobierana z AniList).
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Opis</Label>
              <Textarea
                id="description"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                rows={4}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Własna okładka (opcjonalnie)</Label>
                <CoverUpload
                  value={form.customCoverUrl}
                  onChange={(url) => setForm({ ...form, customCoverUrl: url })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="publisherId">Wydawca</Label>
                <Select
                  value={form.publisherId}
                  onValueChange={(value: string | null) => setForm({ ...form, publisherId: value || '' })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Wybierz wydawcę" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="waneko">Waneko</SelectItem>
                    <SelectItem value="studio-jg">Studio JG</SelectItem>
                    <SelectItem value="jpf">JPF</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {form.defaultCover && !form.customCoverUrl && (
              <div className="flex items-center gap-4">
                <div className="relative h-32 w-24">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={form.defaultCover}
                    alt="Podgląd okładki"
                    className="h-full w-full rounded object-cover"
                  />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Podgląd okładki</p>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setForm({ ...form, defaultCover: '' })}
                  >
                    Usuń okładkę
                  </Button>
                </div>
              </div>
            )}

            <div className="flex justify-end gap-2">
              <Link href="/admin/manga">
                <Button type="button" variant="outline">
                  Anuluj
                </Button>
              </Link>
              <Button type="submit" disabled={loading}>
                <Save className="mr-2 h-4 w-4" />
                {loading ? 'Zapisywanie...' : 'Zapisz'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
