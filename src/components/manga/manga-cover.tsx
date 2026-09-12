'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'
import { Check, BookmarkPlus, BookOpen } from 'lucide-react'

interface MangaCoverProps {
  id: string
  title: string
  coverUrl: string | null
  customCoverUrl?: string | null
  volumeNumber: number
  isOwned: boolean
  purchasePrice?: number | null
  status?: string | null
  onToggle: (id: string) => Promise<{ success: boolean; status: string | null }>
}

export function MangaCover({
  id,
  title,
  coverUrl,
  customCoverUrl,
  volumeNumber,
  isOwned,
  purchasePrice,
  status,
  onToggle,
}: MangaCoverProps) {
  const [owned, setOwned] = useState(isOwned)
  const [isUpdating, setIsUpdating] = useState(false)

  const handleClick = async () => {
    setIsUpdating(true)
    // Optimistic UI - natychmiastowa zmiana
    setOwned(!owned)

    try {
      const result = await onToggle(id)
      if (!result.success) {
        // Cofnij zmianę w razie błędu
        setOwned(isOwned)
      }
    } catch {
      setOwned(isOwned)
    } finally {
      setIsUpdating(false)
    }
  }

  const currentStatus = status || (owned ? 'OWNED' : 'NONE')

  return (
    <div className="group relative flex flex-col items-center">
      {/* Cover Card Button */}
      <button
        onClick={handleClick}
        disabled={isUpdating}
        className={cn(
          'relative aspect-[2/3] w-full overflow-hidden rounded-2xl transition-all duration-300',
          'border bg-card/80 backdrop-blur-md',
          owned
            ? 'border-primary/60 shadow-xl shadow-primary/25 ring-1 ring-primary/40 hover:shadow-2xl hover:shadow-primary/40'
            : 'border-border/60 hover:border-primary/40 hover:shadow-lg',
          'hover:-translate-y-1.5 focus:outline-none focus:ring-2 focus:ring-primary',
          isUpdating && 'cursor-wait opacity-75 animate-pulse'
        )}
      >
        {customCoverUrl || coverUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={customCoverUrl || coverUrl || ''}
            alt={`${title} tom ${volumeNumber}`}
            className={cn(
              'h-full w-full object-cover transition-all duration-500',
              !owned && 'grayscale opacity-40 contrast-125'
            )}
          />
        ) : (
          <div
            className={cn(
              'flex h-full w-full items-center justify-center bg-muted/60',
              !owned && 'grayscale opacity-40'
            )}
          >
            <BookOpen className="h-10 w-10 text-muted-foreground" />
          </div>
        )}

        {/* Status Indicator Chip */}
        <div
          className={cn(
            'absolute top-2 right-2 flex h-6 w-6 items-center justify-center rounded-full transition-all shadow-md',
            owned
              ? 'bg-emerald-500 text-white shadow-emerald-500/50'
              : 'bg-black/70 text-muted-foreground border border-white/10 backdrop-blur-md'
          )}
        >
          {owned ? <Check className="h-3.5 w-3.5 stroke-[3]" /> : <BookmarkPlus className="h-3.5 w-3.5" />}
        </div>

        {/* Volume number gradient bar */}
        <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/95 via-black/60 to-transparent p-2 text-center">
          <span className="text-xs font-bold text-white tracking-wide">
            Tom {volumeNumber}
          </span>
        </div>
      </button>

      {/* Floating pedestal shadow effect */}
      <div className="w-4/5 h-1.5 bg-primary/20 rounded-full blur-sm -mt-0.5 group-hover:bg-primary/40 transition-colors" />

      {/* Title & Status Metadata */}
      <div className="mt-2.5 w-full text-center space-y-1">
        <p className="text-xs font-bold leading-tight text-foreground line-clamp-1 group-hover:text-primary transition-colors">
          {title}
        </p>

        <div className="flex items-center justify-center gap-1.5 flex-wrap">
          {owned ? (
            <span className="inline-flex items-center rounded-full bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 text-[10px] font-bold text-emerald-400">
              POSIADANE
            </span>
          ) : currentStatus === 'WISHLIST' ? (
            <span className="inline-flex items-center rounded-full bg-purple-500/15 border border-purple-500/30 px-2 py-0.5 text-[10px] font-bold text-purple-400">
              WISHLISTA
            </span>
          ) : (
            <span className="inline-flex items-center rounded-full bg-muted/60 border border-border/50 px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
              BRAKUJE
            </span>
          )}

          {purchasePrice && (
            <span className="text-[11px] font-extrabold text-cyan-400">
              {purchasePrice.toFixed(2)} zł
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
