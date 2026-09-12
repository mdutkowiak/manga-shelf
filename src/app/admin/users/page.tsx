'use client'

import { useState, useEffect } from 'react'
import { Edit, Shield, User, ShieldCheck, Loader2, Check, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

interface DbUser {
  id: string
  username: string
  name: string | null
  avatar?: string | null
  email: string
  role: 'USER' | 'ADMIN'
  createdAt: string
  _count: { collections: number }
}

export default function UsersPage() {
  const [users, setUsers] = useState<DbUser[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [editingUser, setEditingUser] = useState<DbUser | null>(null)
  const [newRole, setNewRole] = useState<'USER' | 'ADMIN'>('USER')
  const [newPassword, setNewPassword] = useState('')

  const fetchUsers = async () => {
    setLoading(true)
    setErrorMessage(null)
    try {
      const res = await fetch('/api/admin/users')
      if (res.ok) {
        const data = await res.json()
        setUsers(data.users || [])
      } else {
        const err = await res.json()
        setErrorMessage(err.error || 'Nie udało się pobrać listy użytkowników')
      }
    } catch {
      setErrorMessage('Błąd połączenia z serwerem')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchUsers()
  }, [])

  const handleEditRole = (user: DbUser) => {
    setEditingUser(user)
    setNewRole(user.role)
    setNewPassword('')
    setEditDialogOpen(true)
  }

  const handleSaveRole = async () => {
    if (!editingUser) return
    setSaving(true)
    setErrorMessage(null)

    if (newPassword.trim() && newPassword.trim().length < 6) {
      setErrorMessage('Nowe hasło musi mieć co najmniej 6 znaków')
      setSaving(false)
      return
    }

    try {
      const payload: Record<string, any> = {
        userId: editingUser.id,
        role: newRole,
      }
      if (newPassword.trim()) {
        payload.newPassword = newPassword.trim()
      }

      const res = await fetch('/api/admin/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const data = await res.json()
      if (res.ok) {
        setUsers((prev) =>
          prev.map((u) => (u.id === editingUser.id ? { ...u, role: newRole } : u))
        )
        setSuccessMessage(data.message || `Pomyślnie zaktualizowano dane użytkownika ${editingUser.username}`)
        setTimeout(() => setSuccessMessage(null), 4000)
        setEditDialogOpen(false)
      } else {
        setErrorMessage(data.error || 'Błąd podczas zapisywania zmian')
      }
    } catch {
      setErrorMessage('Wystąpił nieoczekiwany błąd sieci')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold tracking-tight">Zarządzanie Użytkownikami</h2>
          <p className="text-xs text-muted-foreground">
            Przeglądaj zarejestrowane konta i nadawaj uprawnienia administratora
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchUsers} disabled={loading} className="text-xs">
          Odśwież
        </Button>
      </div>

      {successMessage && (
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs text-emerald-300 flex items-center gap-2">
          <Check className="h-4 w-4 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {errorMessage && (
        <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive flex items-center gap-2">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      <div className="rounded-2xl border border-white/10 bg-[#0C101D]/90 overflow-hidden shadow-xl">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-16 gap-2">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
            <span className="text-xs text-muted-foreground">Pobieranie użytkowników z bazy...</span>
          </div>
        ) : (
          <Table>
            <TableHeader className="bg-white/5">
              <TableRow className="border-white/10 hover:bg-transparent">
                <TableHead className="text-xs font-bold text-white">Użytkownik</TableHead>
                <TableHead className="text-xs font-bold text-white">Email</TableHead>
                <TableHead className="text-xs font-bold text-white">Rola</TableHead>
                <TableHead className="text-xs font-bold text-white text-center">W kolekcji</TableHead>
                <TableHead className="text-xs font-bold text-white">Data dołączenia</TableHead>
                <TableHead className="w-[100px] text-right text-xs font-bold text-white">Akcje</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-12 text-muted-foreground text-xs">
                    Brak zarejestrowanych użytkowników w bazie danych.
                  </TableCell>
                </TableRow>
              ) : (
                users.map((user) => {
                  const isMainAdmin = user.username.toLowerCase() === 'daqu'
                  return (
                    <TableRow key={user.id} className="border-white/10 hover:bg-white/[0.02]">
                      <TableCell>
                        <div className="flex items-center gap-2.5">
                          {user.avatar ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={user.avatar}
                              alt={user.username}
                              className="h-8 w-8 rounded-full object-cover ring-1 ring-white/20 shadow-sm"
                            />
                          ) : (
                            <div
                              className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold shadow-sm ${
                                user.role === 'ADMIN'
                                  ? 'bg-gradient-to-tr from-purple-500 to-primary text-white ring-1 ring-purple-400/40'
                                  : 'bg-white/10 text-muted-foreground'
                              }`}
                            >
                              {user.username[0]?.toUpperCase() || 'U'}
                            </div>
                          )}
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="font-extrabold text-sm text-white">{user.username}</span>
                              {user.role === 'ADMIN' && (
                                <span title="Administrator">
                                  <ShieldCheck className="h-3.5 w-3.5 text-purple-400" />
                                </span>
                              )}
                            </div>
                            {user.name && user.name !== user.username && (
                              <span className="text-[11px] text-muted-foreground">{user.name}</span>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground font-mono">{user.email}</TableCell>
                      <TableCell>
                        <Badge
                          className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full ${
                            user.role === 'ADMIN'
                              ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40'
                              : 'bg-white/5 text-muted-foreground border border-white/10'
                          }`}
                        >
                          {user.role === 'ADMIN' ? 'Administrator' : 'Użytkownik'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center text-xs font-bold text-cyan-300">
                        {user._count.collections} tomów
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {new Date(user.createdAt).toLocaleDateString('pl-PL')}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 gap-1 text-xs text-cyan-300 hover:text-white hover:bg-cyan-950/40"
                          disabled={isMainAdmin}
                          title={isMainAdmin ? 'Główny administrator' : 'Zmień rolę użytkownika'}
                          onClick={() => handleEditRole(user)}
                        >
                          <Edit className="h-3.5 w-3.5" />
                          <span>Zmień</span>
                        </Button>
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        )}
      </div>

      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="border-white/10 bg-[#0C101D] text-white">
          <DialogHeader>
            <DialogTitle>Zmień uprawnienia użytkownika</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div>
              <p className="text-xs text-muted-foreground">
                Konto: <strong className="text-white">{editingUser?.username}</strong> ({editingUser?.email})
              </p>
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Rola w serwisie</Label>
              <Select
                value={newRole}
                onValueChange={(value: string | null) => setNewRole((value as 'USER' | 'ADMIN') || 'USER')}
              >
                <SelectTrigger className="border-white/10 bg-white/5 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="border-white/10 bg-[#0C101D] text-white">
                  <SelectItem value="USER">Użytkownik (domyślny)</SelectItem>
                  <SelectItem value="ADMIN">Administrator (pełny dostęp do panelu)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2 pt-2 border-t border-white/10">
              <Label className="text-xs">Zmień hasło użytkownika (opcjonalnie)</Label>
              <Input
                type="password"
                placeholder="Nowe hasło (min. 6 znaków)"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="border-white/10 bg-white/5 text-white text-xs"
              />
              <p className="text-[10px] text-muted-foreground">
                Pozostaw puste, jeśli nie chcesz modyfikować hasła użytkownika.
              </p>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="outline"
                size="sm"
                className="text-xs"
                onClick={() => setEditDialogOpen(false)}
                disabled={saving}
              >
                Anuluj
              </Button>
              <Button size="sm" className="text-xs font-bold" onClick={handleSaveRole} disabled={saving}>
                {saving ? 'Zapisywanie...' : 'Zapisz zmiany'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
