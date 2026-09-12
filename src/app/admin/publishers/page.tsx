'use client'

import { useState, useEffect, useCallback } from 'react'
import { Plus, Edit, Trash2, ExternalLink, Loader2, Building2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

import { getCoverUrl } from '@/lib/cover-utils'

interface PublisherItem {
  id: string
  name: string
  website: string | null
  logo?: string | null
  _count: {
    mangas: number
  }
}

export default function PublishersPage() {
  const [publishers, setPublishers] = useState<PublisherItem[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingPublisher, setEditingPublisher] = useState<PublisherItem | null>(null)
  const [form, setForm] = useState({ name: '', website: '', logo: '' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchPublishers = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/publishers')
      if (res.ok) {
        const data = await res.json()
        setPublishers(data.publishers || [])
      }
    } catch (err) {
      console.error('Błąd podczas pobierania wydawców:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchPublishers()
  }, [fetchPublishers])

  const handleAdd = () => {
    setEditingPublisher(null)
    setForm({ name: '', website: '', logo: '' })
    setError(null)
    setDialogOpen(true)
  }

  const handleEdit = (publisher: PublisherItem) => {
    setEditingPublisher(publisher)
    setForm({ name: publisher.name, website: publisher.website || '', logo: publisher.logo || '' })
    setError(null)
    setDialogOpen(true)
  }

  const handleSave = async () => {
    if (!form.name.trim()) {
      setError('Nazwa wydawcy jest wymagana')
      return
    }

    setSaving(true)
    setError(null)

    try {
      if (editingPublisher) {
        const res = await fetch('/api/admin/publishers', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: editingPublisher.id,
            name: form.name.trim(),
            website: form.website.trim() || null,
            logo: form.logo.trim() || null,
          }),
        })
        const data = await res.json()
        if (!res.ok) {
          setError(data.error || 'Błąd podczas aktualizacji')
          return
        }
      } else {
        const res = await fetch('/api/admin/publishers', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: form.name.trim(),
            website: form.website.trim() || null,
            logo: form.logo.trim() || null,
          }),
        })
        const data = await res.json()
        if (!res.ok) {
          setError(data.error || 'Błąd podczas dodawania')
          return
        }
      }

      setDialogOpen(false)
      fetchPublishers()
    } catch {
      setError('Błąd połączenia z serwerem')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Czy na pewno chcesz usunąć wydawcę "${name}"?`)) return

    try {
      const res = await fetch(`/api/admin/publishers?id=${encodeURIComponent(id)}`, {
        method: 'DELETE',
      })
      if (res.ok) {
        setPublishers((prev) => prev.filter((p) => p.id !== id))
      }
    } catch (err) {
      console.error('Błąd usuwania:', err)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Building2 className="h-5 w-5 text-primary" />
            Wydawcy
          </h2>
          <p className="text-muted-foreground text-xs">Zarządzanie polskimi wydawcami manga w bazie danych</p>
        </div>
        <Button onClick={handleAdd}>
          <Plus className="mr-2 h-4 w-4" />
          Dodaj wydawcę
        </Button>
      </div>

      <div className="rounded-md border">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-12 gap-2 text-xs text-muted-foreground">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
            <span>Wczytywanie wydawców z bazy danych...</span>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nazwa</TableHead>
                <TableHead>Strona WWW</TableHead>
                <TableHead className="text-center">Mangi w bazie</TableHead>
                <TableHead className="w-[100px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {publishers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-8 text-xs text-muted-foreground">
                    Brak wydawców w bazie danych. Dodaj pierwszego wydawcę klikając przycisk powyżej.
                  </TableCell>
                </TableRow>
              ) : (
                publishers.map((publisher) => (
                  <TableRow key={publisher.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-3">
                        <div className="relative flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/5 border border-white/15 overflow-hidden shadow-sm">
                          {publisher.logo ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={getCoverUrl(publisher.logo)}
                              alt={publisher.name}
                              referrerPolicy="no-referrer"
                              className="h-full w-full object-cover"
                              onError={(e) => {
                                ;(e.target as HTMLImageElement).style.display = 'none'
                              }}
                            />
                          ) : (
                            <span className="text-[10px] font-black text-cyan-300">
                              {publisher.name.slice(0, 2).toUpperCase()}
                            </span>
                          )}
                        </div>
                        <span className="font-extrabold text-sm text-white">{publisher.name}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {publisher.website ? (
                        <a
                          href={publisher.website}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center text-sm text-blue-600 hover:underline dark:text-blue-400"
                        >
                          {publisher.website}
                          <ExternalLink className="ml-1 h-3 w-3" />
                        </a>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-center">{publisher._count?.mangas || 0}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => handleEdit(publisher)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-rose-400 hover:text-rose-300 hover:bg-rose-950/20"
                          onClick={() => handleDelete(publisher.id, publisher.name)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingPublisher ? 'Edytuj wydawcę' : 'Dodaj wydawcę'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {error && (
              <div className="p-2.5 text-xs rounded-lg bg-rose-500/15 border border-rose-500/30 text-rose-300 font-medium">
                {error}
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="name">Nazwa</Label>
              <Input
                id="name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="np. Waneko"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="website">Strona WWW</Label>
              <Input
                id="website"
                value={form.website}
                onChange={(e) => setForm({ ...form, website: e.target.value })}
                placeholder="https://waneko.pl"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="logo">Logo wydawcy (URL obrazka)</Label>
              <div className="flex items-center gap-3">
                <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/5 border border-white/20 overflow-hidden">
                  {form.logo ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={getCoverUrl(form.logo)}
                      alt="Podgląd logo"
                      referrerPolicy="no-referrer"
                      className="h-full w-full object-cover"
                      onError={(e) => {
                        ;(e.target as HTMLImageElement).style.display = 'none'
                      }}
                    />
                  ) : (
                    <Building2 className="h-5 w-5 text-muted-foreground" />
                  )}
                </div>
                <Input
                  id="logo"
                  value={form.logo}
                  onChange={(e) => setForm({ ...form, logo: e.target.value })}
                  placeholder="https://.../logo.png lub favicon.ico"
                  className="flex-1"
                />
              </div>
              <p className="text-[11px] text-muted-foreground">Wklej bezpośredni link URL do okrągłego logo/ikony wydawcy.</p>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>
                Anuluj
              </Button>
              <Button onClick={handleSave} disabled={saving}>
                {saving ? 'Zapisywanie...' : 'Zapisz'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
