'use client'

import { useState } from 'react'
import { Filter, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'

export interface CollectionFilters {
  status: ('OWNED' | 'WISHLIST' | 'ORDERED')[]
  publishers: string[]
  sortBy: 'title' | 'volumeNumber' | 'pricePLN' | 'releaseDate'
  sortOrder: 'asc' | 'desc'
}

interface CollectionFilterProps {
  publishers: string[]
  filters: CollectionFilters
  onChange: (filters: CollectionFilters) => void
}

const statusOptions = [
  { value: 'OWNED' as const, label: 'Posiadane' },
  { value: 'WISHLIST' as const, label: 'Lista życzeń' },
  { value: 'ORDERED' as const, label: 'Zamówione' },
]

const sortOptions = [
  { value: 'title' as const, label: 'Tytuł' },
  { value: 'volumeNumber' as const, label: 'Numer tomu' },
  { value: 'pricePLN' as const, label: 'Cena' },
  { value: 'releaseDate' as const, label: 'Data premiery' },
]

export function CollectionFilter({ publishers, filters, onChange }: CollectionFilterProps) {
  const [open, setOpen] = useState(false)

  const activeFiltersCount = filters.status.length + filters.publishers.length

  const toggleStatus = (status: 'OWNED' | 'WISHLIST' | 'ORDERED') => {
    const newStatus = filters.status.includes(status)
      ? filters.status.filter((s) => s !== status)
      : [...filters.status, status]
    onChange({ ...filters, status: newStatus })
  }

  const togglePublisher = (publisher: string) => {
    const newPublishers = filters.publishers.includes(publisher)
      ? filters.publishers.filter((p) => p !== publisher)
      : [...filters.publishers, publisher]
    onChange({ ...filters, publishers: newPublishers })
  }

  const clearFilters = () => {
    onChange({
      status: [],
      publishers: [],
      sortBy: 'title',
      sortOrder: 'asc',
    })
  }

  return (
    <div className="flex items-center gap-2">
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger render={<Button variant="outline" size="sm" />}>
            <Filter className="mr-2 h-4 w-4" />
            Filtry
            {activeFiltersCount > 0 && (
              <Badge variant="secondary" className="ml-2">
                {activeFiltersCount}
              </Badge>
            )}
        </SheetTrigger>
        <SheetContent side="bottom" className="h-[80vh]">
          <SheetHeader>
            <SheetTitle>Filtrowanie kolekcji</SheetTitle>
          </SheetHeader>

          <div className="mt-6 space-y-6">
            {/* Status */}
            <div>
              <Label className="text-sm font-medium">Status</Label>
              <div className="mt-2 space-y-2">
                {statusOptions.map((option) => (
                  <div key={option.value} className="flex items-center space-x-2">
                    <Checkbox
                      id={`status-${option.value}`}
                      checked={filters.status.includes(option.value)}
                      onCheckedChange={() => toggleStatus(option.value)}
                    />
                    <label
                      htmlFor={`status-${option.value}`}
                      className="text-sm leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    >
                      {option.label}
                    </label>
                  </div>
                ))}
              </div>
            </div>

            {/* Publishers */}
            <div>
              <Label className="text-sm font-medium">Wydawca</Label>
              <div className="mt-2 max-h-40 space-y-2 overflow-y-auto">
                {publishers.map((publisher) => (
                  <div key={publisher} className="flex items-center space-x-2">
                    <Checkbox
                      id={`publisher-${publisher}`}
                      checked={filters.publishers.includes(publisher)}
                      onCheckedChange={() => togglePublisher(publisher)}
                    />
                    <label
                      htmlFor={`publisher-${publisher}`}
                      className="text-sm leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    >
                      {publisher}
                    </label>
                  </div>
                ))}
              </div>
            </div>

            {/* Sort */}
            <div>
              <Label className="text-sm font-medium">Sortuj wg</Label>
              <div className="mt-2 flex flex-wrap gap-2">
                {sortOptions.map((option) => (
                  <Button
                    key={option.value}
                    variant={filters.sortBy === option.value ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => onChange({ ...filters, sortBy: option.value })}
                  >
                    {option.label}
                  </Button>
                ))}
              </div>
            </div>

            {/* Clear */}
            {activeFiltersCount > 0 && (
              <Button variant="ghost" onClick={clearFilters} className="w-full">
                <X className="mr-2 h-4 w-4" />
                Wyczyść filtry
              </Button>
            )}
          </div>
        </SheetContent>
      </Sheet>

      {/* Active filters badges */}
      {filters.status.map((status) => (
        <Badge key={status} variant="secondary" className="gap-1">
          {statusOptions.find((o) => o.value === status)?.label}
          <button onClick={() => toggleStatus(status)}>
            <X className="h-3 w-3" />
          </button>
        </Badge>
      ))}
      {filters.publishers.map((publisher) => (
        <Badge key={publisher} variant="secondary" className="gap-1">
          {publisher}
          <button onClick={() => togglePublisher(publisher)}>
            <X className="h-3 w-3" />
          </button>
        </Badge>
      ))}
    </div>
  )
}
