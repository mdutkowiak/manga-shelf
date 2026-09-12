'use client'

import Link from 'next/link'
import {
  BookOpen,
  Layers,
  Code2,
  Database,
  Shield,
  Zap,
  Smartphone,
  Cpu,
  Server,
  DollarSign,
  Users,
  Search,
  Sparkles,
  ArrowLeft,
  CheckCircle2,
  Package,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-background text-foreground bg-radial-gradient">
      {/* Top Bar Navigation */}
      <header className="sticky top-0 z-50 glass-nav">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
          <Link href="/" className="flex items-center gap-2 group">
            <Button variant="ghost" size="sm" className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              <span>Powrót do strony głównej</span>
            </Button>
          </Link>

          <div className="flex items-center gap-2">
            <Link href="/collection">
              <Button variant="outline" size="sm">
                <BookOpen className="mr-1.5 h-4 w-4" />
                Kolekcja
              </Button>
            </Link>
            <Link href="/login">
              <Button size="sm">Zaloguj się</Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8 space-y-16">
        <div className="text-center space-y-4 max-w-3xl mx-auto">
          <Badge variant="outline" className="px-3 py-1 text-xs">
            Dokumentacja i Architektura Projektu
          </Badge>
          <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl">
            O Projekcie <span className="gradient-text">MangOwO</span>
          </h1>
          <p className="text-muted-foreground text-base sm:text-lg leading-relaxed">
            Nowoczesny, kompleksowy system do zarządzania fizyczną kolekcją mangi ze szczególnym
            uwzględnieniem polskiego rynku wydawniczego, wyceny w PLN oraz natychmiastowej responsywności UI.
          </p>
        </div>

        {/* 1. Misja Projektu */}
        <section className="space-y-6">
          <div className="flex items-center gap-2 border-b pb-3">
            <Sparkles className="h-6 w-6 text-primary" />
            <h2 className="text-2xl font-bold">1. Misja i Cel Projektu</h2>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <Card className="glass-panel">
              <CardHeader>
                <CardTitle className="text-lg">Problem</CardTitle>
                <CardDescription>Ograniczenia istniejących serwisów</CardDescription>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground space-y-2">
                <p>
                  Popularne portale takie jak <em>MyAnimeList</em> czy <em>AniList</em> koncentrują się na
                  wydaniach japońskich i anglojęzycznych. Brakuje w nich polskich numerów ISBN, podwójnych wydań
                  (np. 2w1), cen katalogowych w PLN oraz lokalnych harmonogramów wydawnictw (Waneko, Studio JG,
                  JPF itp.). Kolekcjonerzy byli zmuszeni do prowadzenia żmudnych arkuszy Excel.
                </p>
              </CardContent>
            </Card>

            <Card className="glass-panel">
              <CardHeader>
                <CardTitle className="text-lg">Rozwiązanie</CardTitle>
                <CardDescription>MangOwO Portal</CardDescription>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground space-y-2">
                <p>
                  MangOwO łączy bogatą bazę metadanych z AniList API z dedykowanym polskim silnikiem danych.
                  Umożliwia błyskawiczne zaznaczanie posiadanych tomów dzięki <strong>Optimistic UI</strong>,
                  śledzenie realnych wydatków w PLN, porównywanie cen w księgarniach oraz instalację jako PWA
                  działające w trybie offline w księgarniach.
                </p>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* 2. Pełny Wykaz Funkcjonalności */}
        <section className="space-y-6">
          <div className="flex items-center gap-2 border-b pb-3">
            <Layers className="h-6 w-6 text-primary" />
            <h2 className="text-2xl font-bold">2. Wykaz Wszystkich Funkcjonalności</h2>
          </div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {/* Moduł 1 */}
            <Card className="glass-panel">
              <CardHeader>
                <div className="flex items-center gap-2 text-primary">
                  <BookOpen className="h-5 w-5" />
                  <CardTitle className="text-base">Kolekcja & Półka</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="text-xs space-y-2 text-muted-foreground">
                <div className="flex items-start gap-1.5">
                  <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0 mt-0.5" />
                  <span><strong>Optimistic UI:</strong> zmiana stanu w 0 ms</span>
                </div>
                <div className="flex items-start gap-1.5">
                  <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0 mt-0.5" />
                  <span><strong>Statusy:</strong> Posiadane, Przeczytane, Wishlist, Zamówione, Preorder</span>
                </div>
                <div className="flex items-start gap-1.5">
                  <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0 mt-0.5" />
                  <span><strong>Widoki:</strong> Przełącznik Grid / List View z pamięcią w localStorage</span>
                </div>
                <div className="flex items-start gap-1.5">
                  <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0 mt-0.5" />
                  <span><strong>Custom Covers:</strong> upload własnych okładek tomów i serii</span>
                </div>
              </CardContent>
            </Card>

            {/* Moduł 2 */}
            <Card className="glass-panel">
              <CardHeader>
                <div className="flex items-center gap-2 text-primary">
                  <DollarSign className="h-5 w-5" />
                  <CardTitle className="text-base">Finanse & Rynek PL</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="text-xs space-y-2 text-muted-foreground">
                <div className="flex items-start gap-1.5">
                  <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0 mt-0.5" />
                  <span>Śledzenie cen zakupu w PLN (<code>purchasePrice</code>)</span>
                </div>
                <div className="flex items-start gap-1.5">
                  <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0 mt-0.5" />
                  <span>Kalkulacja sumy wydatków vs wartości katalogowej i oszczędności</span>
                </div>
                <div className="flex items-start gap-1.5">
                  <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0 mt-0.5" />
                  <span>Porównywarka cen w sklepach (Waneko, Empik, TaniaKsiazka itp.)</span>
                </div>
                <div className="flex items-start gap-1.5">
                  <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0 mt-0.5" />
                  <span>Wykres historii cen tomu (Recharts LineChart)</span>
                </div>
              </CardContent>
            </Card>

            {/* Moduł 3 */}
            <Card className="glass-panel">
              <CardHeader>
                <div className="flex items-center gap-2 text-primary">
                  <Search className="h-5 w-5" />
                  <CardTitle className="text-base">Silnik Danych AniList</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="text-xs space-y-2 text-muted-foreground">
                <div className="flex items-start gap-1.5">
                  <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0 mt-0.5" />
                  <span>Integracja GraphQL z API AniList</span>
                </div>
                <div className="flex items-start gap-1.5">
                  <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0 mt-0.5" />
                  <span>Wyszukiwarka mangi w czasie rzeczywistym</span>
                </div>
                <div className="flex items-start gap-1.5">
                  <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0 mt-0.5" />
                  <span>Masowy kreator tomów (Bulk Volume Creator 1-20+)</span>
                </div>
                <div className="flex items-start gap-1.5">
                  <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0 mt-0.5" />
                  <span>Automatyczne czyszczenie opisów i mapowanie statusów</span>
                </div>
              </CardContent>
            </Card>

            {/* Moduł 4 */}
            <Card className="glass-panel">
              <CardHeader>
                <div className="flex items-center gap-2 text-primary">
                  <Users className="h-5 w-5" />
                  <CardTitle className="text-base">Społeczność & Profile</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="text-xs space-y-2 text-muted-foreground">
                <div className="flex items-start gap-1.5">
                  <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0 mt-0.5" />
                  <span>Publiczne profile użytkowników <code>/users/[username]</code></span>
                </div>
                <div className="flex items-start gap-1.5">
                  <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0 mt-0.5" />
                  <span>System znajomych (zaproszenia, akceptacja, 4 zakładki)</span>
                </div>
                <div className="flex items-start gap-1.5">
                  <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0 mt-0.5" />
                  <span>Edycja profilu (upload awatara, biografia)</span>
                </div>
                <div className="flex items-start gap-1.5">
                  <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0 mt-0.5" />
                  <span>Live Activity Feed ze zdarzeniami znajomych</span>
                </div>
              </CardContent>
            </Card>

            {/* Moduł 5 */}
            <Card className="glass-panel">
              <CardHeader>
                <div className="flex items-center gap-2 text-primary">
                  <Smartphone className="h-5 w-5" />
                  <CardTitle className="text-base">PWA & Offline</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="text-xs space-y-2 text-muted-foreground">
                <div className="flex items-start gap-1.5">
                  <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0 mt-0.5" />
                  <span>Instalacja jako aplikacja na smartfonach (iOS/Android)</span>
                </div>
                <div className="flex items-start gap-1.5">
                  <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0 mt-0.5" />
                  <span>Dedykowany Service Worker z cache&apos;owaniem okładek</span>
                </div>
                <div className="flex items-start gap-1.5">
                  <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0 mt-0.5" />
                  <span>Dedykowany ekran fallbacku Offline</span>
                </div>
                <div className="flex items-start gap-1.5">
                  <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0 mt-0.5" />
                  <span>Automatyczny monit instalacji (PWA Install Prompt)</span>
                </div>
              </CardContent>
            </Card>

            {/* Moduł 6 */}
            <Card className="glass-panel">
              <CardHeader>
                <div className="flex items-center gap-2 text-primary">
                  <Shield className="h-5 w-5" />
                  <CardTitle className="text-base">Panel Administratora</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="text-xs space-y-2 text-muted-foreground">
                <div className="flex items-start gap-1.5">
                  <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0 mt-0.5" />
                  <span>Zarządzanie katalogiem mang i tomów</span>
                </div>
                <div className="flex items-start gap-1.5">
                  <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0 mt-0.5" />
                  <span>Zarządzanie wydawnictwami i sklepami</span>
                </div>
                <div className="flex items-start gap-1.5">
                  <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0 mt-0.5" />
                  <span>Zarządzanie uprawnieniami użytkowników (USER/ADMIN)</span>
                </div>
                <div className="flex items-start gap-1.5">
                  <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0 mt-0.5" />
                  <span>Bezpieczna ochrona tras przez Middleware</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* 3. Stack Technologiczny */}
        <section className="space-y-6">
          <div className="flex items-center gap-2 border-b pb-3">
            <Code2 className="h-6 w-6 text-primary" />
            <h2 className="text-2xl font-bold">3. Kompletny Stack Technologiczny i Biblioteki</h2>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            {/* Frontend & Framework */}
            <Card className="glass-panel">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Cpu className="h-5 w-5 text-primary" />
                  <CardTitle className="text-base">Frontend & Framework</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="font-semibold">Next.js 16.3.0</span>
                    <Badge variant="secondary">App Router</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Server Components, Server Actions dla bezpiecznych mutacji danych, Streaming SSR.
                  </p>
                </div>

                <div>
                  <div className="flex items-center justify-between">
                    <span className="font-semibold">React 19.2.8</span>
                    <Badge variant="secondary">Core</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Nowe hooki, automatyczne optymalizacje renderowania, useOptimistic.
                  </p>
                </div>

                <div>
                  <div className="flex items-center justify-between">
                    <span className="font-semibold">TypeScript 5</span>
                    <Badge variant="secondary">Język</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    End-to-end type safety, pełne typowanie Prisma i Auth.js.
                  </p>
                </div>

                <div>
                  <div className="flex items-center justify-between">
                    <span className="font-semibold">Tailwind CSS v4</span>
                    <Badge variant="secondary">Styling</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Silnik CSS nowej generacji z <code>@theme</code>, animacje <code>tw-animate-css</code>.
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* UI Components & Visualization */}
            <Card className="glass-panel">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Package className="h-5 w-5 text-primary" />
                  <CardTitle className="text-base">Komponenty UI & Wizualizacja</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="font-semibold">Shadcn/UI & Radix/Base-UI</span>
                    <Badge variant="secondary">Komponenty</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Dostępne (WCAG), elastyczne komponenty Dialog, Sheet, Tabs, Dropdown, Table, Input, Card.
                  </p>
                </div>

                <div>
                  <div className="flex items-center justify-between">
                    <span className="font-semibold">Lucide React Icons</span>
                    <Badge variant="secondary">Ikony</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Lekki i spójny zestaw ponad 1000 ikon wektorowych.
                  </p>
                </div>

                <div>
                  <div className="flex items-center justify-between">
                    <span className="font-semibold">Recharts 3.10.1</span>
                    <Badge variant="secondary">Wykresy</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Responsywne wykresy liniowe i słupkowe dla historii cen oraz wydatków.
                  </p>
                </div>

                <div>
                  <div className="flex items-center justify-between">
                    <span className="font-semibold">clsx & tailwind-merge</span>
                    <Badge variant="secondary">Narzędzia</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Bezpieczne warunkowe łączenie i nadpisywanie klas Tailwind CSS.
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Backend, Baza & Auth */}
            <Card className="glass-panel">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Database className="h-5 w-5 text-primary" />
                  <CardTitle className="text-base">Baza Danych & Autentykacja</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="font-semibold">PostgreSQL 15</span>
                    <Badge variant="secondary">SQL Database</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Relacyjna baza danych o wysokiej wydajności z indeksami i kluczami obcymi.
                  </p>
                </div>

                <div>
                  <div className="flex items-center justify-between">
                    <span className="font-semibold">Prisma ORM 7.9.1</span>
                    <Badge variant="secondary">ORM & Migracje</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Automatycznie generowany klient, <code>@prisma/adapter-pg</code>, migracje schematu.
                  </p>
                </div>

                <div>
                  <div className="flex items-center justify-between">
                    <span className="font-semibold">Auth.js / NextAuth v5</span>
                    <Badge variant="secondary">Autentykacja</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Obsługa sesji JWT, Credentials provider, hashowanie <code>bcryptjs</code>, Demo mode fallback.
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* DevOps & Deployment */}
            <Card className="glass-panel">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Server className="h-5 w-5 text-primary" />
                  <CardTitle className="text-base">DevOps & Wdrożenie</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="font-semibold">Docker & Docker Compose</span>
                    <Badge variant="secondary">Konteneryzacja</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Multi-stage Dockerfile dla Next.js standalone oraz konfiguracja bazy PostgreSQL.
                  </p>
                </div>

                <div>
                  <div className="flex items-center justify-between">
                    <span className="font-semibold">Nginx & Certbot SSL</span>
                    <Badge variant="secondary">Reverse Proxy</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Zabezpieczone połączenia HTTPS, proxy dla Mini PC / serwera Linux.
                  </p>
                </div>

                <div>
                  <div className="flex items-center justify-between">
                    <span className="font-semibold">Automatyczny skrypt SSH</span>
                    <Badge variant="secondary">CI/CD Script</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    <code>scripts/deploy-ssh.sh</code> wykonujący rsync, migracje Prisma i rebuild kontenerów.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* 4. Wyróżniki Architektoniczne */}
        <section className="space-y-6">
          <div className="flex items-center gap-2 border-b pb-3">
            <Zap className="h-6 w-6 text-primary" />
            <h2 className="text-2xl font-bold">4. Wyróżniki Architektoniczne</h2>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-xl glass-panel p-5 space-y-2">
              <h3 className="font-bold text-sm">Optimistic Updates</h3>
              <p className="text-xs text-muted-foreground">
                Natychmiastowa aktualizacja stanu okładek w pamięci komponentu przed wysłaniem żądania sieciowego.
              </p>
            </div>

            <div className="rounded-xl glass-panel p-5 space-y-2">
              <h3 className="font-bold text-sm">Hybrydowy Silnik</h3>
              <p className="text-xs text-muted-foreground">
                Połączenie globalnych danych AniList z lokalnymi danymi polskich wydań i cenników.
              </p>
            </div>

            <div className="rounded-xl glass-panel p-5 space-y-2">
              <h3 className="font-bold text-sm">Demo Mode Fallback</h3>
              <p className="text-xs text-muted-foreground">
                Niezawodne działanie trybu demonstracyjnego nawet przy braku aktywnej bazy PostgreSQL.
              </p>
            </div>

            <div className="rounded-xl glass-panel p-5 space-y-2">
              <h3 className="font-bold text-sm">Offline-Ready PWA</h3>
              <p className="text-xs text-muted-foreground">
                Przechowywanie zasobów w Service Workerze dla wygody korzystania w sklepach stacjonarnych.
              </p>
            </div>
          </div>
        </section>

        {/* CTA Footer */}
        <div className="text-center py-8 border-t space-y-4">
          <h2 className="text-2xl font-bold">Chcesz wypróbować portal MangOwO?</h2>
          <div className="flex justify-center gap-4">
            <Link href="/collection">
              <Button size="lg">
                <BookOpen className="mr-2 h-4 w-4" />
                Przejdź do Kolekcji
              </Button>
            </Link>
            <Link href="/">
              <Button variant="outline" size="lg">
                Strona Główna
              </Button>
            </Link>
          </div>
        </div>
      </main>
    </div>
  )
}
