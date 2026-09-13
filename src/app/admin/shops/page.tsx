'use client'

import { useState, useEffect, useCallback } from 'react'
import { Plus, Edit, Trash2, ExternalLink, Loader2, ShoppingBag, Check, Globe } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'

interface ShopItem {
  id: string
  name: string
  url: string
  country: string
  logo?: string | null
  isActive: boolean
  _count?: {
    prices: number
  }
}

export default function AdminShopsPage() {
  const [shops, setShops] = useState<ShopItem[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingShop, setEditingShop] = useState<ShopItem | null>(null)
  const [form, setForm] = useState({
    name: '',
    url: '',
    country: 'PL',
    logo: '',
    isActive: true,
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)

  const fetchShops = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/shops')
      if (res.ok) {
        const data = await res.json()
        setShops(data.shops || [])
      }
    } catch (err) {
      console.error('Błąd pobierania sklepów:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchShops()
  }, [fetchShops])

  const handleAdd = () => {
    setEditingShop(null)
    setForm({
      name: '',
      url: '',
      country: 'PL',
      logo: '',
      isActive: true,
    })
    setError(null)
    setDialogOpen(true)
  }

  const handleEdit = (shop: ShopItem) => {
    setEditingShop(shop)
    setForm({
      name: shop.name,
      url: shop.url,
      country: shop.country || 'PL',
      logo: shop.logo || '',
      isActive: shop.isActive,
    })
    setError(null)
    setDialogOpen(true)
  }

  const handleSave = async () => {
    if (!form.name.trim() || !form.url.trim()) {
      setError('Nazwa i adres URL sklepu są wymagane')
      return
    }

    setSaving(true)
    setError(null)

    try {
      if (editingShop) {
        const res = await fetch('/api/shops', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: editingShop.id,
            name: form.name.trim(),
            url: form.url.trim(),
            country: form.country.trim() || 'PL',
            logo: form.logo.trim() || null,
            isActive: form.isActive,
          }),
        })
        const data = await res.json()
        if (!res.ok) {
          setError(data.error || 'Błąd podczas aktualizacji sklepu')
          return
        }
      } else {
        const res = await fetch('/api/shops', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: form.name.trim(),
            url: form.url.trim(),
            country: form.country.trim() || 'PL',
            logo: form.logo.trim() || null,
            isActive: form.isActive,
          }),
        })
        const data = await res.json()
        if (!res.ok) {
          setError(data.error || 'Błąd podczas dodawania sklepu')
          return
        }
      }

      setDialogOpen(false)
      fetchShops()
    } catch {
      setError('Błąd połączenia z serwerem')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/shops?id=${id}`, {
        method: 'DELETE',
      })
      if (res.ok) {
        setShops((prev) => prev.filter((s) => s.id !== id))
        setDeleteConfirmId(null)
      } else {
        const data = await res.json()
        alert(data.error || 'Błąd podczas usuwania sklepu')
      }
    } catch {
      alert('Błąd połączenia z serwerem')
    }
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-5">
        <div>
          <div className="inline-flex items-center gap-1.5 rounded-full border border-cyan-500/30 bg-cyan-500/10 px-3 py-0.5 text-[11px] font-bold text-cyan-300 mb-1">
            <ShoppingBag className="h-3.5 w-3.5" />
            <span>Porównywarka i Oferty</span>
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight">Księgarnie i Sklepy Mangi</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Zarządzaj sklepami, ich logotypami oraz linkami zakupowymi do poszczególnych tomów mangi
          </p>
        </div>

        <Button
          onClick={handleAdd}
          className="bg-gradient-to-r from-primary to-cyan-500 hover:from-primary/90 hover:to-cyan-400 text-white font-bold text-xs h-10 px-4 rounded-xl gap-2 shadow-lg shadow-primary/20 self-start sm:self-auto"
        >
          <Plus className="h-4 w-4" />
          Dodaj Sklep
        </Button>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-2">
          <Loader2 className="h-8 w-8 animate-spin text-cyan-400" />
          <span className="text-xs text-muted-foreground">Wczytywanie listy sklepów...</span>
        </div>
      ) : shops.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-white/15 p-12 text-center space-y-3">
          <ShoppingBag className="h-10 w-10 text-muted-foreground mx-auto" />
          <h3 className="text-sm font-bold text-white">Brak zdefiniowanych sklepów</h3>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto">
            Dodaj pierwsze księgarnie internetowe, aby móc podpinać linki i ceny do tomów w edycji serii.
          </p>
          <Button onClick={handleAdd} size="sm" className="gap-2">
            <Plus className="h-3.5 w-3.5" /> Dodaj Pierwszy Sklep
          </Button>
        </div>
      ) : (
        <div className="rounded-2xl border border-white/10 bg-[#0C101D]/80 overflow-hidden shadow-xl">
          <Table>
            <TableHeader>
              <TableRow className="border-white/10 hover:bg-transparent">
                <TableHead className="text-xs font-bold text-muted-foreground w-16">Logo</TableHead>
                <TableHead className="text-xs font-bold text-muted-foreground">Nazwa Sklepu</TableHead>
                <TableHead className="text-xs font-bold text-muted-foreground">Strona WWW</TableHead>
                <TableHead className="text-xs font-bold text-muted-foreground text-center">Kraj</TableHead>
                <TableHead className="text-xs font-bold text-muted-foreground text-center">Status</TableHead>
                <TableHead className="text-xs font-bold text-muted-foreground text-right pr-6">Akcje</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {shops.map((shop) => (
                <TableRow key={shop.id} className="border-white/5 hover:bg-white/[0.02]">
                  <TableCell className="py-3">
                    <div className="h-9 w-9 rounded-xl overflow-hidden bg-black/40 border border-white/10 flex items-center justify-center shrink-0">
                      {shop.logo ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={shop.logo}
                          alt={shop.name}
                          className="h-full w-full object-contain p-1"
                          onError={(e) => {
                            ;(e.target as HTMLElement).style.display = 'none'
                          }}
                        />
                      ) : (
                        <Globe className="h-4 w-4 text-cyan-400" />
                      )}
                    </div>
                  </TableCell>

                  <TableCell className="font-extrabold text-sm text-white py-3">
                    <div className="flex items-center gap-2">
                      <span>{shop.name}</span>
                    </div>
                  </TableCell>

                  <TableCell className="py-3">
                    <a
                      href={shop.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-cyan-400 hover:underline inline-flex items-center gap-1 font-medium max-w-[200px] truncate"
                    >
                      <span className="truncate">{shop.url}</span>
                      <ExternalLink className="h-3 w-3 shrink-0" />
                    </a>
                  </TableCell>

                  <TableCell className="text-center py-3">
                    <Badge variant="outline" className="border-white/15 text-[10px] font-bold">
                      {shop.country === 'PL' ? '🇵🇱 Polska' : shop.country}
                    </Badge>
                  </TableCell>

                  <TableCell className="text-center py-3">
                    {shop.isActive ? (
                      <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30 text-[10px] font-bold">
                        Aktywny
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-muted-foreground text-[10px]">
                        Wyłączony
                      </Badge>
                    )}
                  </TableCell>

                  <TableCell className="text-right py-3 pr-6">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEdit(shop)}
                        className="h-8 w-8 text-muted-foreground hover:text-cyan-300 hover:bg-cyan-500/10 rounded-lg"
                        title="Edytuj sklep"
                      >
                        <Edit className="h-3.5 w-3.5" />
                      </Button>

                      {deleteConfirmId === shop.id ? (
                        <div className="flex items-center gap-1">
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleDelete(shop.id)}
                            className="h-7 px-2 text-[10px] font-bold rounded-lg"
                          >
                            Potwierdź
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setDeleteConfirmId(null)}
                            className="h-7 px-1.5 text-[10px] text-muted-foreground rounded-lg"
                          >
                            Anuluj
                          </Button>
                        </div>
                      ) : (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setDeleteConfirmId(shop.id)}
                          className="h-8 w-8 text-muted-foreground hover:text-rose-400 hover:bg-rose-500/10 rounded-lg"
                          title="Usuń sklep"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Dialog Dodawania / Edycji Sklepu */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="bg-[#0C101D] border-white/15 text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-black flex items-center gap-2">
              <ShoppingBag className="h-4 w-4 text-cyan-400" />
              <span>{editingShop ? 'Edycja Sklepu' : 'Dodaj Nowy Sklep'}</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Wprowadź dane księgarni internetowej i adres URL jej oficjalnego logo.
            </DialogDescription>
          </DialogHeader>

          {error && (
            <div className="p-3 rounded-xl bg-rose-950/60 border border-rose-500/40 text-xs text-rose-300 font-semibold">
              {error}
            </div>
          )}

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold">Nazwa sklepu</Label>
              <Input
                placeholder="np. Yatta.pl lub Gildia.pl"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="bg-white/5 border-white/10 text-xs h-9 rounded-xl text-white font-bold"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold">Adres URL sklepu</Label>
              <Input
                type="url"
                placeholder="https://yatta.pl"
                value={form.url}
                onChange={(e) => setForm({ ...form, url: e.target.value })}
                className="bg-white/5 border-white/10 text-xs h-9 rounded-xl text-white"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold">Adres URL logo sklepu</Label>
              <div className="flex items-center gap-2">
                <Input
                  type="url"
                  placeholder="https://yatta.pl/favicon.ico lub direct image"
                  value={form.logo}
                  onChange={(e) => setForm({ ...form, logo: e.target.value })}
                  className="bg-white/5 border-white/10 text-xs h-9 rounded-xl text-white flex-1"
                />
                {form.logo && (
                  <div className="h-9 w-9 rounded-xl bg-black/50 border border-white/10 overflow-hidden flex items-center justify-center shrink-0">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={form.logo}
                      alt="Logo podgląd"
                      className="h-full w-full object-contain p-1"
                      onError={(e) => {
                        ;(e.target as HTMLElement).style.display = 'none'
                      }}
                    />
                  </div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold">Kraj</Label>
                <Input
                  placeholder="PL"
                  value={form.country}
                  onChange={(e) => setForm({ ...form, country: e.target.value })}
                  className="bg-white/5 border-white/10 text-xs h-9 rounded-xl text-white uppercase"
                />
              </div>

              <div className="flex flex-col justify-end pb-1">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={form.isActive}
                    onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                    className="h-4 w-4 rounded border-white/20 bg-white/5 text-primary focus:ring-primary"
                  />
                  <span className="text-xs font-bold text-white">Aktywny w porównywarce</span>
                </label>
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setDialogOpen(false)}
              disabled={saving}
              className="text-xs font-bold rounded-xl"
            >
              Anuluj
            </Button>
            <Button
              onClick={handleSave}
              disabled={saving}
              className="bg-gradient-to-r from-primary to-cyan-500 font-bold text-xs rounded-xl text-white gap-2"
            >
              {saving ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Zapisywanie...
                </>
              ) : (
                <>
                  <Check className="h-3.5 w-3.5" />
                  {editingShop ? 'Zapisz Zmiany' : 'Dodaj Sklep'}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
