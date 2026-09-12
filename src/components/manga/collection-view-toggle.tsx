'use client'

import { LayoutGrid, List } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export type ViewMode = 'grid' | 'list'

interface CollectionViewToggleProps {
  view: ViewMode
  onChange: (view: ViewMode) => void
}

export function CollectionViewToggle({ view, onChange }: CollectionViewToggleProps) {
  return (
    <div className="flex items-center rounded-lg border bg-muted p-0.5">
      <Button
        variant="ghost"
        size="icon-sm"
        onClick={() => onChange('grid')}
        className={cn(
          'h-7 w-7',
          view === 'grid' && 'bg-background shadow-sm text-foreground'
        )}
      >
        <LayoutGrid className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="icon-sm"
        onClick={() => onChange('list')}
        className={cn(
          'h-7 w-7',
          view === 'list' && 'bg-background shadow-sm text-foreground'
        )}
      >
        <List className="h-4 w-4" />
      </Button>
    </div>
  )
}
