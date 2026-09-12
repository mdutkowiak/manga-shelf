'use client'

import { useState, useEffect, useMemo } from 'react'
import { CalendarDays, ArrowLeft, Loader2 } from 'lucide-react'
import Link from 'next/link'
import { CalendarView } from '@/components/manga/calendar-view'
import { VolumeDetailModal, type VolumeDetailData } from '@/components/manga/volume-detail-modal'
import { PublisherSyncModal } from '@/components/manga/publisher-sync-modal'
import type { PolishRelease } from '@/app/api/releases/route'
import {
  getAdminCustomReleases,
  getAdminEditedReleases,
  getAdminDeletedReleaseIds,
} from '@/lib/admin-store'
import { mergeReleasesWithDiff } from '@/lib/publisher-scraper'

const polishMonths = [
  'Styczeń',
  'Luty',
  'Marzec',
  'Kwiecień',
  'Maj',
  'Czerwiec',
  'Lipiec',
  'Sierpień',
  'Wrzesień',
  'Październik',
  'Listopad',
  'Grudzień',
]

export default function CalendarPage() {
  const now = new Date()
  const [monthIndex, setMonthIndex] = useState(now.getMonth())
  const [year, setYear] = useState(now.getFullYear())

  const [allReleases, setAllReleases] = useState<PolishRelease[]>([])
  const [loading, setLoading] = useState(true)

  // Floating Volume Detail Modal State
  const [volumeModalOpen, setVolumeModalOpen] = useState(false)
  const [selectedVolume, setSelectedVolume] = useState<VolumeDetailData | null>(null)

  // Sync Modal State
  const [syncModalOpen, setSyncModalOpen] = useState(false)

  // Load releases from /api/releases
  const loadReleases = async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/releases?all=true')
      if (res.ok) {
        const data = await res.json()
        setAllReleases(data.allReleases || data.releases || [])
      }
    } catch (err) {
      console.error('Error fetching calendar releases:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const timer = setTimeout(() => {
      loadReleases()
    }, 0)

    const handleAdminUpdate = () => loadReleases()
    window.addEventListener('mangowo_admin_updated', handleAdminUpdate)
    return () => {
      clearTimeout(timer)
      window.removeEventListener('mangowo_admin_updated', handleAdminUpdate)
    }
  }, [])

  // Synchronize releases with admin overrides (custom, edited, deleted)
  const effectiveReleases = useMemo(() => {
    const deletedIds = new Set(getAdminDeletedReleaseIds())
    const adminEdited = getAdminEditedReleases()
    const adminCustom = getAdminCustomReleases()

    const base = allReleases.filter((r) => !deletedIds.has(r.id))
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
  }, [allReleases])

  // Navigation handlers
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

  const handlePrevQuarter = () => {
    const newIndex = monthIndex - 3
    if (newIndex < 0) {
      setMonthIndex(newIndex + 12)
      setYear((prev) => prev - 1)
    } else {
      setMonthIndex(newIndex)
    }
  }

  const handleNextQuarter = () => {
    const newIndex = monthIndex + 3
    if (newIndex > 11) {
      setMonthIndex(newIndex - 12)
      setYear((prev) => prev + 1)
    } else {
      setMonthIndex(newIndex)
    }
  }

  const handleResetToToday = () => {
    const today = new Date()
    setMonthIndex(today.getMonth())
    setYear(today.getFullYear())
  }

  const handleSelectVolume = (vol: VolumeDetailData) => {
    setSelectedVolume(vol)
    setVolumeModalOpen(true)
  }

  const handleApplySyncedReleases = (incomingReleases: PolishRelease[]) => {
    const diff = mergeReleasesWithDiff(allReleases, incomingReleases)
    setAllReleases(diff.merged)
  }

  const currentMonthName = polishMonths[monthIndex]

  return (
    <div className="space-y-6 animate-in fade-in-50 duration-300 pb-16">
      {/* Floating Volume Detail Modal */}
      <VolumeDetailModal
        open={volumeModalOpen}
        onOpenChange={setVolumeModalOpen}
        volumeData={selectedVolume}
        isAdmin={true}
      />

      {/* Floating Publisher Scraper Sync Modal */}
      <PublisherSyncModal
        open={syncModalOpen}
        onOpenChange={setSyncModalOpen}
        onApplyReleases={handleApplySyncedReleases}
        existingReleases={allReleases}
      />

      {/* Top Breadcrumb & Page Info */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-white mb-2"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Powrót do strony głównej
          </Link>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-tr from-cyan-500/20 to-purple-500/20 border border-cyan-500/30 text-cyan-400 shadow-md">
              <CalendarDays className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
                Kalendarz Premier Mang w Polsce
              </h1>
              <p className="text-xs text-muted-foreground mt-0.5">
                Harmonogram wydań, widok ścienny, tygodnie i integracja z Twoją biblioteczką
              </p>
            </div>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-24 gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <span className="text-xs text-muted-foreground">Ładowanie bazy premier...</span>
        </div>
      ) : (
        <CalendarView
          allReleases={effectiveReleases}
          currentMonth={currentMonthName}
          monthIndex={monthIndex}
          year={year}
          onPrevMonth={handlePrevMonth}
          onNextMonth={handleNextMonth}
          onPrevQuarter={handlePrevQuarter}
          onNextQuarter={handleNextQuarter}
          onSelectVolume={handleSelectVolume}
          onOpenSyncModal={() => setSyncModalOpen(true)}
          onResetToToday={handleResetToToday}
          isFullScreen={true}
        />
      )}
    </div>
  )
}
