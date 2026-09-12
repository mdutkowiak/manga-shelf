'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { signIn } from 'next-auth/react'
import { BookOpen, Sparkles, LogIn, UserPlus, Menu, X, ArrowRight, Info, Layers, DollarSign } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function LandingNav() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [demoLoading, setDemoLoading] = useState(false)
  const router = useRouter()

  const handleDemoLogin = async () => {
    setDemoLoading(true)
    try {
      const res = await signIn('credentials', {
        email: 'admin@manga.pl',
        password: 'admin123',
        redirect: false,
      })
      if (res?.ok) {
        router.push('/')
        router.refresh()
      } else {
        router.push('/login')
      }
    } catch {
      router.push('/login')
    } finally {
      setDemoLoading(false)
    }
  }

  return (
    <header className="sticky top-0 z-50 w-full glass-nav backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
        {/* Brand */}
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-primary to-primary/80 text-primary-foreground shadow-md shadow-primary/20 transition-transform group-hover:scale-105">
            <BookOpen className="h-5 w-5" />
          </div>
          <div className="flex flex-col">
            <span className="text-lg font-bold tracking-tight gradient-text">MangOwO</span>
            <span className="text-[10px] uppercase font-semibold tracking-wider text-muted-foreground -mt-1">
              Tracker & Kolekcja PL
            </span>
          </div>
        </Link>

        {/* Desktop Navigation Links */}
        <nav className="hidden items-center gap-6 md:flex">
          <a
            href="#features"
            className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            <Layers className="h-4 w-4" />
            Możliwości
          </a>
          <a
            href="#publishers"
            className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            Polskie Wydania
          </a>
          <a
            href="#finances"
            className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            <DollarSign className="h-4 w-4" />
            Finanse & Ceny
          </a>
          <Link
            href="/about"
            className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            <Info className="h-4 w-4" />
            O projekcie
          </Link>
        </nav>

        {/* Desktop CTA buttons */}
        <div className="hidden items-center gap-3 md:flex">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleDemoLogin}
            disabled={demoLoading}
            className="text-xs font-semibold text-primary hover:bg-primary/10"
          >
            <Sparkles className="mr-1.5 h-3.5 w-3.5" />
            {demoLoading ? 'Ładowanie...' : 'Wypróbuj Demo'}
          </Button>

          <Link href="/login">
            <Button variant="outline" size="sm" className="text-xs">
              <LogIn className="mr-1.5 h-3.5 w-3.5" />
              Zaloguj się
            </Button>
          </Link>

          <Link href="/register">
            <Button size="sm" className="text-xs bg-primary text-primary-foreground shadow-sm hover:opacity-90">
              <UserPlus className="mr-1.5 h-3.5 w-3.5" />
              Dołącz teraz
            </Button>
          </Link>
        </div>

        {/* Mobile menu button */}
        <div className="flex md:hidden items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleDemoLogin}
            disabled={demoLoading}
            className="text-xs font-semibold text-primary px-2"
          >
            <Sparkles className="h-3.5 w-3.5 mr-1" />
            Demo
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle menu"
            className="h-9 w-9"
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>
      </div>

      {/* Mobile drop-down menu */}
      {mobileMenuOpen && (
        <div className="border-b bg-background/95 px-4 py-5 backdrop-blur-lg md:hidden animate-in slide-in-from-top-2">
          <div className="flex flex-col space-y-3">
            <a
              href="#features"
              onClick={() => setMobileMenuOpen(false)}
              className="px-3 py-2 rounded-lg text-sm font-medium hover:bg-muted"
            >
              Możliwości
            </a>
            <a
              href="#publishers"
              onClick={() => setMobileMenuOpen(false)}
              className="px-3 py-2 rounded-lg text-sm font-medium hover:bg-muted"
            >
              Polskie Wydania
            </a>
            <a
              href="#finances"
              onClick={() => setMobileMenuOpen(false)}
              className="px-3 py-2 rounded-lg text-sm font-medium hover:bg-muted"
            >
              Finanse & Ceny
            </a>
            <Link
              href="/about"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium hover:bg-muted"
            >
              <Info className="h-4 w-4" />
              O projekcie (/about)
            </Link>

            <div className="pt-3 border-t flex flex-col gap-2">
              <Link href="/login" onClick={() => setMobileMenuOpen(false)}>
                <Button variant="outline" className="w-full justify-center text-sm">
                  <LogIn className="mr-2 h-4 w-4" />
                  Zaloguj się
                </Button>
              </Link>
              <Link href="/register" onClick={() => setMobileMenuOpen(false)}>
                <Button className="w-full justify-center text-sm">
                  <UserPlus className="mr-2 h-4 w-4" />
                  Zarejestruj się za darmo
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      )}
    </header>
  )
}
