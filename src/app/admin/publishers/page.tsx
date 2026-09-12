'use client'

import { useState } from 'react'
import { Plus, Edit, Trash2, ExternalLink } from 'lucide-react'
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

const mockPublishers = [
  { id: '1', name: 'Waneko', website: 'https://waneko.pl', _count: { mangas: 45 } },
  { id: '2', name: 'Studio JG', website: 'https://studiojg.pl', _count: { mangas: 32 } },
  { id: '3', name: 'JPF', website: 'https://jpf.com.pl', _count: { mangas: 28 } },
  { id: '4', name: 'Kinokuniya', website: null, _count: { mangas: 12 } },
]

export default function PublishersPage() {
  const [publishers, setPublishers] = useState(mockPublishers)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingPublisher, setEditingPublisher] = useState<(typeof mockPublishers)[0] | null>(null)
  const [form, setForm] = useState({ name: '', website: '' })

  const handleAdd = () => {
    setEditingPublisher(null)
    setForm({ name: '', website: '' })
    setDialogOpen(true)
  }

  const handleEdit = (publisher: (typeof mockPublishers)[0]) => {
    setEditingPublisher(publisher)
    setForm({ name: publisher.name, website: publisher.website || '' })
    setDialogOpen(true)
  }

  const handleSave = () => {
    if (editingPublisher) {
      setPublishers(publishers.map((p) => (p.id === editingPublisher.id ? { ...p, ...form } : p)))
    } else {
      const newPublisher = {
        id: String(publishers.length + 1),
        ...form,
        _count: { mangas: 0 },
      }
      setPublishers([...publishers, newPublisher])
    }
    setDialogOpen(false)
  }

  const handleDelete = (id: string) => {
    setPublishers(publishers.filter((p) => p.id !== id))
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Wydawcy</h2>
          <p className="text-muted-foreground">Zarządzanie polskimi wydawcami manga</p>
        </div>
        <Button onClick={handleAdd}>
          <Plus className="mr-2 h-4 w-4" />
          Dodaj wydawcę
        </Button>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nazwa</TableHead>
              <TableHead>Strona WWW</TableHead>
              <TableHead className="text-center">Manga</TableHead>
              <TableHead className="w-[100px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {publishers.map((publisher) => (
              <TableRow key={publisher.id}>
                <TableCell className="font-medium">{publisher.name}</TableCell>
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
                <TableCell className="text-center">{publisher._count.mangas}</TableCell>
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
                      className="h-8 w-8"
                      onClick={() => handleDelete(publisher.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingPublisher ? 'Edytuj wydawcę' : 'Dodaj wydawcę'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
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
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                Anuluj
              </Button>
              <Button onClick={handleSave}>Zapisz</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
