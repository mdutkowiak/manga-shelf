'use client'

import { useState } from 'react'
import { Edit, Trash2, Shield, User } from 'lucide-react'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

const mockUsers = [
  {
    id: '1',
    name: 'Jan Kowalski',
    email: 'jan@example.com',
    role: 'ADMIN',
    _count: { collections: 45 },
  },
  {
    id: '2',
    name: 'Anna Nowak',
    email: 'anna@example.com',
    role: 'USER',
    _count: { collections: 23 },
  },
  {
    id: '3',
    name: 'Piotr Wiśniewski',
    email: 'piotr@example.com',
    role: 'USER',
    _count: { collections: 12 },
  },
  {
    id: '4',
    name: 'Maria Zielińska',
    email: 'maria@example.com',
    role: 'USER',
    _count: { collections: 67 },
  },
]

export default function UsersPage() {
  const [users, setUsers] = useState(mockUsers)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [editingUser, setEditingUser] = useState<(typeof mockUsers)[0] | null>(null)
  const [newRole, setNewRole] = useState('')

  const handleEditRole = (user: (typeof mockUsers)[0]) => {
    setEditingUser(user)
    setNewRole(user.role)
    setEditDialogOpen(true)
  }

  const handleSaveRole = () => {
    if (editingUser) {
      setUsers(users.map((u) => (u.id === editingUser.id ? { ...u, role: newRole } : u)))
    }
    setEditDialogOpen(false)
  }

  const handleDelete = (id: string) => {
    setUsers(users.filter((u) => u.id !== id))
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Zarządzanie Użytkownikami</h2>
        <p className="text-muted-foreground">Lista zarejestrowanych użytkowników</p>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Użytkownik</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Rola</TableHead>
              <TableHead className="text-center">Kolekcja</TableHead>
              <TableHead className="w-[100px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((user) => (
              <TableRow key={user.id}>
                <TableCell>
                  <div className="flex items-center gap-2">
                    {user.role === 'ADMIN' ? (
                      <Shield className="h-4 w-4 text-yellow-600" />
                    ) : (
                      <User className="h-4 w-4 text-muted-foreground" />
                    )}
                    <span className="font-medium">{user.name || 'Bez nazwy'}</span>
                  </div>
                </TableCell>
                <TableCell>{user.email}</TableCell>
                <TableCell>
                  <Badge variant={user.role === 'ADMIN' ? 'default' : 'secondary'}>
                    {user.role}
                  </Badge>
                </TableCell>
                <TableCell className="text-center">{user._count.collections}</TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => handleEditRole(user)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => handleDelete(user.id)}
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

      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Zmień rolę użytkownika</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground">
                Użytkownik: <strong>{editingUser?.email}</strong>
              </p>
            </div>
            <div className="space-y-2">
              <Label>Rola</Label>
              <Select value={newRole} onValueChange={(value: string | null) => setNewRole(value || 'USER')}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="USER">Użytkownik</SelectItem>
                  <SelectItem value="ADMIN">Administrator</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
                Anuluj
              </Button>
              <Button onClick={handleSaveRole}>Zapisz</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
