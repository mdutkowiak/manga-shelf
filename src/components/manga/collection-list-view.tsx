'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'
import { Check, BookmarkPlus, BookOpen } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import type { VolumeWithManga } from './collection-grid'

interface CollectionListViewProps {
  volumes: VolumeWithManga[]
  onToggle: (id: string) => Promise<{ success: boolean; status: string | null }>
}

const statusLabels: Record<string, { label: string; variant: 'default' | 'secondary' | 'outline' }> = {
  OWNED: { label: 'Posiadane', variant: 'default' },
  READ: { label: 'Przeczytane', variant: 'secondary' },
  WISHLIST: { label: 'Chcę kupić', variant: 'outline' },
  ORDERED: { label: 'Zamówione', variant: 'outline' },
  PREORDER: { label: 'Przedsprzedaż', variant: 'outline' },
}

export function CollectionListView({ volumes, onToggle }: CollectionListViewProps) {
  const [updatingId, setUpdatingId] = useState<string | null>(null)

  const handleToggle = async (id: string) => {
    setUpdatingId(id)
    try {
      await onToggle(id)
    } finally {
      setUpdatingId(null)
    }
  }

  if (volumes.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <BookOpen className="mb-4 h-12 w-12 text-muted-foreground" />
        <p className="text-lg font-medium">Brak tomów</p>
        <p className="text-sm text-muted-foreground">Dodaj mangi do kolekcji, aby zobaczyć je tutaj</p>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {volumes.map((volume) => {
        const status = volume.collection?.status
        const statusInfo = status ? statusLabels[status] : null
        const isOwned = status === 'OWNED'

        return (
          <div
            key={volume.id}
            className={cn(
              'flex items-center gap-4 rounded-lg border p-3 transition-colors hover:bg-muted/50',
              updatingId === volume.id && 'opacity-60'
            )}
          >
            {/* Cover thumbnail */}
            <div className="relative h-16 w-12 flex-shrink-0">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={volume.customCoverUrl || volume.coverImage || volume.manga.defaultCover || ''}
                alt={`${volume.manga.title} tom ${volume.volumeNumber}`}
                className="h-full w-full rounded object-cover"
              />
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <p className="font-medium truncate">{volume.manga.title}</p>
              <p className="text-sm text-muted-foreground">Tom {volume.volumeNumber}</p>
            </div>

            {/* Publisher */}
            <div className="hidden sm:block">
              <p className="text-sm text-muted-foreground">{volume.manga.publisher?.name || '-'}</p>
            </div>

            {/* Price */}
            <div className="hidden sm:block w-20 text-right">
              {volume.pricePLN ? (
                <p className="text-sm font-medium">{volume.pricePLN.toFixed(2)} zł</p>
              ) : (
                <p className="text-sm text-muted-foreground">-</p>
              )}
            </div>

            {/* Status */}
            <div className="w-24">
              {statusInfo ? (
                <Badge variant={statusInfo.variant} className="text-xs">
                  {statusInfo.label}
                </Badge>
              ) : (
                <Badge variant="outline" className="text-xs text-muted-foreground">
                  W kolekcji
                </Badge>
              )}
            </div>

            {/* Toggle button */}
            <button
              onClick={() => handleToggle(volume.id)}
              disabled={updatingId === volume.id}
              className={cn(
                'flex h-8 w-8 items-center justify-center rounded-full transition-all',
                isOwned
                  ? 'bg-green-500 text-white hover:bg-green-600'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
              )}
            >
              {isOwned ? <Check className="h-4 w-4" /> : <BookmarkPlus className="h-4 w-4" />}
            </button>
          </div>
        )
      })}
    </div>
  )
}
