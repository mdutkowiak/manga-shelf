'use client'

import { useState, useEffect, useMemo } from 'react'
import {
  Edit,
  Shield,
  User as UserIcon,
  ShieldCheck,
  Loader2,
  Check,
  AlertCircle,
  Search,
  Trash2,
  UserX,
  UserCheck,
  Key,
  Plus,
  Lock,
  Unlock,
  Sliders,
  Users as UsersIcon,
  BadgeAlert,
} from 'lucide-react'
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'

interface CustomRole {
  id: string
  name: string
  label: string
  description: string | null
  isSystem: boolean
  permissions: string[]
  _count?: { users: number }
}

interface DbUser {
  id: string
  username: string
  name: string | null
  avatar?: string | null
  email: string
  bio?: string | null
  role: 'USER' | 'ADMIN'
  customRoleId?: string | null
  customRole?: {
    id: string
    name: string
    label: string
    permissions: string[]
  } | null
  isActive: boolean
  createdAt: string
  _count: { collections: number }
}

const AVAILABLE_PERMISSIONS = [
  { id: 'MANGA_MANAGE', label: 'Zarządzanie seriami mang', description: 'Dodawanie, edycja tomów, okładek i statusów w Polsce' },
  { id: 'RELEASES_MANAGE', label: 'Zarządzanie premierami i kalendarzem', description: 'Dodawanie zapowiedzi, edycja cen, linków do sklepów i dat' },
  { id: 'PUBLISHERS_MANAGE', label: 'Zarządzanie wydawcami', description: 'Dodawanie nowych wydawnictw, logo i linków' },
  { id: 'USERS_MANAGE', label: 'Zarządzanie użytkownikami', description: 'Przeglądanie kont, edycja profili, haseł i blokowanie' },
  { id: 'ROLES_MANAGE', label: 'Zarządzanie rolami', description: 'Tworzenie i edycja ról oraz uprawnień systemowych' },
]

export default function UsersPage() {
  const [activeTab, setActiveTab] = useState<'users' | 'roles'>('users')

  // Users state
  const [users, setUsers] = useState<DbUser[]>([])
  const [roles, setRoles] = useState<CustomRole[]>([])
  const [loading, setLoading] = useState(true)
  const [rolesLoading, setRolesLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  // Filters
  const [searchQuery, setSearchQuery] = useState('')
  const [roleFilter, setRoleFilter] = useState('ALL')
  const [statusFilter, setStatusFilter] = useState('ALL')

  // Edit User Modal
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [editingUser, setEditingUser] = useState<DbUser | null>(null)
  const [userForm, setUserForm] = useState({
    username: '',
    email: '',
    name: '',
    bio: '',
    role: 'USER' as 'USER' | 'ADMIN',
    customRoleId: 'none',
    isActive: true,
    newPassword: '',
  })

  // Delete User Modal
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [userToDelete, setUserToDelete] = useState<DbUser | null>(null)

  // Role Edit/Create Modal
  const [roleModalOpen, setRoleModalOpen] = useState(false)
  const [editingRole, setEditingRole] = useState<CustomRole | null>(null)
  const [roleForm, setRoleForm] = useState({
    name: '',
    label: '',
    description: '',
    permissions: [] as string[],
  })

  const fetchUsers = async () => {
    setLoading(true)
    setErrorMessage(null)
    try {
      const params = new URLSearchParams()
      if (searchQuery.trim()) params.append('q', searchQuery.trim())
      if (roleFilter !== 'ALL') params.append('role', roleFilter)
      if (statusFilter !== 'ALL') params.append('status', statusFilter)

      const res = await fetch(`/api/admin/users?${params.toString()}`)
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

  const fetchRoles = async () => {
    setRolesLoading(true)
    try {
      const res = await fetch('/api/admin/roles')
      if (res.ok) {
        const data = await res.json()
        setRoles(data.roles || [])
      }
    } catch (err) {
      console.error('Error loading roles:', err)
    } finally {
      setRolesLoading(false)
    }
  }

  useEffect(() => {
    fetchUsers()
    fetchRoles()
  }, [])

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchUsers()
    }, 250)
    return () => clearTimeout(timer)
  }, [searchQuery, roleFilter, statusFilter])

  // Open Edit User Modal
  const handleOpenEditUser = (user: DbUser) => {
    setEditingUser(user)
    setUserForm({
      username: user.username,
      email: user.email,
      name: user.name || '',
      bio: user.bio || '',
      role: user.role,
      customRoleId: user.customRoleId || 'none',
      isActive: user.isActive !== false,
      newPassword: '',
    })
    setEditDialogOpen(true)
  }

  // Save User Edit
  const handleSaveUser = async () => {
    if (!editingUser) return
    setSaving(true)
    setErrorMessage(null)

    if (userForm.newPassword.trim() && userForm.newPassword.trim().length < 6) {
      setErrorMessage('Nowe hasło musi mieć co najmniej 6 znaków')
      setSaving(false)
      return
    }

    try {
      const payload: Record<string, any> = {
        userId: editingUser.id,
        username: userForm.username.trim(),
        email: userForm.email.trim(),
        name: userForm.name.trim() || null,
        bio: userForm.bio.trim() || null,
        role: userForm.role,
        customRoleId: userForm.customRoleId === 'none' ? null : userForm.customRoleId,
        isActive: userForm.isActive,
      }
      if (userForm.newPassword.trim()) {
        payload.newPassword = userForm.newPassword.trim()
      }

      const res = await fetch('/api/admin/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const data = await res.json()
      if (res.ok) {
        setSuccessMessage(data.message || 'Pomyślnie zaktualizowano dane użytkownika')
        setTimeout(() => setSuccessMessage(null), 4000)
        setEditDialogOpen(false)
        fetchUsers()
      } else {
        setErrorMessage(data.error || 'Błąd podczas zapisywania zmian')
      }
    } catch {
      setErrorMessage('Wystąpił nieoczekiwany błąd sieci')
    } finally {
      setSaving(false)
    }
  }

  // Quick Toggle Active/Inactive
  const handleToggleUserActive = async (user: DbUser) => {
    const isMainAdmin = user.username.toLowerCase() === 'daqu' || user.email.toLowerCase() === '7dudek@gmail.com'
    if (isMainAdmin) {
      setErrorMessage('Nie można zablokować głównego konta administratora (DaQu)!')
      return
    }

    try {
      const newActive = !user.isActive
      const res = await fetch('/api/admin/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          isActive: newActive,
        }),
      })

      if (res.ok) {
        setUsers((prev) =>
          prev.map((u) => (u.id === user.id ? { ...u, isActive: newActive } : u))
        )
        setSuccessMessage(
          newActive
            ? `Konto ${user.username} zostało aktywowane`
            : `Konto ${user.username} zostało zablokowane`
        )
        setTimeout(() => setSuccessMessage(null), 3000)
      } else {
        const err = await res.json()
        setErrorMessage(err.error || 'Nie udało się zmienić statusu konta')
      }
    } catch {
      setErrorMessage('Błąd połączenia')
    }
  }

  // Delete User
  const handleDeleteUser = async () => {
    if (!userToDelete) return
    setSaving(true)
    setErrorMessage(null)

    try {
      const res = await fetch(`/api/admin/users?id=${userToDelete.id}`, {
        method: 'DELETE',
      })

      const data = await res.json()
      if (res.ok) {
        setUsers((prev) => prev.filter((u) => u.id !== userToDelete.id))
        setSuccessMessage(data.message || `Usunięto konto użytkownika ${userToDelete.username}`)
        setTimeout(() => setSuccessMessage(null), 4000)
        setDeleteDialogOpen(false)
        setUserToDelete(null)
      } else {
        setErrorMessage(data.error || 'Błąd podczas usuwania użytkownika')
      }
    } catch {
      setErrorMessage('Błąd sieci podczas usuwania')
    } finally {
      setSaving(false)
    }
  }

  // Role Form Handlers
  const handleOpenNewRole = () => {
    setEditingRole(null)
    setRoleForm({
      name: '',
      label: '',
      description: '',
      permissions: ['MANGA_MANAGE'],
    })
    setRoleModalOpen(true)
  }

  const handleOpenEditRole = (role: CustomRole) => {
    setEditingRole(role)
    setRoleForm({
      name: role.name,
      label: role.label,
      description: role.description || '',
      permissions: role.permissions || [],
    })
    setRoleModalOpen(true)
  }

  const handleSaveRole = async () => {
    if (!roleForm.label.trim()) {
      setErrorMessage('Nazwa roli nie może być pusta')
      return
    }

    setSaving(true)
    setErrorMessage(null)

    try {
      if (editingRole) {
        const res = await fetch('/api/admin/roles', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: editingRole.id,
            label: roleForm.label,
            description: roleForm.description,
            permissions: roleForm.permissions,
          }),
        })
        const data = await res.json()
        if (res.ok) {
          setSuccessMessage(`Rola ${roleForm.label} została zaktualizowana`)
          setRoleModalOpen(false)
          fetchRoles()
        } else {
          setErrorMessage(data.error || 'Błąd zapisu roli')
        }
      } else {
        const res = await fetch('/api/admin/roles', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(roleForm),
        })
        const data = await res.json()
        if (res.ok) {
          setSuccessMessage(`Utworzono nową rolę: ${roleForm.label}`)
          setRoleModalOpen(false)
          fetchRoles()
        } else {
          setErrorMessage(data.error || 'Błąd tworzenia roli')
        }
      }
    } catch {
      setErrorMessage('Błąd sieci podczas zapisu roli')
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteRole = async (roleId: string, roleLabel: string) => {
    if (!confirm(`Czy na pewno chcesz usunąć rolę "${roleLabel}"?`)) return
    try {
      const res = await fetch(`/api/admin/roles?id=${roleId}`, {
        method: 'DELETE',
      })
      const data = await res.json()
      if (res.ok) {
        setRoles((prev) => prev.filter((r) => r.id !== roleId))
        setSuccessMessage(`Rola ${roleLabel} została usunięta`)
        setTimeout(() => setSuccessMessage(null), 3000)
      } else {
        setErrorMessage(data.error || 'Błąd usuwania roli')
      }
    } catch {
      setErrorMessage('Błąd sieci')
    }
  }

  return (
    <div className="space-y-6">
      {/* Header with Tab Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-extrabold tracking-tight text-white flex items-center gap-2">
            <UsersIcon className="h-5 w-5 text-cyan-400" />
            <span>Zarządzanie Użytkownikami i Uprawnieniami</span>
          </h2>
          <p className="text-xs text-muted-foreground">
            Wyszukuj konta, modyfikuj profile, hasła, blokuj dostęp oraz konfiguruj role systemowe
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="inline-flex rounded-xl bg-white/5 p-1 border border-white/10">
            <button
              type="button"
              onClick={() => setActiveTab('users')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold transition-colors ${
                activeTab === 'users'
                  ? 'bg-primary text-white shadow-md'
                  : 'text-muted-foreground hover:text-white'
              }`}
            >
              <UsersIcon className="h-3.5 w-3.5" />
              <span>Użytkownicy ({users.length})</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('roles')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold transition-colors ${
                activeTab === 'roles'
                  ? 'bg-purple-600 text-white shadow-md'
                  : 'text-muted-foreground hover:text-white'
              }`}
            >
              <Shield className="h-3.5 w-3.5" />
              <span>Role i Uprawnienia ({roles.length})</span>
            </button>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              fetchUsers()
              fetchRoles()
            }}
            disabled={loading}
            className="text-xs border-white/10 text-white hover:bg-white/10 h-8"
          >
            Odśwież
          </Button>
        </div>
      </div>

      {/* Notifications */}
      {successMessage && (
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs font-medium text-emerald-300 flex items-center gap-2 animate-in fade-in">
          <Check className="h-4 w-4 shrink-0 text-emerald-400" />
          <span>{successMessage}</span>
        </div>
      )}

      {errorMessage && (
        <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-xs font-medium text-destructive flex items-center gap-2 animate-in fade-in">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* TAB 1: USERS */}
      {activeTab === 'users' && (
        <div className="space-y-4">
          {/* Filter Bar */}
          <div className="flex flex-col sm:flex-row items-center gap-3 bg-white/[0.02] border border-white/10 p-3 rounded-2xl">
            <div className="relative flex-1 w-full">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Szukaj użytkownika po nazwie, imieniu lub emailu..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 bg-white/5 border-white/10 text-xs h-9 rounded-xl text-white placeholder:text-muted-foreground focus:border-cyan-400 w-full"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <Select value={roleFilter} onValueChange={(val: string | null) => setRoleFilter(val || 'ALL')}>
                <SelectTrigger className="w-full sm:w-44 bg-white/5 border-white/10 text-xs h-9 rounded-xl text-white">
                  <SelectValue placeholder="Rola: Wszystkie" />
                </SelectTrigger>
                <SelectContent className="bg-[#0C101D] border-white/15 text-white text-xs">
                  <SelectItem value="ALL">Wszystkie role</SelectItem>
                  <SelectItem value="ADMIN">Administratorzy</SelectItem>
                  <SelectItem value="USER">Zwykli użytkownicy</SelectItem>
                  {roles.map((r) => (
                    <SelectItem key={r.id} value={r.id}>
                      {r.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={statusFilter} onValueChange={(val: string | null) => setStatusFilter(val || 'ALL')}>
                <SelectTrigger className="w-full sm:w-36 bg-white/5 border-white/10 text-xs h-9 rounded-xl text-white">
                  <SelectValue placeholder="Status: Wszyscy" />
                </SelectTrigger>
                <SelectContent className="bg-[#0C101D] border-white/15 text-white text-xs">
                  <SelectItem value="ALL">Wszyscy</SelectItem>
                  <SelectItem value="ACTIVE">Tylko aktywni</SelectItem>
                  <SelectItem value="INACTIVE">Zablokowani</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Users Table */}
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
                    <TableHead className="text-xs font-bold text-white">Rola & Uprawnienia</TableHead>
                    <TableHead className="text-xs font-bold text-white text-center">Status</TableHead>
                    <TableHead className="text-xs font-bold text-white text-center">W kolekcji</TableHead>
                    <TableHead className="text-xs font-bold text-white">Data dołączenia</TableHead>
                    <TableHead className="w-[140px] text-right text-xs font-bold text-white">Akcje</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-12 text-muted-foreground text-xs">
                        Nie znaleziono użytkowników spełniających podane kryteria.
                      </TableCell>
                    </TableRow>
                  ) : (
                    users.map((user) => {
                      const isMainAdmin =
                        user.username.toLowerCase() === 'daqu' ||
                        user.email.toLowerCase() === '7dudek@gmail.com'
                      const isDemoAdmin =
                        user.username.toLowerCase() === 'admin' &&
                        user.email.toLowerCase() === 'admin@manga.pl'

                      return (
                        <TableRow
                          key={user.id}
                          className={`border-white/10 hover:bg-white/[0.02] ${
                            !user.isActive ? 'opacity-60 bg-red-950/10' : ''
                          }`}
                        >
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
                                    <span title="Administrator Serwisu">
                                      <ShieldCheck className="h-3.5 w-3.5 text-purple-400" />
                                    </span>
                                  )}
                                  {isMainAdmin && (
                                    <Badge className="text-[9px] font-black bg-purple-500/30 text-purple-200 border-purple-400/50 py-0 px-1.5">
                                      Główny Admin
                                    </Badge>
                                  )}
                                  {isDemoAdmin && (
                                    <Badge className="text-[9px] font-bold bg-amber-500/20 text-amber-300 border-amber-500/40 py-0 px-1.5">
                                      Konto Demo
                                    </Badge>
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
                            <div className="flex flex-col gap-1 items-start">
                              <Badge
                                className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full ${
                                  user.role === 'ADMIN'
                                    ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40'
                                    : 'bg-white/5 text-muted-foreground border border-white/10'
                                }`}
                              >
                                {user.role === 'ADMIN' ? 'Administrator' : 'Użytkownik'}
                              </Badge>

                              {user.customRole && (
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-cyan-300 bg-cyan-950/40 border border-cyan-500/30 px-2 py-0.5 rounded-md">
                                  <Shield className="h-2.5 w-2.5" />
                                  {user.customRole.label}
                                </span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-center">
                            {user.isActive ? (
                              <span className="inline-flex items-center gap-1.5 text-[10px] font-bold text-emerald-400 bg-emerald-950/40 border border-emerald-500/40 px-2 py-0.5 rounded-full">
                                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                                Aktywny
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 text-[10px] font-bold text-red-400 bg-red-950/50 border border-red-500/40 px-2 py-0.5 rounded-full">
                                <span className="h-1.5 w-1.5 rounded-full bg-red-400" />
                                Zablokowany
                              </span>
                            )}
                          </TableCell>
                          <TableCell className="text-center text-xs font-bold text-cyan-300">
                            {user._count.collections} tomów
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {new Date(user.createdAt).toLocaleDateString('pl-PL')}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              {/* Quick Active Toggle */}
                              {!isMainAdmin && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className={`h-7 w-7 rounded-lg ${
                                    user.isActive
                                      ? 'text-muted-foreground hover:text-amber-400 hover:bg-amber-950/40'
                                      : 'text-emerald-400 hover:bg-emerald-950/40'
                                  }`}
                                  title={user.isActive ? 'Zablokuj konto' : 'Aktywuj konto'}
                                  onClick={() => handleToggleUserActive(user)}
                                >
                                  {user.isActive ? <UserX className="h-3.5 w-3.5" /> : <UserCheck className="h-3.5 w-3.5" />}
                                </Button>
                              )}

                              {/* Edit Profile & Password */}
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 px-2 gap-1 text-xs text-cyan-300 hover:text-white hover:bg-cyan-950/40"
                                onClick={() => handleOpenEditUser(user)}
                              >
                                <Edit className="h-3.5 w-3.5" />
                                <span>Edytuj</span>
                              </Button>

                              {/* Delete User */}
                              {!isMainAdmin && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7 text-muted-foreground hover:text-red-400 hover:bg-red-950/40 rounded-lg"
                                  title="Usuń konto użytkownika"
                                  onClick={() => {
                                    setUserToDelete(user)
                                    setDeleteDialogOpen(true)
                                  }}
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      )
                    })
                  )}
                </TableBody>
              </Table>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: ROLES & PERMISSIONS */}
      {activeTab === 'roles' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between bg-white/[0.02] border border-white/10 p-4 rounded-2xl">
            <div>
              <h3 className="text-sm font-bold text-white">Role i Uprawnienia w Portalu</h3>
              <p className="text-xs text-muted-foreground">
                Zdefiniuj niestandardowe role (np. Moderator, Redaktor) i przydzielaj im granularne uprawnienia
              </p>
            </div>
            <Button
              size="sm"
              onClick={handleOpenNewRole}
              className="text-xs font-bold bg-purple-600 hover:bg-purple-700 text-white gap-1.5"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Dodaj Nową Rolę</span>
            </Button>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {roles.map((role) => (
              <div
                key={role.id}
                className="rounded-2xl border border-white/10 bg-[#0C101D] p-4 flex flex-col justify-between space-y-3"
              >
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-1.5">
                      <Shield className="h-4 w-4 text-purple-400" />
                      <h4 className="font-extrabold text-sm text-white">{role.label}</h4>
                    </div>
                    {role.isSystem ? (
                      <Badge className="text-[9px] bg-purple-500/20 text-purple-300 border-purple-500/30">
                        Systemowa
                      </Badge>
                    ) : (
                      <Badge className="text-[9px] bg-cyan-500/20 text-cyan-300 border-cyan-500/30">
                        Własna
                      </Badge>
                    )}
                  </div>
                  <p className="text-[11px] text-muted-foreground mb-3">{role.description || 'Brak opisu roli.'}</p>

                  <div className="space-y-1.5 pt-2 border-t border-white/5">
                    <span className="text-[10px] font-bold uppercase text-muted-foreground">Uprawnienia:</span>
                    <div className="flex flex-wrap gap-1">
                      {role.permissions?.length > 0 ? (
                        role.permissions.map((p) => {
                          const permInfo = AVAILABLE_PERMISSIONS.find((ap) => ap.id === p)
                          return (
                            <span
                              key={p}
                              className="text-[9px] font-semibold bg-white/5 border border-white/10 text-white/90 px-2 py-0.5 rounded-md"
                            >
                              {permInfo?.label || p}
                            </span>
                          )
                        })
                      ) : (
                        <span className="text-[10px] text-muted-foreground italic">Brak uprawnień specjalnych</span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t border-white/10 flex items-center justify-between">
                  <span className="text-[11px] text-muted-foreground">
                    Przypisanych kont: <strong className="text-white">{role._count?.users || 0}</strong>
                  </span>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleOpenEditRole(role)}
                      className="h-7 text-xs text-cyan-300 hover:bg-cyan-950/40"
                    >
                      <Edit className="h-3 w-3 mr-1" />
                      Edytuj
                    </Button>
                    {!role.isSystem && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeleteRole(role.id, role.label)}
                        className="h-7 w-7 text-muted-foreground hover:text-red-400 hover:bg-red-950/40"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* EDIT USER MODAL */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="border-white/15 bg-[#0C101D]/98 text-white max-w-lg rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-extrabold flex items-center gap-2">
              <Edit className="h-4 w-4 text-cyan-400" />
              <span>Edycja profilu: {editingUser?.username}</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Zmieniaj dane konta, hasło, rolę oraz status aktywności
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            {/* Username & Email */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-bold">Login / Username</Label>
                <Input
                  value={userForm.username}
                  onChange={(e) => setUserForm({ ...userForm, username: e.target.value })}
                  disabled={editingUser?.username.toLowerCase() === 'daqu'}
                  className="bg-white/5 border-white/10 text-xs h-9 rounded-xl text-white"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-bold">Adres Email</Label>
                <Input
                  value={userForm.email}
                  onChange={(e) => setUserForm({ ...userForm, email: e.target.value })}
                  disabled={editingUser?.username.toLowerCase() === 'daqu'}
                  className="bg-white/5 border-white/10 text-xs h-9 rounded-xl text-white"
                />
              </div>
            </div>

            {/* Display Name & Bio */}
            <div className="space-y-1">
              <Label className="text-xs font-bold">Imię / Nazwa wyświetlana</Label>
              <Input
                value={userForm.name}
                onChange={(e) => setUserForm({ ...userForm, name: e.target.value })}
                placeholder="np. Jan Kowalski"
                className="bg-white/5 border-white/10 text-xs h-9 rounded-xl text-white"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-bold">Bio profilowe</Label>
              <Textarea
                value={userForm.bio}
                onChange={(e) => setUserForm({ ...userForm, bio: e.target.value })}
                rows={2}
                placeholder="Krótki opis użytkownika..."
                className="bg-white/5 border-white/10 text-xs rounded-xl text-white"
              />
            </div>

            {/* Role & Custom Role */}
            <div className="grid grid-cols-2 gap-3 pt-2 border-t border-white/10">
              <div className="space-y-1">
                <Label className="text-xs font-bold">Główna Rola w Serwisie</Label>
                <Select
                  value={userForm.role}
                  disabled={editingUser?.username.toLowerCase() === 'daqu'}
                  onValueChange={(value: string | null) =>
                    setUserForm({ ...userForm, role: (value as 'USER' | 'ADMIN') || 'USER' })
                  }
                >
                  <SelectTrigger className="border-white/10 bg-white/5 text-white text-xs h-9 rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="border-white/10 bg-[#0C101D] text-white text-xs">
                    <SelectItem value="USER">Użytkownik (domyślny)</SelectItem>
                    <SelectItem value="ADMIN">Administrator (pełny dostęp)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-bold">Rola Niestandardowa</Label>
                <Select
                  value={userForm.customRoleId}
                  onValueChange={(value: string | null) =>
                    setUserForm({ ...userForm, customRoleId: value || 'none' })
                  }
                >
                  <SelectTrigger className="border-white/10 bg-white/5 text-white text-xs h-9 rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="border-white/10 bg-[#0C101D] text-white text-xs">
                    <SelectItem value="none">Brak dodatkowej roli</SelectItem>
                    {roles.map((r) => (
                      <SelectItem key={r.id} value={r.id}>
                        {r.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Status (Activate / Deactivate) */}
            <div className="pt-2 border-t border-white/10">
              <div className="flex items-center justify-between p-3 rounded-xl bg-white/[0.03] border border-white/10">
                <div>
                  <div className="text-xs font-bold text-white flex items-center gap-1.5">
                    {userForm.isActive ? (
                      <Lock className="h-3.5 w-3.5 text-emerald-400" />
                    ) : (
                      <BadgeAlert className="h-3.5 w-3.5 text-red-400" />
                    )}
                    <span>Status Konta: {userForm.isActive ? 'Aktywne' : 'Zablokowane / Dezaktywowane'}</span>
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    Zablokowany użytkownik nie będzie mógł zalogować się do systemu.
                  </p>
                </div>

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={editingUser?.username.toLowerCase() === 'daqu'}
                  onClick={() => setUserForm({ ...userForm, isActive: !userForm.isActive })}
                  className={`text-xs font-bold ${
                    userForm.isActive
                      ? 'border-red-500/40 text-red-300 hover:bg-red-950/40'
                      : 'border-emerald-500/40 text-emerald-300 hover:bg-emerald-950/40'
                  }`}
                >
                  {userForm.isActive ? 'Zablokuj' : 'Odblokuj'}
                </Button>
              </div>
            </div>

            {/* Password change */}
            <div className="space-y-1 pt-2 border-t border-white/10">
              <Label className="text-xs font-bold flex items-center gap-1.5">
                <Key className="h-3.5 w-3.5 text-amber-400" />
                <span>Zmień Hasło (opcjonalnie)</span>
              </Label>
              <Input
                type="password"
                placeholder="Wpisz nowe hasło (min. 6 znaków)..."
                value={userForm.newPassword}
                onChange={(e) => setUserForm({ ...userForm, newPassword: e.target.value })}
                className="border-white/10 bg-white/5 text-white text-xs h-9 rounded-xl"
              />
              <p className="text-[10px] text-muted-foreground">
                Pozostaw to pole puste, jeśli chcesz zachować obecne hasło użytkownika.
              </p>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-2 pt-3 border-t border-white/10">
              <Button
                variant="outline"
                size="sm"
                className="text-xs border-white/10 text-white hover:bg-white/10"
                onClick={() => setEditDialogOpen(false)}
                disabled={saving}
              >
                Anuluj
              </Button>
              <Button
                size="sm"
                className="text-xs font-bold bg-primary hover:bg-primary/90 text-white"
                onClick={handleSaveUser}
                disabled={saving}
              >
                {saving ? 'Zapisywanie...' : 'Zapisz zmiany'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* DELETE USER CONFIRMATION MODAL */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="border-destructive/30 bg-[#0C101D] text-white max-w-sm rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-base font-extrabold text-destructive flex items-center gap-2">
              <Trash2 className="h-4 w-4" />
              <span>Potwierdź usunięcie konta</span>
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 pt-2 text-xs">
            <p className="text-white font-medium">
              Czy na pewno chcesz bezpowrotnie usunąć konto{' '}
              <strong className="text-cyan-300 font-extrabold">{userToDelete?.username}</strong>?
            </p>
            <p className="text-muted-foreground text-[11px]">
              Ta operacja usunie wszystkie powiązane dane kolekcji tego użytkownika. Nie można jej cofnąć.
            </p>
            <div className="flex justify-end gap-2 pt-3 border-t border-white/10">
              <Button
                variant="outline"
                size="sm"
                className="text-xs border-white/10"
                onClick={() => setDeleteDialogOpen(false)}
                disabled={saving}
              >
                Anuluj
              </Button>
              <Button
                variant="destructive"
                size="sm"
                className="text-xs font-bold"
                onClick={handleDeleteUser}
                disabled={saving}
              >
                {saving ? 'Usuwanie...' : 'Trwale Usuń Konto'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ROLE CREATE / EDIT MODAL */}
      <Dialog open={roleModalOpen} onOpenChange={setRoleModalOpen}>
        <DialogContent className="border-white/15 bg-[#0C101D]/98 text-white max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-base font-extrabold flex items-center gap-2">
              <Shield className="h-4 w-4 text-purple-400" />
              <span>{editingRole ? `Edytuj rolę: ${editingRole.label}` : 'Utwórz Nową Rolę'}</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Określ uprawnienia administracyjne dla tej roli
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            <div className="space-y-1">
              <Label className="text-xs font-bold">Nazwa Wyświetlana</Label>
              <Input
                placeholder="np. Redaktor Kalendarza, Moderator"
                value={roleForm.label}
                onChange={(e) => setRoleForm({ ...roleForm, label: e.target.value })}
                className="bg-white/5 border-white/10 text-xs h-9 rounded-xl text-white font-bold"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-bold">Opis Roli</Label>
              <Input
                placeholder="np. Odpowiada za aktualizację premier i cen w Polsce"
                value={roleForm.description}
                onChange={(e) => setRoleForm({ ...roleForm, description: e.target.value })}
                className="bg-white/5 border-white/10 text-xs h-9 rounded-xl text-white"
              />
            </div>

            <div className="space-y-2 pt-2 border-t border-white/10">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Dostępne Uprawnienia:
              </Label>
              <div className="space-y-2">
                {AVAILABLE_PERMISSIONS.map((perm) => {
                  const isChecked = roleForm.permissions.includes(perm.id)
                  return (
                    <div
                      key={perm.id}
                      onClick={() => {
                        setRoleForm((prev) => ({
                          ...prev,
                          permissions: isChecked
                            ? prev.permissions.filter((p) => p !== perm.id)
                            : [...prev.permissions, perm.id],
                        }))
                      }}
                      className={`flex items-start gap-2.5 p-2.5 rounded-xl border cursor-pointer transition-colors ${
                        isChecked
                          ? 'bg-purple-950/30 border-purple-500/50 text-white'
                          : 'bg-white/[0.02] border-white/10 text-muted-foreground hover:text-white'
                      }`}
                    >
                      <Checkbox
                        checked={isChecked}
                        onCheckedChange={() => {}}
                        className="mt-0.5 border-white/30 data-[state=checked]:bg-purple-600 data-[state=checked]:border-purple-600"
                      />
                      <div>
                        <div className="text-xs font-bold text-white">{perm.label}</div>
                        <div className="text-[10px] text-muted-foreground">{perm.description}</div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-white/10">
              <Button
                variant="outline"
                size="sm"
                className="text-xs border-white/10 text-white"
                onClick={() => setRoleModalOpen(false)}
                disabled={saving}
              >
                Anuluj
              </Button>
              <Button
                size="sm"
                className="text-xs font-bold bg-purple-600 hover:bg-purple-700 text-white"
                onClick={handleSaveRole}
                disabled={saving}
              >
                {saving ? 'Zapisywanie...' : editingRole ? 'Zapisz zmiany' : 'Utwórz Rolę'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
