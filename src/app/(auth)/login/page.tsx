'use client'

import { useState } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { BookOpen, Mail, Lock, LogIn, ArrowLeft, Sparkles, KeyRound, Check, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [successInfo, setSuccessInfo] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  // Reset password modal state
  const [resetModalOpen, setResetModalOpen] = useState(false)
  const [resetIdentifier, setResetIdentifier] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [resetLoading, setResetLoading] = useState(false)
  const [resetError, setResetError] = useState<string | null>(null)
  const [resetSuccess, setResetSuccess] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setSuccessInfo(null)

    try {
      const result = await signIn('credentials', {
        email: email.trim(),
        password,
        redirect: false,
      })

      if (result?.error) {
        console.warn('Sign-in result error code:', result.error)
        setError('Nieprawidłowy email/login lub hasło. Jeśli nie pamiętasz hasła, skorzystaj z opcji "Zresetuj hasło" poniżej.')
      } else {
        router.push('/')
        router.refresh()
      }
    } catch (err: unknown) {
      console.warn('Login catch notice:', err)
      setError('Błąd połączenia podczas logowania. Spróbuj ponownie za chwilę.')
    } finally {
      setLoading(false)
    }
  }

  const handleDemoLogin = async () => {
    setLoading(true)
    setError(null)

    try {
      const result = await signIn('credentials', {
        email: 'admin@manga.pl',
        password: 'admin123',
        redirect: false,
      })

      if (result?.error) {
        setError('Demo wymaga poprawnej sesji. Spróbuj zalogować się ponownie.')
      } else {
        router.push('/')
        router.refresh()
      }
    } catch {
      setError('Błąd podczas logowania demo')
    } finally {
      setLoading(false)
    }
  }

  const handleOpenResetModal = () => {
    setResetIdentifier(email.trim())
    setNewPassword('')
    setConfirmPassword('')
    setResetError(null)
    setResetSuccess(null)
    setResetModalOpen(true)
  }

  const handleResetSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setResetError(null)
    setResetSuccess(null)

    if (!resetIdentifier.trim()) {
      setResetError('Podaj swój login lub adres email')
      return
    }

    if (newPassword.length < 6) {
      setResetError('Nowe hasło musi mieć co najmniej 6 znaków')
      return
    }

    if (newPassword !== confirmPassword) {
      setResetError('Podane hasła nie są identyczne')
      return
    }

    setResetLoading(true)
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          identifier: resetIdentifier.trim(),
          newPassword,
        }),
      })

      const data = await res.json()
      if (res.ok && data.success) {
        setResetSuccess(data.message || 'Hasło zostało pomyślnie zmienione!')
        setEmail(resetIdentifier.trim())
        setPassword(newPassword)
        setSuccessInfo(`Hasło dla konta "${data.username || resetIdentifier}" zostało zmienione. Kliknij "Zaloguj się", aby przejść do panelu.`)
        setTimeout(() => {
          setResetModalOpen(false)
        }, 1500)
      } else {
        setResetError(data.error || 'Nie udało się zmienić hasła')
      }
    } catch {
      setResetError('Błąd połączenia z serwerem')
    } finally {
      setResetLoading(false)
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
          <h1 className="text-2xl font-bold tracking-tight">Witaj ponownie</h1>
          <p className="text-sm text-muted-foreground">
            Zaloguj się do swojego konta w <span className="font-semibold text-foreground">MangOwO</span>
          </p>
        </div>

        {/* Login form card */}
        <Card className="glass-panel border-muted/80 shadow-xl">
          <CardHeader className="space-y-1 pb-4">
            <CardTitle className="text-xl">Zaloguj się</CardTitle>
            <CardDescription className="text-xs">
              Wprowadź swój adres email lub login oraz hasło
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-xs font-medium">Email lub Login</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="email"
                    type="text"
                    placeholder="twoj@email.com lub login"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-9 text-sm"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password" className="text-xs font-medium">Hasło</Label>
                  <button
                    type="button"
                    onClick={handleOpenResetModal}
                    className="text-[11px] text-primary hover:underline font-medium cursor-pointer"
                  >
                    Nie pamiętasz hasła?
                  </button>
                </div>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-9 text-sm"
                    required
                  />
                </div>
              </div>

              {successInfo && (
                <div className="rounded-xl bg-emerald-950/60 border border-emerald-500/40 p-3 text-xs text-emerald-300 flex items-start gap-2 animate-in fade-in-50">
                  <Check className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span>{successInfo}</span>
                </div>
              )}

              {error && (
                <div className="rounded-xl bg-destructive/10 border border-destructive/20 p-3 text-xs text-destructive flex items-start gap-2 animate-in fade-in-50">
                  <AlertCircle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold">{error}</p>
                    <button
                      type="button"
                      onClick={handleOpenResetModal}
                      className="mt-1.5 inline-flex items-center gap-1.5 text-xs font-bold text-primary underline underline-offset-2 hover:opacity-80"
                    >
                      <KeyRound className="h-3.5 w-3.5" />
                      <span>Kliknij tutaj, aby zresetować hasło dla swojego konta</span>
                    </button>
                  </div>
                </div>
              )}

              <Button type="submit" className="w-full font-semibold shadow-md shadow-primary/20 cursor-pointer" disabled={loading}>
                <LogIn className="mr-2 h-4 w-4" />
                {loading ? 'Logowanie...' : 'Zaloguj się'}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Demo Mode Button */}
        <Card className="glass-panel border-dashed border-primary/30">
          <CardContent className="p-4 text-center space-y-2">
            <Button
              variant="outline"
              className="w-full text-xs font-semibold hover:bg-primary/10 hover:text-primary cursor-pointer"
              onClick={handleDemoLogin}
              disabled={loading}
            >
              <Sparkles className="mr-2 h-3.5 w-3.5 text-primary" />
              Szybkie wejście jako Demo Admin
            </Button>
            <p className="text-[11px] text-muted-foreground">
              Pozwala natychmiast wejść do aplikacji i zarządzać użytkownikami
            </p>
          </CardContent>
        </Card>

        {/* Register link & about */}
        <div className="space-y-2 text-center text-xs text-muted-foreground">
          <p>
            Nie masz jeszcze konta?{' '}
            <Link href="/register" className="font-semibold text-primary hover:underline">
              Zarejestruj się bezpłatnie
            </Link>
          </p>
          <p>
            <Link href="/about" className="hover:underline text-muted-foreground">
              O projekcie i technologiach
            </Link>
          </p>
        </div>
      </div>

      {/* Modal resetowania hasła */}
      <Dialog open={resetModalOpen} onOpenChange={setResetModalOpen}>
        <DialogContent className="sm:max-w-md bg-[#0F1322] border-white/10 text-foreground">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg">
              <KeyRound className="h-5 w-5 text-primary" />
              <span>Resetowanie hasła</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Wpisz swój login lub adres email oraz nowe hasło, aby odzyskać dostęp do konta.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleResetSubmit} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label htmlFor="resetIdentifier" className="text-xs font-medium">Login lub Email</Label>
              <Input
                id="resetIdentifier"
                placeholder="np. DaQu lub twoj@email.com"
                value={resetIdentifier}
                onChange={(e) => setResetIdentifier(e.target.value)}
                className="bg-black/30 border-white/10 text-sm"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="newPassword" className="text-xs font-medium">Nowe hasło</Label>
              <Input
                id="newPassword"
                type="password"
                placeholder="Minimum 6 znaków"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="bg-black/30 border-white/10 text-sm"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="confirmPassword" className="text-xs font-medium">Powtórz nowe hasło</Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="Wpisz ponownie nowe hasło"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="bg-black/30 border-white/10 text-sm"
                required
              />
            </div>

            {resetError && (
              <div className="p-2.5 rounded-xl bg-destructive/15 border border-destructive/30 text-xs text-destructive flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{resetError}</span>
              </div>
            )}

            {resetSuccess && (
              <div className="p-2.5 rounded-xl bg-emerald-950/60 border border-emerald-500/40 text-xs text-emerald-300 flex items-center gap-2">
                <Check className="h-4 w-4 text-emerald-400 shrink-0" />
                <span>{resetSuccess}</span>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setResetModalOpen(false)}
                disabled={resetLoading}
                className="text-xs"
              >
                Anuluj
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={resetLoading}
                className="text-xs font-semibold gap-1.5 bg-primary hover:bg-primary/90 text-primary-foreground"
              >
                <KeyRound className="h-3.5 w-3.5" />
                {resetLoading ? 'Zapisywanie...' : 'Zapisz nowe hasło'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
