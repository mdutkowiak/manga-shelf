'use client'

import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { useSession } from 'next-auth/react'
import {
  BookOpen,
  TrendingUp,
  Search,
  ChevronLeft,
  ChevronRight,
  Plus,
  Check,
  Barcode,
  Eye,
  PiggyBank,
  Calendar as CalendarIcon,
  Loader2,
  ExternalLink,
  Sparkles,
  RefreshCw,
  Maximize2,
  ArrowUpRight,
  Trophy,
  Download,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { LandingPage } from '@/components/landing/landing-page'
import { VolumeDetailModal, VolumeDetailData } from '@/components/manga/volume-detail-modal'
import { FullCalendarModal } from '@/components/manga/full-calendar-modal'
import { PublisherSyncModal } from '@/components/manga/publisher-sync-modal'
import { AddMangaModal } from '@/components/manga/add-manga-modal'
import { BarcodeScannerModal } from '@/components/manga/barcode-scanner-modal'
import {
  getEffectiveVolumeCover,
  getAdminCustomReleases,
  getAdminEditedReleases,
  getAdminDeletedReleaseIds,
} from '@/lib/admin-store'
import { UserRankBadge } from '@/components/manga/user-rank-badge'
import { getSavedCollection, type CollectionSeriesItem } from '@/lib/collection-store'
import { getCoverUrl } from '@/lib/cover-utils'
import type { PolishRelease } from '@/app/api/releases/route'
import { mergeReleasesWithDiff, cleanReleaseTitle, matchPublisher } from '@/lib/publisher-scraper'

interface UpcomingReleaseItem {
  id: string
  mangaId: string
  title: string
  volume: number
  releaseDate: string
  daysLeftText: string
  cover: string
  publisher: string
  pricePLN: number
  description: string
  isMatchingUserList: boolean
}

const monthsList = [
  'Styczeń', 'Luty', 'Marzec', 'Kwiecień', 'Maj', 'Czerwiec',
  'Lipiec', 'Sierpień', 'Wrzesień', 'Październik', 'Listopad', 'Grudzień'
]

const publisherFilters = ['Wszystkie', 'Waneko', 'Studio JG', 'JPF', 'Kotori', 'Dango', 'Hanami']

const verifiedCovers = [
  'https://s4.anilist.co/file/anilistcdn/media/manga/cover/large/bx30012-7Uo49q0iX6qX.jpg',
  'https://s4.anilist.co/file/anilistcdn/media/manga/cover/large/bx117832-7Uo49q0iX6qX.jpg',
  'https://s4.anilist.co/file/anilistcdn/media/manga/cover/large/bx101517-H3eeGGewnUjD.jpg',
  'https://s4.anilist.co/file/anilistcdn/media/manga/cover/large/bx108556-3wS4bVbOqXgB.jpg',
]

import { normalizeTitleKey } from '@/lib/collection-store'

function calculateDaysLeftText(dateStr?: string): string {
  if (!dateStr) return 'Wkrótce'
  const targetDate = new Date(dateStr)
  if (isNaN(targetDate.getTime())) return 'Wkrótce'

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  targetDate.setHours(0, 0, 0, 0)
  const diffMs = targetDate.getTime() - today.getTime()
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24))

  if (diffDays < 0) return 'Premiera minęła'
  if (diffDays === 0) return 'Premiera Dziś!'
  if (diffDays === 1) return 'Jutro'
  return `Za ${diffDays} dni`
}

// Helper to generate upcoming releases from REAL calendar announcements matching user's collection series!
function generateReleasesFromUserCollection(
  userSeries: CollectionSeriesItem[],
  calendarReleases: PolishRelease[] = []
): UpcomingReleaseItem[] {
  if (!userSeries || userSeries.length === 0) return []

  const matchedCalendarItems: UpcomingReleaseItem[] = []
  const matchedSeriesIds = new Set<string>()

  // 0. Include admin manual and edited releases with priority
  const adminCustom = getAdminCustomReleases()
  const adminEditedMap = getAdminEditedReleases()
  const adminReleases = [...adminCustom, ...Object.values(adminEditedMap)]

  if (adminReleases.length > 0) {
    adminReleases.forEach((adm) => {
      const matchingSeries = userSeries.find((s) => {
        const sKey = normalizeTitleKey(s.title)
        const admKey = normalizeTitleKey(adm.seriesTitle)
        return s.mangaId === adm.mangaId || sKey === admKey || sKey.includes(admKey) || admKey.includes(sKey)
      })

      if (matchingSeries && !matchedSeriesIds.has(matchingSeries.id)) {
        matchedSeriesIds.add(matchingSeries.id)
        const coverUrl = getEffectiveVolumeCover(matchingSeries.title, adm.volumeNumber, adm.coverUrl)
        const cleanTitle = cleanReleaseTitle(matchingSeries.title)

        matchedCalendarItems.push({
          id: `adm-rel-${adm.id}`,
          mangaId: adm.mangaId || matchingSeries.mangaId,
          title: cleanTitle,
          volume: adm.volumeNumber,
          releaseDate: `${adm.day} ${adm.year}`,
          daysLeftText: calculateDaysLeftText(adm.releaseDate),
          cover: coverUrl,
          publisher: adm.publisher || matchingSeries.publisher,
          pricePLN: adm.pricePLN || 36.99,
          description: adm.description || `Premiera tomu ${adm.volumeNumber} w wydaniu ${adm.publisher}.`,
          isMatchingUserList: true,
        })
      }
    })
  }

  // 1. Match real calendar releases with user's collection series
  if (calendarReleases.length > 0) {
    calendarReleases.forEach((relRaw) => {
      const rel = adminEditedMap[relRaw.id] ? adminEditedMap[relRaw.id] : relRaw
      const relTitle = 'seriesTitle' in rel ? rel.seriesTitle : rel.title
      const relDate = 'releaseDate' in rel ? rel.releaseDate : rel.date
      const relTitleKey = normalizeTitleKey(relTitle || '')

      const matchingSeries = userSeries.find((s) => {
        const sKey = normalizeTitleKey(s.title)
        if (s.mangaId === rel.mangaId) return true
        if (sKey && relTitleKey && (sKey === relTitleKey || relTitleKey.includes(sKey) || sKey.includes(relTitleKey))) return true
        return false
      })

      if (matchingSeries && !matchedSeriesIds.has(`${matchingSeries.id}-${rel.volumeNumber}`)) {
        matchedSeriesIds.add(`${matchingSeries.id}-${rel.volumeNumber}`)

        // Find cover for specific volume or fallback
        const volObj = matchingSeries.volumes.find((v) => v.volumeNumber === rel.volumeNumber)
        const baseCover = volObj?.customCoverUrl || volObj?.coverUrl || rel.coverUrl || matchingSeries.coverUrl
        const coverUrl = getEffectiveVolumeCover(matchingSeries.title, rel.volumeNumber, baseCover)
        const cleanTitle = cleanReleaseTitle(relTitle)

        matchedCalendarItems.push({
          id: `cal-rel-${rel.id}`,
          mangaId: rel.mangaId || matchingSeries.mangaId,
          title: cleanTitle,
          volume: rel.volumeNumber,
          releaseDate: `${rel.day} ${rel.year}`,
          daysLeftText: calculateDaysLeftText(relDate),
          cover: coverUrl,
          publisher: rel.publisher || matchingSeries.publisher,
          pricePLN: rel.pricePLN || 34.99,
          description: rel.description || `Wkrótce w sprzedaży: ${cleanTitle} w wydaniu ${rel.publisher}.`,
          isMatchingUserList: true,
        })
      }
    })
  }

  // Sort upcoming releases chronologically by date
  matchedCalendarItems.sort((a, b) => {
    const parseDays = (txt: string) => {
      if (txt.includes('Dziś')) return 0
      if (txt.includes('Jutro')) return 1
      const match = txt.match(/\d+/)
      return match ? parseInt(match[0], 10) : 999
    }
    return parseDays(a.daysLeftText) - parseDays(b.daysLeftText)
  })

  // Return strictly upcoming releases (excluding any past releases)
  return matchedCalendarItems.filter((item) => !item.daysLeftText.includes('minęła'))
}

function calculateCollectionStats(collection: CollectionSeriesItem[]) {
  let ownedCount = 0
  let readCount = 0
  let totalValue = 0

  collection.forEach((series) => {
    series.volumes?.forEach((vol) => {
      if (vol.status === 'OWNED' || vol.status === 'READ') {
        ownedCount++
        totalValue += vol.purchasePrice || 34.99
      }
      if (vol.status === 'READ') {
        readCount++
      }
    })
  })

  const totalValuePLN = Math.round(totalValue)
  const totalSavingsPLN = Math.round(totalValue * 0.12)
  const monthlyGoalTotal = Math.max(5, Math.ceil(ownedCount * 0.05) + 5)
  const monthlyGoalRead = Math.min(readCount, monthlyGoalTotal)

  return {
    ownedCount,
    readCount,
    totalValuePLN,
    totalSavingsPLN,
    monthlyGoalRead,
    monthlyGoalTotal,
  }
}

export default function HomePage() {
  const { data: session, status } = useSession()
  const [selectedPublisher, setSelectedPublisher] = useState('Wszystkie')
  
  // Real Multi-Year & Monthly Releases State (dynamically initialized to current date)
  const [monthIndex, setMonthIndex] = useState(() => new Date().getMonth())
  const [year, setYear] = useState(() => new Date().getFullYear())
  const [releases, setReleases] = useState<PolishRelease[]>([])
  const [allReleases, setAllReleases] = useState<PolishRelease[]>([])
  const [releasesLoading, setReleasesLoading] = useState(true)

  // Real Dynamic Dashboard Stats calculated directly from user collection
  const [dashboardStats, setDashboardStats] = useState({
    ownedCount: 0,
    readCount: 0,
    totalValuePLN: 0,
    totalSavingsPLN: 0,
    monthlyGoalRead: 0,
    monthlyGoalTotal: 10,
  })

  // Carousel Offset for Upcoming Releases
  const [releaseOffset, setReleaseOffset] = useState(0)

  // Floating Modals State
  const [modalOpen, setModalOpen] = useState(false)
  const [selectedVolume, setSelectedVolume] = useState<VolumeDetailData | null>(null)
  const [fullCalendarOpen, setFullCalendarOpen] = useState(false)
  const [syncModalOpen, setSyncModalOpen] = useState(false)
  const [addMangaModalOpen, setAddMangaModalOpen] = useState(false)
  const [barcodeScannerOpen, setBarcodeScannerOpen] = useState(false)

  // Real Dynamic Upcoming Releases generated STRICTLY from user's collection series
  const [upcomingUserReleases, setUpcomingUserReleases] = useState<UpcomingReleaseItem[]>([])

  // Load user collection and sync upcoming releases matching real calendar announcements & stats
  useEffect(() => {
    const updateStatsAndReleases = () => {
      const col = getSavedCollection()
      setDashboardStats(calculateCollectionStats(col))
      setUpcomingUserReleases(generateReleasesFromUserCollection(col, allReleases))
    }

    updateStatsAndReleases()

    window.addEventListener('mangowo_collection_updated', updateStatsAndReleases)
    window.addEventListener('mangowo_admin_updated', updateStatsAndReleases)
    return () => {
      window.removeEventListener('mangowo_collection_updated', updateStatsAndReleases)
      window.removeEventListener('mangowo_admin_updated', updateStatsAndReleases)
    }
  }, [allReleases])

  // Fetch real releases from /api/releases with year & month
  useEffect(() => {
    let isMounted = true
    const timer = setTimeout(() => {
      if (isMounted) setReleasesLoading(true)
    }, 0)

    const currentMonthName = monthsList[monthIndex]

    fetch(`/api/releases?month=${encodeURIComponent(currentMonthName)}&year=${year}`)
      .then((res) => (res.ok ? res.json() : Promise.reject(res)))
      .then((data) => {
        if (isMounted) {
          if (data.releases) {
            setReleases(data.releases)
          }
          if (data.allReleases) {
            setAllReleases(data.allReleases)
            const savedCol = getSavedCollection()
            setUpcomingUserReleases(generateReleasesFromUserCollection(savedCol, data.allReleases))
          }
        }
      })
      .catch((err) => {
        console.error('Error loading releases:', err)
      })
      .finally(() => {
        if (isMounted) setReleasesLoading(false)
      })

    return () => {
      isMounted = false
      clearTimeout(timer)
    }
  }, [monthIndex, year])

  // Multi-Year Monthly Navigation
  const handlePrevMonth = () => {
    if (monthIndex === 0) {
      setMonthIndex(11)
      setYear((prev) => prev - 1)
    } else {
      setMonthIndex((prev) => prev - 1)
    }
  }

  const handleNextMonth = () => {
    if (monthIndex === 11) {
      setMonthIndex(0)
      setYear((prev) => prev + 1)
    } else {
      setMonthIndex((prev) => prev + 1)
    }
  }

  // Multi-Year Quarter Navigation (moves by 3 months)
  const handlePrevQuarter = () => {
    const newRawIndex = monthIndex - 3
    if (newRawIndex < 0) {
      setMonthIndex(newRawIndex + 12)
      setYear((prev) => prev - 1)
    } else {
      setMonthIndex(newRawIndex)
    }
  }

  const handleNextQuarter = () => {
    const newRawIndex = monthIndex + 3
    if (newRawIndex > 11) {
      setMonthIndex(newRawIndex - 12)
      setYear((prev) => prev + 1)
    } else {
      setMonthIndex(newRawIndex)
    }
  }

  // Open Floating Volume Modal
  const openVolumeModal = (volumeInfo: VolumeDetailData) => {
    setSelectedVolume(volumeInfo)
    setModalOpen(true)
  }

  // Handle saving data from the Floating Volume Modal
  const handleModalSave = (savedData: {
    status: string
    purchasePrice?: number | null
    userRating?: number | null
    notes?: string | null
    coverUrl?: string
  }) => {
    if (!selectedVolume) return

    setUpcomingUserReleases((prev) =>
      prev.map((item) =>
        item.mangaId === selectedVolume.mangaId && item.volume === selectedVolume.volumeNumber
          ? {
              ...item,
              pricePLN: savedData.purchasePrice || item.pricePLN,
              cover: savedData.coverUrl || item.cover,
            }
          : item
      )
    )
  }

  // Handle adding manga volumes from AddMangaModal
  const handleAddMangaVolumes = (seriesInfo: {
    mangaId: string
    title: string
    publisher: string
    coverUrl: string
    selectedVolumes: number[]
    volumePrices: Record<number, number>
    defaultPrice: number
  }) => {
    if (seriesInfo.selectedVolumes.length > 0) {
      const highestVol = Math.max(...seriesInfo.selectedVolumes)
      const nextVol = highestVol + 1
      const newItem: UpcomingReleaseItem = {
        id: `added-${Date.now()}`,
        mangaId: seriesInfo.mangaId,
        title: seriesInfo.title,
        volume: nextVol,
        releaseDate: '15 Września 2026',
        daysLeftText: 'Wkrótce',
        cover: seriesInfo.coverUrl,
        publisher: seriesInfo.publisher,
        pricePLN: seriesInfo.defaultPrice || 34.99,
        description: `Wkrótce w sprzedaży: ${seriesInfo.title} Tom ${nextVol}`,
        isMatchingUserList: true,
      }

      setUpcomingUserReleases((prev) => [newItem, ...prev])
    }
  }

  // Handle applying releases from the Publisher Sync Scraper Modal with Diffing
  const handleApplySyncedReleases = (incomingReleases: PolishRelease[]) => {
    const diff = mergeReleasesWithDiff(allReleases, incomingReleases)
    setAllReleases(diff.merged)

    // Re-filter for current month and year
    const currentMonthName = monthsList[monthIndex]
    const filteredForMonth = diff.merged.filter(
      (rel) => rel.month.toLowerCase() === currentMonthName.toLowerCase() && rel.year === year
    )
    setReleases(filteredForMonth)
  }

  // Synchronize calendar releases with admin edits, custom items, and deleted ids
  const effectiveCalendarReleases = useMemo(() => {
    const deletedIds = new Set(getAdminDeletedReleaseIds())
    const adminEdited = getAdminEditedReleases()
    const adminCustom = getAdminCustomReleases()

    const base = (allReleases.length > 0 ? allReleases : releases).filter((r) => !deletedIds.has(r.id))
    const edited = base.map((r) => {
      const adm = adminEdited[r.id]
      if (!adm) return r
      return {
        ...r,
        publisher: adm.publisher || r.publisher,
        pricePLN: adm.pricePLN ?? r.pricePLN,
        coverUrl: adm.coverUrl || r.coverUrl,
        date: adm.releaseDate || r.date,
        day: adm.day || r.day,
        month: adm.month || r.month,
        year: adm.year || r.year,
        description: adm.description ?? r.description,
        title: `${adm.publisher}: "${adm.seriesTitle} ${adm.volumeNumber}"`,
      }
    })

    const convertedCustom: PolishRelease[] = adminCustom.map((c) => ({
      id: c.id,
      mangaId: c.mangaId || '0',
      day: c.day || '1 Wrz',
      date: c.releaseDate,
      month: c.month || 'Wrzesień',
      year: c.year || 2026,
      publisher: c.publisher,
      title: `${c.publisher}: "${c.seriesTitle} ${c.volumeNumber}"`,
      volumeNumber: c.volumeNumber,
      pricePLN: c.pricePLN,
      coverUrl: c.coverUrl,
      status: 'PREORDER',
      logoBg: 'bg-primary',
      logoText: c.publisher.slice(0, 2).toUpperCase(),
      description: c.description,
    }))

    const combined = [...convertedCustom, ...edited]
    const seen = new Set<string>()
    return combined.filter((r) => {
      if (seen.has(r.id)) return false
      seen.add(r.id)
      return true
    })
  }, [allReleases, releases])

  if (status === 'loading') {
    return (
      <div className="flex h-screen items-center justify-center bg-[#07090E]">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    )
  }

  if (!session?.user) {
    return <LandingPage />
  }

  const userName = session.user.name || 'Alex'
  const currentMonthLabel = `${monthsList[monthIndex]} ${year}`

  return (
    <div className="space-y-5 animate-in fade-in duration-300">
      {/* 1. Floating Volume Detail Modal */}
      <VolumeDetailModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        volumeData={selectedVolume}
        onSave={handleModalSave}
        isAdmin={true}
      />

      {/* 2. Floating Full Calendar Modal (Week / Month / 3-Months) */}
      <FullCalendarModal
        open={fullCalendarOpen}
        onOpenChange={setFullCalendarOpen}
        allReleases={effectiveCalendarReleases}
        currentMonth={monthsList[monthIndex]}
        monthIndex={monthIndex}
        year={year}
        onPrevMonth={handlePrevMonth}
        onNextMonth={handleNextMonth}
        onPrevQuarter={handlePrevQuarter}
        onNextQuarter={handleNextQuarter}
        onSelectVolume={(vol) => {
          setFullCalendarOpen(false)
          openVolumeModal(vol)
        }}
        onOpenSyncModal={() => {
          setFullCalendarOpen(false)
          setSyncModalOpen(true)
        }}
      />

      {/* 3. Floating Publisher Scraper Sync Modal */}
      <PublisherSyncModal
        open={syncModalOpen}
        onOpenChange={setSyncModalOpen}
        onApplyReleases={handleApplySyncedReleases}
        existingReleases={allReleases}
      />

      {/* 4. Floating Add Manga & Multi-Volume Selector Modal */}
      <AddMangaModal
        open={addMangaModalOpen}
        onOpenChange={setAddMangaModalOpen}
        onAddVolumes={handleAddMangaVolumes}
        isAdmin={true}
      />

      {/* 5. Floating Barcode Camera Scanner Modal */}
      <BarcodeScannerModal
        open={barcodeScannerOpen}
        onOpenChange={setBarcodeScannerOpen}
        onMangaAdded={() => {
          const col = getSavedCollection()
          setDashboardStats(calculateCollectionStats(col))
        }}
      />

      {/* ============================================================ */}
      {/* 1. NAGŁÓWEK MOBILNY (100% po polsku)                         */}
      {/* ============================================================ */}
      <div className="flex items-center justify-between md:hidden pb-1">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-tr from-cyan-400 via-primary to-pink-500 p-0.5 shadow-lg shadow-primary/30">
              <div className="flex h-full w-full items-center justify-center rounded-full bg-[#0D121F] text-sm font-bold text-white">
                {userName[0]}
              </div>
            </div>
          </div>
          <div>
            <h3 className="font-extrabold text-xs tracking-wider uppercase text-white mb-0.5">
              {userName.toUpperCase()}
            </h3>
            <UserRankBadge userXP={dashboardStats.ownedCount * 50 + dashboardStats.readCount * 100} />
          </div>
        </div>

        <Link href="/search">
          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full text-cyan-400 hover:bg-white/5">
            <Search className="h-4 w-4" />
          </Button>
        </Link>
      </div>

      {/* ============================================================ */}
      {/* 2. PASEK FILTRÓW TABLETOWYCH (100% po polsku)                */}
      {/* ============================================================ */}
      <div className="hidden md:flex lg:hidden flex-col gap-2 pb-1">
        <div className="flex items-center justify-between gap-3">
          <div className="relative w-44 shrink-0">
            <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <input
              placeholder="Szukaj mangi..."
              className="h-8 w-full rounded-xl bg-white/5 pl-8 pr-12 text-xs border border-white/10 text-white placeholder:text-muted-foreground focus:outline-none focus:border-primary"
            />
            <span className="absolute right-2 top-1/2 -translate-y-1/2 rounded bg-white/10 px-1 py-0.5 text-[8px] text-muted-foreground">
              Ctrl+K
            </span>
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none py-1">
            <span className="text-[11px] font-bold text-white shrink-0 mr-1">Polskie Wydawnictwa</span>
            {publisherFilters.map((pub) => {
              const isSelected = selectedPublisher === pub
              return (
                <button
                  key={pub}
                  onClick={() => setSelectedPublisher(pub)}
                  className={`shrink-0 rounded-full px-2.5 py-0.5 text-[10px] font-bold transition-all ${
                    isSelected
                      ? 'bg-cyan-400 text-black shadow-md shadow-cyan-400/30'
                      : 'bg-white/5 text-muted-foreground border border-white/10 hover:text-white'
                  }`}
                >
                  {pub}
                </button>
              )
            })}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <span className="rounded-full border border-purple-500/40 bg-purple-950/40 px-2.5 py-0.5 text-[9px] font-bold text-purple-300">
              Wydatki: <strong className="text-white">{(dashboardStats.totalValuePLN - dashboardStats.totalSavingsPLN).toLocaleString('pl-PL')} PLN</strong>
            </span>
            <span className="rounded-full border border-cyan-500/40 bg-cyan-950/40 px-2.5 py-0.5 text-[9px] font-bold text-cyan-300">
              Wartość: <strong className="text-white">{dashboardStats.totalValuePLN.toLocaleString('pl-PL')} PLN</strong>
            </span>
          </div>
        </div>
      </div>

      {/* ============================================================ */}
      {/* 3. GŁÓWNY UKŁAD 2-KOLUMNOWY (Wyrównany do góry i do dołu)    */}
      {/* ============================================================ */}
      <div className="grid gap-5 lg:grid-cols-12 items-stretch">
        {/* LEWA KOLUMNA: Hero Banner + Cel + Czytane + 4 Statystyki */}
        <div className="lg:col-span-8 space-y-4">
          {/* Hero Banner w lewej kolumnie z Celem Czytelniczym */}
          <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-[#0E1322]/90 p-5 shadow-xl">
            <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-purple-900/30 via-primary/10 to-transparent" />
            <div
              className="absolute right-0 top-0 bottom-0 w-1/2 -z-10 bg-cover bg-right opacity-25 mix-blend-luminosity"
              style={{
                backgroundImage: `url('https://s4.anilist.co/file/anilistcdn/media/manga/banner/30012.jpg')`,
              }}
            />

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="max-w-md space-y-1">
                <div className="inline-flex items-center gap-1.5 rounded-full border border-cyan-500/30 bg-cyan-500/10 px-2.5 py-0.5 text-[10px] font-semibold text-cyan-400">
                  <Sparkles className="h-3 w-3 animate-pulse" />
                  <span>MangOwO PL</span>
                </div>
                <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-white">
                  Witaj ponownie, {userName}! 👋
                </h1>
                <p className="text-xs text-muted-foreground font-medium">
                  Twoja kolekcja mangi stale się powiększa!
                </p>
              </div>

              {/* Monthly Reading Goal Progress Badge */}
              <div className="flex items-center gap-3 bg-white/[0.04] p-3 rounded-2xl border border-white/10 backdrop-blur-md shrink-0">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-cyan-500 to-purple-600 text-white shadow-md">
                  <Trophy className="h-5 w-5" />
                </div>
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-[11px] font-bold">
                    <span className="text-white">Cel na {monthsList[monthIndex]}:</span>
                    <span className="text-cyan-300 font-extrabold">{dashboardStats.monthlyGoalRead}/{dashboardStats.monthlyGoalTotal} tomów</span>
                  </div>
                  <div className="h-1.5 w-32 rounded-full bg-white/10 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-purple-400 transition-all duration-500"
                      style={{ width: `${Math.min(100, (dashboardStats.monthlyGoalRead / Math.max(1, dashboardStats.monthlyGoalTotal)) * 100)}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Najbliższe Premiery w Twoich Seriach (Zgadzające się z Twoją Półką) */}
          <div className="rounded-2xl border border-white/10 bg-[#0C101D]/90 p-4 shadow-xl">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <h2 className="text-sm sm:text-base font-extrabold text-white tracking-tight flex items-center gap-1.5">
                  <CalendarIcon className="h-4 w-4 text-cyan-400" />
                  Najbliższe Premiery w Twoich Seriach
                </h2>
                <span className="text-[10px] text-cyan-300 font-bold px-2 py-0.5 rounded-full bg-cyan-950/60 border border-cyan-500/30">
                  Pokrywa się z Twoją Półką ({upcomingUserReleases.length})
                </span>
              </div>

              {/* Working Carousel Navigation Arrows */}
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  disabled={releaseOffset === 0}
                  onClick={() => setReleaseOffset((prev) => Math.max(0, prev - 1))}
                  className="h-6 w-6 rounded-lg bg-white/5 text-muted-foreground hover:text-white disabled:opacity-30"
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  disabled={releaseOffset + 5 >= upcomingUserReleases.length}
                  onClick={() =>
                    setReleaseOffset((prev) =>
                      Math.min(Math.max(0, upcomingUserReleases.length - 5), prev + 1)
                    )
                  }
                  className="h-6 w-6 rounded-lg bg-white/5 text-muted-foreground hover:text-white disabled:opacity-30"
                >
                  <ChevronRight className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>

            {/* Karty Najbliższych Premier z Neonowymi Ramkami (skalowane do 5 na 2xl+) */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 2xl:grid-cols-5 gap-3">
              {upcomingUserReleases.length === 0 ? (
                <div className="col-span-full rounded-2xl border border-white/10 bg-[#0C101D]/80 p-6 text-center">
                  <Sparkles className="h-7 w-7 text-cyan-400 mx-auto mb-2 opacity-80" />
                  <h3 className="text-sm font-bold text-white mb-1">Wszystkie Twoje serie są aktualne!</h3>
                  <p className="text-xs text-muted-foreground max-w-md mx-auto mb-3">
                    Brak zapowiedzianych nowych tomów dla serii z Twojej półki w najbliższych dniach.
                  </p>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setFullCalendarOpen(true)}
                    className="border-cyan-500/40 text-cyan-300 hover:bg-cyan-950/40 text-xs font-bold"
                  >
                    <CalendarIcon className="h-3.5 w-3.5 mr-1.5" />
                    Przeglądaj wszystkie zapowiedzi wydawców
                  </Button>
                </div>
              ) : (
                upcomingUserReleases.slice(releaseOffset, releaseOffset + 5).map((item, idx) => {
                  // Neon glow border colors matching the design mockup image
                  const neonBorders = [
                    'border-2 border-indigo-500 shadow-[0_0_16px_rgba(99,102,241,0.4)]',
                    'border-2 border-purple-500 shadow-[0_0_16px_rgba(168,85,247,0.4)]',
                    'border-2 border-cyan-400 shadow-[0_0_16px_rgba(34,211,238,0.4)]',
                    'border-2 border-pink-500 shadow-[0_0_16px_rgba(236,72,153,0.4)]',
                    'border-2 border-emerald-500 shadow-[0_0_16px_rgba(16,185,129,0.4)]',
                  ]
                  const glowStyle = neonBorders[idx % neonBorders.length]

                  const displayTitle =
                    item.title.toLowerCase().includes(`tom ${item.volume}`) ||
                    item.title.toLowerCase().includes(`vol. ${item.volume}`)
                      ? item.title
                      : `${item.title} — Tom ${item.volume}`

                  return (
                    <div
                      key={item.id}
                      onClick={() =>
                        openVolumeModal({
                          mangaId: item.mangaId,
                          volumeNumber: item.volume,
                          title: item.title,
                          coverUrl: item.cover,
                          publisher: item.publisher || 'Waneko',
                          pricePLN: item.pricePLN || 34.99,
                          description: item.description,
                          status: 'WISHLIST',
                          purchasePrice: item.pricePLN,
                        })
                      }
                      className="group relative flex flex-col text-left rounded-2xl bg-[#0E1424] p-2 transition-all duration-300 hover:-translate-y-1 cursor-pointer"
                    >
                      <div
                        className={`relative aspect-[2/3] w-full overflow-hidden rounded-xl bg-black/60 shadow-xl transition-all duration-300 ${glowStyle}`}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={getCoverUrl(item.cover)}
                          alt={item.title}
                          referrerPolicy="no-referrer"
                          crossOrigin="anonymous"
                          onError={(e) => {
                            ;(e.target as HTMLImageElement).src = verifiedCovers[idx % verifiedCovers.length]
                          }}
                          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                        />

                        {/* Days Left Badge on top */}
                        <div className="absolute top-1.5 left-1.5 rounded-md bg-black/80 backdrop-blur-xs px-2 py-0.5 text-[9px] font-extrabold text-cyan-300 border border-cyan-500/30">
                          {item.daysLeftText}
                        </div>

                        {/* Quick Actions Hover Overlay */}
                        <div className="absolute inset-0 bg-black/80 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-1.5 p-2 backdrop-blur-xs">
                          <Button
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation()
                              openVolumeModal({
                                mangaId: item.mangaId,
                                volumeNumber: item.volume,
                                title: item.title,
                                coverUrl: item.cover,
                                publisher: item.publisher,
                                pricePLN: item.pricePLN,
                                description: item.description,
                                status: 'OWNED',
                              })
                            }}
                            className="w-full h-7 text-[10px] font-bold bg-primary hover:bg-primary/80 text-white rounded-lg gap-1 shadow-md"
                          >
                            <Plus className="h-3 w-3" />
                            Dodaj do Półki
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={(e) => {
                              e.stopPropagation()
                              alert(`Ustawiono alert cenowy na premierę ${item.title} Tom ${item.volume}!`)
                            }}
                            className="w-full h-7 text-[10px] font-bold border-cyan-500/50 bg-cyan-950/40 text-cyan-300 hover:bg-cyan-500 hover:text-white rounded-lg gap-1"
                          >
                            <Sparkles className="h-3 w-3" />
                            Ustaw Alert
                          </Button>
                        </div>

                        {/* Release Date overlay */}
                        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/95 via-black/75 to-transparent p-1.5 pointer-events-none">
                          <div className="flex items-center justify-between text-[9px] font-bold text-white mb-0.5">
                            <span className="text-white/90">{item.releaseDate}</span>
                            <span className="text-emerald-400 font-extrabold">{item.pricePLN.toFixed(2)} zł</span>
                          </div>
                        </div>
                      </div>

                      {/* Title & Publisher */}
                      <div className="mt-2 min-w-0 px-0.5">
                        <h4 className="font-extrabold text-xs text-white truncate group-hover:text-cyan-300 transition-colors">
                          {displayTitle}
                        </h4>
                        <p className="text-[9px] text-muted-foreground truncate font-medium mt-0.5">
                          Wydawca: <span className="text-cyan-300 font-semibold">{item.publisher}</span>
                        </p>
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </div>

          {/* 4 Interaktywne Karty Statystyk z Przekierowaniami */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {/* 1. Posiadane Tomy -> Link do Mojej Półki */}
            <Link href="/collection" className="block group">
              <div className="flex flex-col justify-between rounded-xl border border-white/10 bg-[#0C101D]/90 p-3.5 shadow-md hover:border-purple-500/50 hover:bg-[#0E1426] transition-all">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-muted-foreground group-hover:text-white transition-colors">
                    Posiadane Tomy
                  </span>
                  <div className="flex h-6 w-6 items-center justify-center rounded-md bg-purple-500/20 text-purple-400 group-hover:scale-110 transition-transform">
                    <BookOpen className="h-3.5 w-3.5" />
                  </div>
                </div>
                <div className="mt-2">
                  <div className="flex items-baseline justify-between">
                    <span className="text-xl font-black text-white">{dashboardStats.ownedCount}</span>
                    <ArrowUpRight className="h-3.5 w-3.5 text-muted-foreground group-hover:text-purple-400 transition-colors" />
                  </div>
                  <p className="text-[10px] font-semibold text-emerald-400 mt-0.5">W Twojej Kolekcji</p>
                </div>
              </div>
            </Link>

            {/* 2. Wartość Kolekcji -> Link do Statystyk Finansowych */}
            <Link href="/stats" className="block group">
              <div className="flex flex-col justify-between rounded-xl border border-white/10 bg-[#0C101D]/90 p-3.5 shadow-md hover:border-emerald-500/50 hover:bg-[#0E1426] transition-all">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-muted-foreground group-hover:text-white transition-colors">
                    Wartość Kolekcji
                  </span>
                  <div className="flex h-6 w-6 items-center justify-center rounded-md bg-emerald-500/20 text-emerald-400 group-hover:scale-110 transition-transform">
                    <TrendingUp className="h-3.5 w-3.5" />
                  </div>
                </div>
                <div className="mt-2">
                  <div className="flex items-baseline justify-between">
                    <div className="text-xl font-black text-white">
                      {dashboardStats.totalValuePLN.toLocaleString('pl-PL')}{' '}
                      <span className="text-[10px] font-normal text-muted-foreground">PLN</span>
                    </div>
                    <ArrowUpRight className="h-3.5 w-3.5 text-muted-foreground group-hover:text-emerald-400 transition-colors" />
                  </div>
                  <div className="mt-0.5 h-2.5 w-full">
                    <svg className="h-full w-full text-emerald-400" viewBox="0 0 100 20" fill="none">
                      <path
                        d="M0 15 Q25 5, 50 12 T100 4"
                        stroke="currentColor"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                      />
                    </svg>
                  </div>
                </div>
              </div>
            </Link>

            {/* 3. Miesięczne Oszczędności -> Link do Szukania Okazji */}
            <Link href="/search" className="block group">
              <div className="flex flex-col justify-between rounded-xl border border-white/10 bg-[#0C101D]/90 p-3.5 shadow-md hover:border-pink-500/50 hover:bg-[#0E1426] transition-all">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-muted-foreground group-hover:text-white transition-colors">
                    Oszczędności
                  </span>
                  <div className="flex h-6 w-6 items-center justify-center rounded-md bg-pink-500/20 text-pink-400 group-hover:scale-110 transition-transform">
                    <PiggyBank className="h-3.5 w-3.5" />
                  </div>
                </div>
                <div className="mt-2">
                  <div className="flex items-baseline justify-between">
                    <div className="text-xl font-black text-white">
                      {dashboardStats.totalSavingsPLN.toLocaleString('pl-PL')}{' '}
                      <span className="text-[10px] font-normal text-muted-foreground">PLN</span>
                    </div>
                    <ArrowUpRight className="h-3.5 w-3.5 text-muted-foreground group-hover:text-pink-400 transition-colors" />
                  </div>
                  <span className="inline-block mt-0.5 rounded bg-emerald-500/15 px-1 py-0.2 text-[9px] font-bold text-emerald-400">
                    Zaoszczędzone na promocjach
                  </span>
                </div>
              </div>
            </Link>

            {/* 4. Przeczytane Tomy -> Link do Przeczytanych */}
            <Link href="/collection" className="block group">
              <div className="flex flex-col justify-between rounded-xl border border-white/10 bg-[#0C101D]/90 p-3.5 shadow-md hover:border-cyan-500/50 hover:bg-[#0E1426] transition-all">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-muted-foreground group-hover:text-white transition-colors">
                    Przeczytane Tomy
                  </span>
                  <div className="flex h-6 w-6 items-center justify-center rounded-md bg-cyan-500/20 text-cyan-400 group-hover:scale-110 transition-transform">
                    <Eye className="h-3.5 w-3.5" />
                  </div>
                </div>
                <div className="mt-2">
                  <div className="flex items-baseline justify-between">
                    <div className="text-xl font-black text-white">
                      {dashboardStats.readCount}{' '}
                      <span className="text-[10px] font-normal text-muted-foreground">/ {dashboardStats.ownedCount}</span>
                    </div>
                    <ArrowUpRight className="h-3.5 w-3.5 text-muted-foreground group-hover:text-cyan-400 transition-colors" />
                  </div>
                  <p className="text-[10px] font-medium text-muted-foreground mt-0.5">
                    Postęp:{' '}
                    {dashboardStats.ownedCount > 0
                      ? Math.round((dashboardStats.readCount / dashboardStats.ownedCount) * 100)
                      : 0}
                    % przeczytano
                  </p>
                </div>
              </div>
            </Link>
          </div>
        </div>

        {/* PRAWA KOLUMNA: Szybkie Akcje + Kalendarz Premier z Otwieraniem Pełnego Kalendarza */}
        <div className="lg:col-span-4 flex flex-col justify-between h-full space-y-4">
          {/* Szybkie Akcje z Neonową Świecącą Otoczką według Designu */}
          <div className="rounded-2xl border-2 border-purple-500/60 bg-[#0E1224]/95 p-4 sm:p-5 shadow-[0_0_25px_rgba(168,85,247,0.25)] ring-1 ring-purple-500/40 shrink-0">
            <h3 className="text-sm font-black text-white mb-3 tracking-wide">Szybkie Akcje</h3>

            <div className="space-y-2">
              <button
                type="button"
                onClick={() => setAddMangaModalOpen(true)}
                className="flex w-full items-center gap-2.5 rounded-full border border-purple-500/40 bg-purple-950/30 px-3.5 py-2.5 text-xs font-bold text-white transition-all hover:bg-purple-900/40 hover:border-purple-300 hover:shadow-md hover:shadow-purple-500/20"
              >
                <Plus className="h-3.5 w-3.5 text-cyan-400" />
                <span>Dodaj Mangę do Kolekcji</span>
              </button>

              <button
                type="button"
                onClick={() =>
                  openVolumeModal({
                    mangaId: '101517',
                    volumeNumber: 27,
                    title: 'Jujutsu Kaisen',
                    coverUrl: verifiedCovers[1],
                    publisher: 'Waneko',
                    pricePLN: 34.99,
                    status: 'READ',
                    description: 'Zapisz swój aktualny postęp czytania i ocenę tomu.',
                  })
                }
                className="flex w-full items-center gap-2.5 rounded-full border border-purple-500/40 bg-purple-950/30 px-3.5 py-2.5 text-xs font-bold text-white transition-all hover:bg-purple-900/40 hover:border-purple-300 hover:shadow-md hover:shadow-purple-500/20"
              >
                <Check className="h-3.5 w-3.5 text-purple-400" />
                <span>Zapisz Postęp Czytania</span>
              </button>

              <button
                type="button"
                onClick={() => setSyncModalOpen(true)}
                className="flex w-full items-center gap-2.5 rounded-full border border-cyan-500/40 bg-cyan-950/30 px-3.5 py-2.5 text-xs font-bold text-cyan-300 transition-all hover:bg-cyan-900/40 hover:border-cyan-300 hover:shadow-md hover:shadow-cyan-500/20"
              >
                <RefreshCw className="h-3.5 w-3.5 text-cyan-400" />
                <span>Zaciągnij Plan Wydawnictwa</span>
              </button>

              <button
                type="button"
                onClick={() => setBarcodeScannerOpen(true)}
                className="flex w-full items-center gap-2.5 rounded-full border border-purple-500/40 bg-purple-950/30 px-3.5 py-2.5 text-xs font-bold text-white transition-all hover:bg-purple-900/40 hover:border-purple-300 hover:shadow-md hover:shadow-purple-500/20"
              >
                <Barcode className="h-3.5 w-3.5 text-cyan-400" />
                <span>Skanuj Kod ISBN (Aparat)</span>
              </button>
            </div>
          </div>

          {/* Nadchodzące Polskie Premiery -> Kliknięcie w nagłówek/ikonę otwiera FullCalendarModal */}
          <div className="rounded-2xl border border-white/10 bg-[#0C101D]/90 p-4 sm:p-5 shadow-xl flex-1 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setFullCalendarOpen(true)}
                  className="text-left group flex items-center gap-1.5 focus:outline-none"
                >
                  <h3 className="text-sm font-extrabold text-white group-hover:text-primary transition-colors">
                    Nadchodzące Polskie Premiery
                  </h3>
                  <Maximize2 className="h-3 w-3 text-muted-foreground group-hover:text-primary transition-colors" />
                </button>

                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setFullCalendarOpen(true)}
                    className="h-7 w-7 rounded-lg text-purple-400 hover:bg-white/10"
                    title="Eksportuj kalendarz (.ics)"
                  >
                    <Download className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setFullCalendarOpen(true)}
                    className="h-7 w-7 rounded-lg text-cyan-400 hover:bg-white/10"
                    title="Otwórz pełny widok kalendarza"
                  >
                    <Maximize2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>

              {/* Interaktywny Wybór Miesiąca i Roku */}
              <div className="flex items-center justify-between mt-2 mb-3 bg-white/5 p-1 rounded-lg border border-white/10">
                <span className="text-[11px] font-bold text-white px-2">{currentMonthLabel}</span>
                <div className="flex items-center gap-0.5">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handlePrevMonth}
                    className="h-5 w-5 rounded text-muted-foreground hover:text-white"
                  >
                    <ChevronLeft className="h-3 w-3" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleNextMonth}
                    className="h-5 w-5 rounded text-muted-foreground hover:text-white"
                  >
                    <ChevronRight className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            </div>

            {/* Lista premier (4 pozycje) */}
            {(() => {
              const now = new Date()
              const todayIso = now.toISOString().slice(0, 10)
              const currentYear = now.getFullYear()
              const currentMonthIdx = now.getMonth()
              const isPastMonth = year < currentYear || (year === currentYear && monthIndex < currentMonthIdx)
              const isCurrentMonth = year === currentYear && monthIndex === currentMonthIdx

              const displayReleases = releases.filter((rel) => {
                if (!matchPublisher(rel.publisher, selectedPublisher)) return false
                if (isCurrentMonth) {
                  return !rel.date || rel.date >= todayIso
                }
                return true
              })

              if (releasesLoading) {
                return (
                  <div className="flex flex-col items-center justify-center py-6 gap-2">
                    <Loader2 className="h-5 w-5 animate-spin text-primary" />
                    <span className="text-[11px] text-muted-foreground">Pobieranie premier...</span>
                  </div>
                )
              }

              if (displayReleases.length === 0) {
                return (
                  <div className="py-6 px-3 text-center rounded-xl bg-white/[0.02] border border-white/5 space-y-2.5 my-1">
                    <p className="text-xs text-muted-foreground">
                      {isPastMonth
                        ? `Brak zarejestrowanych premier w tym miesiącu (${currentMonthLabel}).`
                        : `Brak nadchodzących premier w tym miesiącu (${currentMonthLabel}).`}
                    </p>
                    <div className="flex flex-col items-center gap-1.5 pt-0.5">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={handleNextMonth}
                        className="h-7 text-[11px] font-bold border-cyan-500/30 text-cyan-300 hover:bg-cyan-950/40 w-full max-w-[200px]"
                      >
                        Kolejny miesiąc →
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setFullCalendarOpen(true)}
                        className="h-6 text-[10px] text-muted-foreground hover:text-white"
                      >
                        Otwórz pełny kalendarz
                      </Button>
                    </div>
                  </div>
                )
              }

              return (
                <div className="space-y-2.5 my-1">
                  {displayReleases.slice(0, 4).map((rel, idx) => (
                    <button
                      key={rel.id}
                      type="button"
                      onClick={() =>
                        openVolumeModal({
                          mangaId: rel.mangaId || '125862',
                          volumeNumber: rel.volumeNumber || 1,
                          title: cleanReleaseTitle(rel.title),
                          coverUrl: rel.coverUrl || verifiedCovers[idx % verifiedCovers.length],
                          publisher: rel.publisher,
                          pricePLN: rel.pricePLN,
                          description: rel.description || `Oficjalne wydanie tomu ${rel.volumeNumber} wydawnictwa ${rel.publisher}.`,
                          status: 'WISHLIST',
                        })
                      }
                      className="flex w-full items-center justify-between p-2 rounded-xl bg-white/[0.03] border border-white/5 hover:border-primary/50 hover:bg-white/[0.06] transition-all group text-left focus:outline-none"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="relative h-10 w-7 shrink-0 overflow-hidden rounded-md bg-black/40 border border-white/10 shadow-sm">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={rel.coverUrl}
                            alt={rel.title}
                            onError={(e) => {
                              ;(e.target as HTMLImageElement).src = verifiedCovers[idx % verifiedCovers.length]
                            }}
                            className="h-full w-full object-cover transition-transform group-hover:scale-105"
                          />
                        </div>

                        <div className="min-w-0">
                          <div className="flex items-center gap-1">
                            <span className="text-[10px] font-bold text-cyan-300">{rel.day}</span>
                            <span className="text-[9px] text-muted-foreground">• Tom {rel.volumeNumber}</span>
                          </div>
                          <h4 className="text-[11px] font-bold text-white truncate group-hover:text-primary transition-colors">
                            {rel.title}
                          </h4>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-[9px] text-emerald-400 font-semibold">{rel.pricePLN.toFixed(2)} PLN</span>
                            <span className="text-[8px] text-muted-foreground group-hover:text-cyan-300 flex items-center gap-0.5">
                              Sprawdź ceny <ExternalLink className="h-2 w-2" />
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${rel.logoBg} text-[9px] font-black text-white shadow-md group-hover:scale-110 transition-transform`}>
                        {rel.logoText}
                      </div>
                    </button>
                  ))}
                </div>
              )
            })()}
          </div>
        </div>
      </div>
    </div>
  )
}
