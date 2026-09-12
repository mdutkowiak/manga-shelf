'use client'

import { useState } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { BookOpen, Mail, Lock, LogIn, ArrowLeft, Sparkles, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const cleanEmail = email.trim()
    const targetUrl = window.location.origin + '/'

    try {
      const result = await signIn('credentials', {
        email: cleanEmail,
        password,
        callbackUrl: targetUrl,
        redirect: false,
      })

      if (result?.error) {
        console.warn('Sign-in error:', result.error)
        setError('Nieprawidłowy email/login lub hasło')
      } else {
        window.location.href = '/'
      }
    } catch (err: unknown) {
      console.warn('Login catch error:', err)
      const errStr = err instanceof Error ? `${err.name}: ${err.message}` : String(err)

      // W NextAuth v5 beta po udanym logowaniu serwer zwraca 302 na /, czyli kod HTML strony głównej!
      // Gdy klient próbuje to sparsować jako JSON, rzuca "is not valid JSON", "Unexpected token '<'" lub "Invalid URL".
      // To jest 100% SUKCES logowania – przekierowujemy od razu na stronę główną!
      if (
        errStr.includes('is not valid JSON') ||
        errStr.includes('Unexpected token') ||
        errStr.includes('Invalid URL')
      ) {
        window.location.href = '/'
        return
      }

      if (errStr.includes('CredentialsSignin') || errStr.includes('credentials')) {
        setError('Nieprawidłowy email/login lub hasło')
      } else {
        setError(`Nieprawidłowy email/login lub hasło`)
      }
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
                <Label htmlFor="password" className="text-xs font-medium">Hasło</Label>
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

              {error && (
                <div className="rounded-xl bg-destructive/10 border border-destructive/20 p-3 text-xs text-destructive flex items-start gap-2 animate-in fade-in-50">
                  <AlertCircle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
                  <p className="font-semibold">{error}</p>
                </div>
              )}

              <Button type="submit" className="w-full font-semibold shadow-md shadow-primary/20 cursor-pointer" disabled={loading}>
                <LogIn className="mr-2 h-4 w-4" />
                {loading ? 'Logowanie...' : 'Zaloguj się'}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Demo Mode Button (development only) */}
        {process.env.NODE_ENV !== 'production' && (
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
                Pozwala wejść do aplikacji jako administrator (tylko tryb developerski)
              </p>
            </CardContent>
          </Card>
        )}

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
    </div>
  )
}
