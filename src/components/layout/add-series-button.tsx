'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus } from 'lucide-react'
import { cn } from '@/lib/utils'
import { AddMangaModal } from '@/components/manga/add-manga-modal'
import { addOrUpdateSeriesInCollection } from '@/lib/collection-store'

interface AddSeriesButtonProps {
  /** `full` – przycisk z napisem (desktop), `icon` – sama ikona z etykietą dla czytników ekranu, `stacked` – ikona nad napisem (pasek boczny). */
  variant?: 'full' | 'icon' | 'stacked'
  className?: string
}

/** Stały przycisk „Dodaj serię” dostępny w nawigacji na każdej stronie. */
export function AddSeriesButton({ variant = 'full', className }: AddSeriesButtonProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Dodaj serię"
        className={cn(
          'inline-flex shrink-0 items-center justify-center rounded-full bg-primary font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
          variant === 'full' && 'h-10 w-10 text-sm xl:w-auto xl:gap-1.5 xl:px-4',
          variant === 'icon' && 'h-11 w-11',
          variant === 'stacked' && 'w-14 flex-col gap-1 rounded-xl py-2 text-[11px]',
          className
        )}
      >
        <Plus className={variant === 'full' ? 'h-4 w-4' : 'h-5 w-5'} aria-hidden="true" />
        {variant === 'full' && <span className="hidden xl:inline">Dodaj serię</span>}
        {variant === 'stacked' && <span aria-hidden="true">Dodaj</span>}
      </button>

      <AddMangaModal
        open={open}
        onOpenChange={setOpen}
        onAddVolumes={(seriesInfo) => {
          addOrUpdateSeriesInCollection(seriesInfo)
          router.push('/collection')
        }}
        isAdmin={true}
      />
    </>
  )
}
