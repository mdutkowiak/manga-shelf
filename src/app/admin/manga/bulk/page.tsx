'use client'

import { useState } from 'react'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { bulkCreateVolumes } from '@/lib/actions/manga'

export default function BulkImportPage() {
  const [loading, setLoading] = useState(false)
  const [mangaId, setMangaId] = useState('')
  const [startVolume, setStartVolume] = useState(1)
  const [endVolume, setEndVolume] = useState(20)
  const [basePrice, setBasePrice] = useState(29.99)
  const [baseIsbn, setBaseIsbn] = useState('978-83-')
  const [result, setResult] = useState<{ count: number } | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const data = await bulkCreateVolumes({
        mangaId,
        startVolume,
        endVolume,
        basePrice,
        baseIsbn: baseIsbn || undefined,
      })

      if (data.success && 'count' in data) {
        setResult({ count: data.count || 0 })
      }
    } catch (error) {
      console.error('Bulk import error:', error)
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
          <h2 className="text-lg font-semibold">Masowy Import Tomów</h2>
          <p className="text-muted-foreground">Szybkie tworzenie wielu tomów naraz</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Parametry importu</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="mangaId">ID Manga</Label>
              <Input
                id="mangaId"
                value={mangaId}
                onChange={(e) => setMangaId(e.target.value)}
                placeholder="np. abc123..."
                required
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="startVolume">Od tomu</Label>
                <Input
                  id="startVolume"
                  type="number"
                  min="1"
                  value={startVolume}
                  onChange={(e) => setStartVolume(parseInt(e.target.value))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="endVolume">Do tomu</Label>
                <Input
                  id="endVolume"
                  type="number"
                  min="1"
                  value={endVolume}
                  onChange={(e) => setEndVolume(parseInt(e.target.value))}
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="basePrice">Cena bazowa (PLN)</Label>
                <Input
                  id="basePrice"
                  type="number"
                  step="0.01"
                  min="0"
                  value={basePrice}
                  onChange={(e) => setBasePrice(parseFloat(e.target.value))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="baseIsbn">ISBN bazowy</Label>
                <Input
                  id="baseIsbn"
                  value={baseIsbn}
                  onChange={(e) => setBaseIsbn(e.target.value)}
                  placeholder="978-83-"
                />
              </div>
            </div>

            <div className="rounded-md bg-muted p-4">
              <p className="text-sm">
                Zostanie utworzonych <strong>{endVolume - startVolume + 1}</strong> tomów
                {baseIsbn && (
                  <span className="text-muted-foreground">
                    {' '}
                    z numerami ISBN: {baseIsbn}
                    {startVolume} - {baseIsbn}
                    {endVolume}
                  </span>
                )}
              </p>
            </div>

            {result && (
              <div className="rounded-md bg-green-50 p-4 text-green-800 dark:bg-green-950 dark:text-green-200">
                <p className="text-sm font-medium">✅ Pomyślnie utworzono {result.count} tomów</p>
              </div>
            )}

            <div className="flex justify-end gap-2">
              <Link href="/admin/manga">
                <Button type="button" variant="outline">
                  Anuluj
                </Button>
              </Link>
              <Button type="submit" disabled={loading}>
                {loading ? 'Importowanie...' : 'Importuj tomy'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
