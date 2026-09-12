'use client'

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import {
  Download,
  Upload,
  FileSpreadsheet,
  FileCode,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Loader2,
  Share2,
} from 'lucide-react'
import {
  getSavedCollection,
  saveCollectionToStorage,
  type CollectionSeriesItem,
} from '@/lib/collection-store'

interface CollectionExportModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCollectionImported?: () => void
}

export function CollectionExportModal({
  open,
  onOpenChange,
  onCollectionImported,
}: CollectionExportModalProps) {
  const [activeTab, setActiveTab] = useState('export')

  // Import JSON state
  const [importStatus, setImportStatus] = useState<{
    success: boolean
    message: string
  } | null>(null)
  const [importMergeMode, setImportMergeMode] = useState<'replace' | 'merge'>('merge')

  // Import AniList state
  const [anilistUsername, setAnilistUsername] = useState('')
  const [anilistLoading, setAnilistLoading] = useState(false)

  // 1. Export as CSV (Excel compatible with UTF-8 BOM)
  const handleExportCSV = () => {
    const collection = getSavedCollection()
    const rows: string[] = [
      'Tytuł Serii;Wydawca;Numer Tomu;Status;Cena Zakupu PLN;Ocena Tomu;Pożyczone Komu;Data Pożyczenia;Notatki',
    ]

    collection.forEach((series) => {
      series.volumes.forEach((v) => {
        const title = `"${series.title.replace(/"/g, '""')}"`
        const publisher = `"${(series.publisher || '').replace(/"/g, '""')}"`
        const volNum = v.volumeNumber
        const status = v.status
        const price = v.purchasePrice ? v.purchasePrice.toFixed(2) : ''
        const rating = v.userRating ? String(v.userRating) : ''
        const lentTo = `"${(v.lentTo || '').replace(/"/g, '""')}"`
        const lentDate = v.lentDate || ''
        const notes = `"${(v.notes || '').replace(/"/g, '""')}"`

        rows.push(
          [title, publisher, volNum, status, price, rating, lentTo, lentDate, notes].join(';')
        )
      })
    })

    const csvContent = '\uFEFF' + rows.join('\r\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.setAttribute(
      'download',
      `manga-shelf-kolekcja-${new Date().toISOString().split('T')[0]}.csv`
    )
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  // 2. Export full JSON Backup
  const handleExportJSON = () => {
    const collection = getSavedCollection()
    const jsonString = JSON.stringify(collection, null, 2)
    const blob = new Blob([jsonString], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.setAttribute(
      'download',
      `manga-shelf-backup-${new Date().toISOString().split('T')[0]}.json`
    )
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  // 3. Handle File Input JSON Import
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setImportStatus(null)
    const reader = new FileReader()
    reader.onload = (evt) => {
      try {
        const content = evt.target?.result as string
        const parsed = JSON.parse(content)

        if (!Array.isArray(parsed)) {
          throw new Error('Plik nie zawiera poprawnej tablicy serii mang.')
        }

        const current = getSavedCollection()
        let finalCollection: CollectionSeriesItem[] = []

        if (importMergeMode === 'replace') {
          finalCollection = parsed
        } else {
          // Merge: update or add new
          const existingMap = new Map(current.map((s) => [s.id || s.title, s]))
          parsed.forEach((s: CollectionSeriesItem) => {
            existingMap.set(s.id || s.title, s)
          })
          finalCollection = Array.from(existingMap.values())
        }

        saveCollectionToStorage(finalCollection)
        setImportStatus({
          success: true,
          message: `Pomyślnie zaimportowano ${parsed.length} serii (${importMergeMode === 'replace' ? 'zastąpiono bazę' : 'scalono z obecną półką'}).`,
        })

        if (onCollectionImported) onCollectionImported()
      } catch (err: unknown) {
        setImportStatus({
          success: false,
          message: err instanceof Error ? err.message : 'Błąd podczas odczytu pliku JSON.',
        })
      }
    }
    reader.readAsText(file)
  }

  // 4. Import from AniList GraphQL API
  const handleImportAniList = async () => {
    if (!anilistUsername.trim()) return

    setAnilistLoading(true)
    setImportStatus(null)

    const query = `
      query ($userName: String) {
        MediaListCollection(userName: $userName, type: MANGA) {
          lists {
            name
            entries {
              progress
              score
              status
              media {
                id
                title {
                  romaji
                  english
                }
                volumes
                coverImage {
                  extraLarge
                  large
                }
                description
              }
            }
          }
        }
      }
    `

    try {
      const res = await fetch('https://graphql.anilist.co', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query,
          variables: { userName: anilistUsername.trim() },
        }),
      })

      if (!res.ok) throw new Error(`Użytkownik AniList "${anilistUsername}" nie został znaleziony.`)

      const data = await res.json()
      const lists = data.data?.MediaListCollection?.lists || []
      const current = getSavedCollection()

      let importedSeriesCount = 0
      const newSeriesList: CollectionSeriesItem[] = [...current]

      lists.forEach((list: { entries?: Array<{ progress?: number; media?: { id: number; title: { romaji?: string; english?: string }; volumes?: number; coverImage?: { extraLarge?: string; large?: string }; description?: string } }> }) => {
        list.entries?.forEach((entry) => {
          if (!entry.media) return
          const m = entry.media
          const title = m.title.romaji || m.title.english || 'Manga'
          const total = m.volumes || 20
          const progress = entry.progress || 0
          const cover =
            m.coverImage?.extraLarge ||
            m.coverImage?.large ||
            'https://s4.anilist.co/file/anilistcdn/media/manga/cover/large/bx30012-7Uo49q0iX6qX.jpg'

          // Check if already in collection
          const exists = newSeriesList.find(
            (s) => s.mangaId === String(m.id) || s.title.toLowerCase() === title.toLowerCase()
          )

          if (!exists) {
            importedSeriesCount++
            newSeriesList.push({
              id: `anilist-${m.id}-${Date.now()}`,
              mangaId: String(m.id),
              title,
              publisher: 'Waneko',
              coverUrl: cover,
              totalVolumes: total,
              description: m.description?.replace(/<[^>]+>/g, '') || '',
              userSeriesRating: null,
              volumes: Array.from({ length: total }, (_, idx) => {
                const volNum = idx + 1
                const isRead = volNum <= progress
                return {
                  volumeNumber: volNum,
                  coverUrl: cover,
                  customCoverUrl: null,
                  status: isRead ? 'READ' : 'NONE',
                  purchasePrice: isRead ? 34.99 : null,
                  userRating: null,
                }
              }),
            })
          }
        })
      })

      saveCollectionToStorage(newSeriesList)
      setImportStatus({
        success: true,
        message: `Pomyślnie zaciągnięto ${importedSeriesCount} nowych serii z konta AniList @${anilistUsername}!`,
      })

      if (onCollectionImported) onCollectionImported()
    } catch (err: unknown) {
      setImportStatus({
        success: false,
        message: err instanceof Error ? err.message : 'Błąd podczas synchronizacji z AniList.',
      })
    } finally {
      setAnilistLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl bg-[#090D18]/95 border-white/15 text-white backdrop-blur-3xl shadow-2xl rounded-3xl p-6">
        <DialogHeader>
          <div className="flex items-center gap-2 mb-1">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-cyan-500/30 bg-cyan-500/10 px-3 py-0.5 text-[11px] font-bold text-cyan-300">
              <Share2 className="h-3 w-3" />
              Kopia Zapasowa & Wymiana Danych
            </span>
          </div>
          <DialogTitle className="text-xl font-extrabold text-white">
            Eksport i Import Półki Mang
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Pobierz swoją kolekcję do arkusza kalkulacyjnego Excel/CSV, utwórz kopię zapasową JSON lub zaimportuj listę z AniList.
          </DialogDescription>
        </DialogHeader>

        {/* Tabs: Export vs Import */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-2 space-y-4">
          <TabsList className="grid grid-cols-2 bg-white/5 p-1 rounded-2xl border border-white/10">
            <TabsTrigger
              value="export"
              className="text-xs font-bold rounded-xl data-[state=active]:bg-primary data-[state=active]:text-white"
            >
              <Download className="h-3.5 w-3.5 mr-1.5" />
              Eksportuj Kolekcję
            </TabsTrigger>
            <TabsTrigger
              value="import"
              className="text-xs font-bold rounded-xl data-[state=active]:bg-primary data-[state=active]:text-white"
            >
              <Upload className="h-3.5 w-3.5 mr-1.5" />
              Importuj / Przywróć
            </TabsTrigger>
          </TabsList>

          {/* EXPORT TAB */}
          <TabsContent value="export" className="space-y-4 mt-0">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* CSV Button */}
              <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 space-y-3 flex flex-col justify-between hover:border-emerald-500/40 transition-all">
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2 text-emerald-400">
                    <FileSpreadsheet className="h-5 w-5" />
                    <span className="font-bold text-sm text-white">Arkusz CSV (Excel)</span>
                  </div>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    Zawiera tytuły, wydawców, numery tomów, statusy, ceny w PLN, oceny oraz notatki wypożyczeń. Idealny do przeglądania na telefonie lub wydruku.
                  </p>
                </div>
                <Button
                  onClick={handleExportCSV}
                  className="w-full h-9 font-bold text-xs bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl gap-1.5 shadow-md shadow-emerald-600/20"
                >
                  <Download className="h-3.5 w-3.5" />
                  Pobierz CSV (.csv)
                </Button>
              </div>

              {/* JSON Backup Button */}
              <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 space-y-3 flex flex-col justify-between hover:border-purple-500/40 transition-all">
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2 text-purple-400">
                    <FileCode className="h-5 w-5" />
                    <span className="font-bold text-sm text-white">Pełna Kopia JSON</span>
                  </div>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    100% bezstratna kopia zapasowa Twojej półki wraz z niestandardowymi okładkami, historią czytania i ocenami. Do przywrócenia w dowolnym momencie.
                  </p>
                </div>
                <Button
                  onClick={handleExportJSON}
                  className="w-full h-9 font-bold text-xs bg-purple-600 hover:bg-purple-500 text-white rounded-xl gap-1.5 shadow-md shadow-purple-600/20"
                >
                  <Download className="h-3.5 w-3.5" />
                  Pobierz JSON (.json)
                </Button>
              </div>
            </div>
          </TabsContent>

          {/* IMPORT TAB */}
          <TabsContent value="import" className="space-y-4 mt-0">
            {/* JSON File Upload */}
            <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-bold text-white flex items-center gap-1.5">
                  <FileCode className="h-4 w-4 text-purple-400" />
                  Wczytaj plik kopii zapasowej (.json)
                </Label>
                <div className="flex items-center gap-1">
                  <Button
                    type="button"
                    size="sm"
                    variant={importMergeMode === 'merge' ? 'default' : 'ghost'}
                    onClick={() => setImportMergeMode('merge')}
                    className="h-6 text-[10px] px-2 rounded-lg"
                  >
                    Scalaj
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant={importMergeMode === 'replace' ? 'destructive' : 'ghost'}
                    onClick={() => setImportMergeMode('replace')}
                    className="h-6 text-[10px] px-2 rounded-lg"
                  >
                    Nadpisz
                  </Button>
                </div>
              </div>

              <Input
                type="file"
                accept=".json"
                onChange={handleFileUpload}
                className="h-9 text-xs bg-black/40 border-white/15 text-white file:text-xs file:font-bold file:text-white file:bg-white/10 file:border-0 file:rounded-lg file:mr-2 file:h-full cursor-pointer"
              />
            </div>

            {/* AniList Sync */}
            <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 space-y-3">
              <Label className="text-xs font-bold text-white flex items-center gap-1.5">
                <Sparkles className="h-4 w-4 text-cyan-400" />
                Import z serwisu AniList
              </Label>
              <div className="flex items-center gap-2">
                <Input
                  placeholder="Twój login w AniList (np. DaQu)"
                  value={anilistUsername}
                  onChange={(e) => setAnilistUsername(e.target.value)}
                  className="h-9 text-xs bg-black/40 border-white/15 text-white rounded-xl flex-1"
                />
                <Button
                  onClick={handleImportAniList}
                  disabled={anilistLoading || !anilistUsername.trim()}
                  className="h-9 font-bold text-xs bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl gap-1.5"
                >
                  {anilistLoading ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      Pobieranie...
                    </>
                  ) : (
                    <>
                      <Upload className="h-3.5 w-3.5" />
                      Importuj
                    </>
                  )}
                </Button>
              </div>
              <p className="text-[10px] text-muted-foreground">
                Zaciągnie przeczytane tomy (progress) i doda serie automatycznie do Twojej półki.
              </p>
            </div>

            {/* Import Status Alert */}
            {importStatus && (
              <div
                className={`p-3 rounded-xl border flex items-center gap-2.5 text-xs font-bold ${
                  importStatus.success
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                    : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
                }`}
              >
                {importStatus.success ? (
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
                ) : (
                  <AlertCircle className="h-4 w-4 shrink-0 text-rose-400" />
                )}
                <span>{importStatus.message}</span>
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* Footer */}
        <div className="flex items-center justify-end pt-3 border-t border-white/10">
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            className="text-xs text-muted-foreground hover:text-white font-bold"
          >
            Zamknij
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
