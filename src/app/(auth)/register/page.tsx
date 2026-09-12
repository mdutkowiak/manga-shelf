'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { BookOpen, Mail, Lock, User, UserPlus, ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { register } from '@/lib/actions/auth'

export default function RegisterPage() {
  const router = useRouter()
  const [form, setForm] = useState({
    email: '',
    username: '',
    password: '',
    confirmPassword: '',
    name: '',
  })
  const [errors, setErrors] = useState<Record<string, string[]>>({})
  const [loading, setLoading] = useState(false)
  const [globalError, setGlobalError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setErrors({})
    setGlobalError(null)

    if (form.password !== form.confirmPassword) {
      setErrors({ confirmPassword: ['Hasła nie są identyczne'] })
      setLoading(false)
      return
    }

    try {
      const result = await register({
        email: form.email,
        username: form.username,
        password: form.password,
        name: form.name || undefined,
      })

      if (result.success) {
        router.push('/login?registered=true')
      } else {
        setErrors(result.error || {})
      }
    } catch {
      setGlobalError('Błąd podczas rejestracji')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-radial-gradient p-4 sm:p-6 overflow-hidden">
      {/* Top back button */}
      <div className="absolute top-4 left-4 sm:top-6 sm:left-6">
        <Link href="/">
          <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" />
            <span>Strona główna</span>
          </Button>
        </Link>
      </div>

      <div className="w-full max-w-md space-y-6 animate-in fade-in-50 duration-300">
        {/* Logo and title */}
        <div className="flex flex-col items-center gap-2 text-center">
          <Link href="/" className="flex items-center gap-2 group">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-tr from-primary to-primary/80 text-primary-foreground shadow-lg shadow-primary/25 transition-transform group-hover:scale-105">
              <BookOpen className="h-6 w-6" />
            </div>
          </Link>
          <h1 className="text-2xl font-bold tracking-tight">Dołącz do MangOwO</h1>
          <p className="text-sm text-muted-foreground">
            Zarządzaj swoją kolekcją mangi bez ograniczeń
          </p>
        </div>

        {/* Register form card */}
        <Card className="glass-panel border-muted/80 shadow-xl">
          <CardHeader className="space-y-1 pb-4">
            <CardTitle className="text-xl">Rejestracja</CardTitle>
            <CardDescription className="text-xs">
              Wypełnij poniższe pola, aby utworzyć konto
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-xs font-medium">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="twoj@email.com"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    className="pl-9 text-sm"
                    required
                  />
                </div>
                {errors.email && <p className="text-xs text-destructive">{errors.email[0]}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="username" className="text-xs font-medium">Nazwa użytkownika</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="username"
                    placeholder="jan_kowalski"
                    value={form.username}
                    onChange={(e) => setForm({ ...form, username: e.target.value })}
                    className="pl-9 text-sm"
                    required
                  />
                </div>
                {errors.username && <p className="text-xs text-destructive">{errors.username[0]}</p>}
                <p className="text-[10px] text-muted-foreground">
                  3-20 znaków, litery, cyfry i podkreślenia
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="name" className="text-xs font-medium">Imię / Nick (opcjonalnie)</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="name"
                    placeholder="Jan Kowalski"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className="pl-9 text-sm"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-xs font-medium">Hasło</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                    className="pl-9 text-sm"
                    required
                  />
                </div>
                {errors.password && <p className="text-xs text-destructive">{errors.password[0]}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword" className="text-xs font-medium">Powtórz hasło</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="confirmPassword"
                    type="password"
                    placeholder="••••••••"
                    value={form.confirmPassword}
                    onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
                    className="pl-9 text-sm"
                    required
                  />
                </div>
                {errors.confirmPassword && (
                  <p className="text-xs text-destructive">{errors.confirmPassword[0]}</p>
                )}
              </div>

              {globalError && (
                <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-2.5 text-xs text-destructive">
                  {globalError}
                </div>
              )}

              <Button type="submit" className="w-full font-semibold shadow-md shadow-primary/20" disabled={loading}>
                <UserPlus className="mr-2 h-4 w-4" />
                {loading ? 'Rejestracja...' : 'Utwórz bezpłatne konto'}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Login link */}
        <div className="text-center text-xs text-muted-foreground space-y-1">
          <p>
            Masz już konto?{' '}
            <Link href="/login" className="font-semibold text-primary hover:underline">
              Zaloguj się
            </Link>
          </p>
          <p>
            <Link href="/about" className="hover:underline text-muted-foreground">
              O projekcie i funkcjonalnościach
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
