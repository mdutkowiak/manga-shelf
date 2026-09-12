'use client'

import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import {
  Edit2,
  Save,
  ImageIcon,
  ShoppingCart,
  ShieldAlert,
} from 'lucide-react'
import type { AdminCustomRelease } from '@/lib/admin-store'
import { getCoverUrl } from '@/lib/cover-utils'

interface AdminReleaseEditModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  release: AdminCustomRelease | null
  onSave: (updatedRelease: AdminCustomRelease) => void
}

export function AdminReleaseEditModal({
  open,
  onOpenChange,
  release,
  onSave,
}: AdminReleaseEditModalProps) {
  const [form, setForm] = useState<AdminCustomRelease>({
    id: '',
    seriesTitle: '',
    volumeNumber: 1,
    releaseDate: '2026-10-02',
    day: '2 Paź',
    month: 'Październik',
    year: 2026,
    publisher: 'Studio JG',
    pricePLN: 36.99,
    coverUrl: '',
    shopUrl: '',
    ignoreScraper: true,
    description: '',
  })

  const [urlInput, setUrlInput] = useState('')

  useEffect(() => {
    if (release && open) {
      const timer = setTimeout(() => {
        setForm({
          ...release,
          shopUrl: release.shopUrl || '',
          description: release.description || '',
          ignoreScraper: release.ignoreScraper !== false,
        })
        setUrlInput(release.coverUrl || '')
      }, 0)
      return () => clearTimeout(timer)
    }
  }, [release, open])

  const handleUrlPaste = (url: string) => {
    const clean = url.trim()
    setUrlInput(clean)
    setForm((prev) => ({ ...prev, coverUrl: clean }))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.seriesTitle.trim()) return

    const dateObj = new Date(form.releaseDate)
    const shortMonths = ['Sty', 'Lut', 'Mar', 'Kwi', 'Maj', 'Cze', 'Lip', 'Sie', 'Wrz', 'Paź', 'Lis', 'Gru']
    const fullMonths = ['Styczeń', 'Luty', 'Marzec', 'Kwiecień', 'Maj', 'Czerwiec', 'Lipiec', 'Sierpień', 'Wrzesień', 'Październik', 'Listopad', 'Grudzień']

    const dayNum = !isNaN(dateObj.getTime()) ? dateObj.getDate() : 2
    const monthIdx = !isNaN(dateObj.getTime()) ? dateObj.getMonth() : 9
    const yearNum = !isNaN(dateObj.getTime()) ? dateObj.getFullYear() : 2026

    const updated: AdminCustomRelease = {
      ...form,
      seriesTitle: form.seriesTitle.trim(),
      volumeNumber: Number(form.volumeNumber) || 1,
      pricePLN: Number(form.pricePLN) || 34.99,
      day: `${dayNum} ${shortMonths[monthIdx]}`,
      month: fullMonths[monthIdx],
      year: yearNum,
      coverUrl: form.coverUrl || urlInput || 'https://s4.anilist.co/file/anilistcdn/media/manga/cover/large/bx117195-2s5b3n4pZ9Ea.jpg',
    }

    onSave(updated)
    onOpenChange(false)
  }

  if (!release) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl w-[92vw] sm:max-w-4xl md:max-w-5xl bg-[#090D18]/98 border-white/15 text-white backdrop-blur-2xl rounded-3xl p-0 overflow-hidden shadow-2xl transition-all duration-300">
        <DialogHeader className="p-6 sm:p-7 pb-4 border-b border-white/10 bg-white/[0.02]">
          <div className="flex items-center gap-3.5">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 shadow-md">
              <Edit2 className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-2xl font-extrabold text-white tracking-wide">
                Edycja Premiery Kalendarza
              </DialogTitle>
              <DialogDescription className="text-xs sm:text-sm text-muted-foreground mt-0.5">
                Zarządzaj szczegółami premiery, linkiem do sklepu oraz okładką tomu — zmiany natychmiast odświeżają całą witrynę.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="p-6 sm:p-8 space-y-6">
          <div className="grid gap-8 md:grid-cols-12 items-start">
            {/* Left Column: Live 2:3 Cover Preview */}
            <div className="md:col-span-4 flex flex-col items-center space-y-3 bg-white/[0.02] p-5 rounded-2xl border border-white/10">
              <Label className="text-xs font-bold text-cyan-300 uppercase tracking-wider self-start flex items-center gap-1.5">
                <ImageIcon className="h-4 w-4" />
                Podgląd Okładki (2:3)
              </Label>

              <div className="relative aspect-[2/3] w-full max-w-[220px] overflow-hidden rounded-2xl bg-black border border-white/15 shadow-2xl group">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={getCoverUrl(form.coverUrl || urlInput)}
                  alt={form.seriesTitle}
                  referrerPolicy="no-referrer"
                  crossOrigin="anonymous"
                  onError={(e) => {
                    ;(e.target as HTMLImageElement).src = 'https://s4.anilist.co/file/anilistcdn/media/manga/cover/large/bx117195-2s5b3n4pZ9Ea.jpg'
                  }}
                  className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                />

                <div className="absolute top-2.5 left-2.5 rounded-lg bg-black/85 backdrop-blur-md px-2.5 py-1 text-xs font-black text-cyan-300 border border-cyan-500/40 shadow-md">
                  {form.day || 'Premiera'}
                </div>

                <div className="absolute bottom-2.5 left-2.5 right-2.5 rounded-xl bg-black/90 backdrop-blur-md p-2 text-center border border-white/15 shadow-lg">
                  <span className="text-xs font-extrabold text-white block truncate">{form.seriesTitle} #{form.volumeNumber}</span>
                  <span className="text-xs font-black text-emerald-400 mt-0.5 block">{form.pricePLN.toFixed(2)} PLN</span>
                </div>
              </div>

              <div className="text-center">
                <Badge variant="outline" className="text-[10px] font-semibold border-white/20 text-muted-foreground px-3 py-1">
                  Pełny podgląd wykadrowanej grafiki
                </Badge>
              </div>
            </div>

            {/* Right Column: Form Inputs with generous width */}
            <div className="md:col-span-8 space-y-5">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Wydawnictwo</Label>
                  <select
                    value={form.publisher}
                    onChange={(e) => setForm({ ...form, publisher: e.target.value })}
                    className="w-full h-10.5 rounded-xl bg-white/5 border border-white/15 text-sm text-white px-3.5 focus:outline-none focus:border-primary font-medium"
                  >
                    <option value="Studio JG" className="bg-[#090D18]">Studio JG</option>
                    <option value="Waneko" className="bg-[#090D18]">Waneko</option>
                    <option value="J.P.Fantastica" className="bg-[#090D18]">J.P.Fantastica</option>
                    <option value="Kotori" className="bg-[#090D18]">Kotori</option>
                    <option value="Dango" className="bg-[#090D18]">Dango</option>
                    <option value="Hanami" className="bg-[#090D18]">Hanami</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Tytuł serii mangi</Label>
                  <Input
                    value={form.seriesTitle}
                    onChange={(e) => setForm({ ...form, seriesTitle: e.target.value })}
                    className="bg-white/5 border-white/15 text-sm h-10.5 rounded-xl text-white font-extrabold px-3.5 focus:border-primary"
                    placeholder="np. Oshi no Ko, Chainsaw Man..."
                    required
                  />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Numer tomu</Label>
                  <Input
                    type="number"
                    min="1"
                    value={form.volumeNumber}
                    onChange={(e) => setForm({ ...form, volumeNumber: parseInt(e.target.value, 10) || 1 })}
                    className="bg-white/5 border-white/15 text-sm h-10.5 rounded-xl text-white font-black px-3.5 focus:border-primary"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-bold uppercase tracking-wider text-emerald-400">Cena (PLN)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={form.pricePLN}
                    onChange={(e) => setForm({ ...form, pricePLN: parseFloat(e.target.value) || 34.99 })}
                    className="bg-emerald-950/20 border-emerald-500/30 text-sm h-10.5 rounded-xl text-emerald-300 font-black px-3.5 focus:border-emerald-400"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Data premiery</Label>
                  <Input
                    type="date"
                    value={form.releaseDate}
                    onChange={(e) => setForm({ ...form, releaseDate: e.target.value })}
                    className="bg-white/5 border-white/15 text-sm h-10.5 rounded-xl text-white px-3.5 focus:border-primary"
                    required
                  />
                </div>
              </div>

              {/* Cover URL Input */}
              <div className="space-y-1.5">
                <Label className="text-xs font-bold uppercase tracking-wider text-cyan-300 flex items-center gap-1.5">
                  <ImageIcon className="h-4 w-4 text-cyan-400" />
                  URL Okładki tomu (Bezpośredni link ze zdjęcia)
                </Label>
                <div className="flex gap-2">
                  <Input
                    placeholder="https://encrypted-tbn1.gstatic.com/... lub https://..."
                    value={urlInput}
                    onChange={(e) => handleUrlPaste(e.target.value)}
                    className="bg-white/5 border-white/15 text-xs sm:text-sm h-10.5 rounded-xl text-white flex-1 px-3.5 focus:border-primary"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => handleUrlPaste(urlInput)}
                    className="border-white/15 text-xs font-bold h-10.5 px-4 rounded-xl hover:bg-white/10 shrink-0"
                  >
                    Użyj Linku
                  </Button>
                </div>
              </div>

              {/* Shop Link Input */}
              <div className="space-y-1.5">
                <Label className="text-xs font-bold uppercase tracking-wider text-cyan-300 flex items-center gap-1.5">
                  <ShoppingCart className="h-4 w-4 text-cyan-400" />
                  Link do sklepu (Pre-order URL)
                </Label>
                <Input
                  placeholder="https://yatta.pl/... lub https://waneko.pl/..."
                  value={form.shopUrl}
                  onChange={(e) => setForm({ ...form, shopUrl: e.target.value })}
                  className="bg-cyan-950/20 border-cyan-500/30 text-xs sm:text-sm h-10.5 rounded-xl text-cyan-200 px-3.5 focus:border-cyan-400 font-medium"
                />
              </div>

              {/* Priority Checkbox */}
              <div className="pt-2">
                <label className="flex items-center gap-2.5 text-xs sm:text-sm font-bold text-amber-300 cursor-pointer p-3 rounded-xl bg-amber-950/20 border border-amber-500/30">
                  <input
                    type="checkbox"
                    checked={form.ignoreScraper !== false}
                    onChange={(e) => setForm({ ...form, ignoreScraper: e.target.checked })}
                    className="rounded border-white/20 bg-white/5 text-primary focus:ring-primary h-4 w-4"
                  />
                  <ShieldAlert className="h-4.5 w-4.5 text-amber-400 shrink-0" />
                  <span>Wpis priorytetowy (Zastosuj zmiany we wszystkich sekcjach strony)</span>
                </label>
              </div>
            </div>
          </div>

          <div className="space-y-1.5 pt-4 border-t border-white/10">
            <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Opis tomiku / wydania</Label>
            <Textarea
              placeholder="Opis tomu lub uwagi wydawcy..."
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              rows={2}
              className="bg-white/5 border-white/15 text-sm rounded-xl text-white resize-none p-3 focus:border-primary"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3">
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              className="text-xs sm:text-sm text-muted-foreground hover:text-white px-5 rounded-xl"
            >
              Anuluj
            </Button>
            <Button
              type="submit"
              className="bg-gradient-to-r from-primary to-cyan-500 font-extrabold text-xs sm:text-sm h-11 px-7 text-white rounded-xl shadow-lg shadow-primary/25 gap-2"
            >
              <Save className="h-4 w-4" />
              Zapisz Zmiany i Aktualizuj Stronę
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
