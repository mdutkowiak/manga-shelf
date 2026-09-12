'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Save, User } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { AvatarUpload } from '@/components/manga/avatar-upload'

export default function EditProfilePage() {
  const router = useRouter()
  const { data: session, update: updateSession } = useSession()
  const userId = (session?.user as { id?: string })?.id

  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    name: '',
    bio: '',
    avatar: null as string | null,
  })

  useEffect(() => {
    if (!userId) return

    const fetchProfile = async () => {
      try {
        const res = await fetch(`/api/users/me?userId=${userId}`)
        if (res.ok) {
          const data = await res.json()
          setForm({
            name: data.user.name || '',
            bio: data.user.bio || '',
            avatar: data.user.avatar,
          })
        }
      } catch (error) {
        console.error('Fetch profile error:', error)
      }
    }

    fetchProfile()
  }, [userId])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const res = await fetch('/api/users/me', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          name: form.name || null,
          bio: form.bio || null,
          avatar: form.avatar,
        }),
      })

      if (res.ok) {
        // Odśwież sesję aby zaktualizować dane
        await updateSession()
        router.push('/profile')
      }
    } catch (error) {
      console.error('Update profile error:', error)
    } finally {
      setLoading(false)
    }
  }

  if (!userId) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <User className="mb-4 h-12 w-12 text-muted-foreground" />
        <p className="text-muted-foreground">Zaloguj się, aby edytować profil</p>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-center gap-4">
        <Link
          href="/profile"
          className="inline-flex items-center text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="mr-1 h-4 w-4" />
          Powrót
        </Link>
        <div>
          <h1 className="text-2xl font-bold">Edytuj profil</h1>
          <p className="text-muted-foreground">Zaktualizuj swoje dane</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Avatar</CardTitle>
        </CardHeader>
        <CardContent>
          <AvatarUpload
            value={form.avatar}
            onChange={(url) => setForm({ ...form, avatar: url })}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Dane osobowe</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Imię</Label>
              <Input
                id="name"
                placeholder="Twoje imię"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
              <p className="text-xs text-muted-foreground">
                Wyświetlane na profilu obok nazwy użytkownika
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="bio">Biografia</Label>
              <Textarea
                id="bio"
                placeholder="Napisz kilka słów o sobie..."
                value={form.bio}
                onChange={(e) => setForm({ ...form, bio: e.target.value })}
                rows={4}
              />
              <div className="flex justify-between">
                <p className="text-xs text-muted-foreground">
                  Widoczna na publicznym profilu
                </p>
                <p className="text-xs text-muted-foreground">
                  {form.bio.length}/500
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Link href="/profile">
                <Button type="button" variant="outline">
                  Anuluj
                </Button>
              </Link>
              <Button type="submit" disabled={loading}>
                <Save className="mr-2 h-4 w-4" />
                {loading ? 'Zapisywanie...' : 'Zapisz'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
