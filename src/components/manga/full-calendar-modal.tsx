'use client'

import {
  Dialog,
  DialogContent,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import type { PolishRelease } from '@/app/api/releases/route'
import type { VolumeDetailData } from '@/components/manga/volume-detail-modal'
import { CalendarView } from '@/components/manga/calendar-view'

interface FullCalendarModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  allReleases: PolishRelease[]
  currentMonth: string
  monthIndex: number
  year: number
  onPrevMonth: () => void
  onNextMonth: () => void
  onPrevQuarter: () => void
  onNextQuarter: () => void
  onSelectVolume: (volume: VolumeDetailData) => void
  onOpenSyncModal: () => void
}

export function FullCalendarModal({
  open,
  onOpenChange,
  allReleases = [],
  currentMonth,
  monthIndex,
  year,
  onPrevMonth,
  onNextMonth,
  onPrevQuarter,
  onNextQuarter,
  onSelectVolume,
  onOpenSyncModal,
}: FullCalendarModalProps) {
  const handleResetToToday = () => {
    const now = new Date()
    const targetMonth = now.getMonth()
    const targetYear = now.getFullYear()
    const diffMonths = (targetYear - year) * 12 + (targetMonth - monthIndex)
    if (diffMonths > 0) {
      for (let i = 0; i < diffMonths; i++) onNextMonth()
    } else if (diffMonths < 0) {
      for (let i = 0; i < Math.abs(diffMonths); i++) onPrevMonth()
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl w-[95vw] bg-[#090D18]/98 border-white/15 text-white backdrop-blur-3xl shadow-2xl rounded-3xl p-0 overflow-hidden sm:max-w-6xl">
        <div className="p-4 sm:p-6 max-h-[85vh] overflow-y-auto">
          <CalendarView
            allReleases={allReleases}
            currentMonth={currentMonth}
            monthIndex={monthIndex}
            year={year}
            onPrevMonth={onPrevMonth}
            onNextMonth={onNextMonth}
            onPrevQuarter={onPrevQuarter}
            onNextQuarter={onNextQuarter}
            onSelectVolume={onSelectVolume}
            onOpenSyncModal={onOpenSyncModal}
            onResetToToday={handleResetToToday}
            isFullScreen={false}
          />
        </div>

        {/* Footer */}
        <div className="p-3 sm:p-4 border-t border-white/10 bg-[#070A12] flex items-center justify-between">
          <span className="text-xs text-muted-foreground">
            Łącznie w bazie: <strong className="text-white">{allReleases.length} premier</strong>
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
            className="text-xs border-white/15 text-white hover:bg-white/10 rounded-xl font-bold"
          >
            Zamknij
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
