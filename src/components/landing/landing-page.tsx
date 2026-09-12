'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { signIn } from 'next-auth/react'
import {
  BookOpen,
  Sparkles,
  Zap,
  Users,
  CheckCircle2,
  ArrowRight,
  Search,
  DollarSign,
  Smartphone,
  BookMarked,
  Check,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { LandingNav } from './landing-nav'

// Sample interactive mock volumes for the interactive showcase widget
const initialShowcaseVolumes = [
  {
    id: 'demo-1',
    title: 'Attack on Titan (Atak Tytanów)',
    volumeNumber: 1,
    publisher: 'Waneko',
    price: 29.99,
    cover: 'https://placehold.co/300x450/1a1a2e/ffffff?text=AoT+Tom+1',
    isOwned: true,
  },
  {
    id: 'demo-2',
    title: 'One Piece',
    volumeNumber: 1,
    publisher: 'Waneko',
    price: 24.99,
    cover: 'https://placehold.co/300x450/162447/ffffff?text=OP+Tom+1',
    isOwned: false,
  },
  {
    id: 'demo-3',
    title: 'Chainsaw Man',
    volumeNumber: 1,
    publisher: 'Studio JG',
    price: 34.99,
    cover: 'https://placehold.co/300x450/8b0000/ffffff?text=CSM+Tom+1',
    isOwned: true,
  },
  {
    id: 'demo-4',
    title: 'Jujutsu Kaisen',
    volumeNumber: 1,
    publisher: 'Waneko',
    price: 29.99,
    cover: 'https://placehold.co/300x450/1f2937/ffffff?text=JJK+Tom+1',
    isOwned: false,
  },
]

export function LandingPage() {
  const [showcaseVolumes, setShowcaseVolumes] = useState(initialShowcaseVolumes)
  const [demoLoading, setDemoLoading] = useState(false)
  const router = useRouter()

  const toggleDemoVolume = (id: string) => {
    setShowcaseVolumes((prev) =>
      prev.map((vol) => (vol.id === id ? { ...vol, isOwned: !vol.isOwned } : vol))
    )
  }

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
    <div className="min-h-screen bg-background text-foreground bg-radial-gradient">
      <LandingNav />

      {/* ================= HERO SECTION ================= */}
      <section className="relative overflow-hidden pt-12 pb-20 md:pt-20 md:pb-32">
        <div className="absolute inset-0 -z-10 bg-grid-pattern opacity-40" />
        
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-12 lg:grid-cols-12 lg:items-center">
            {/* Left Copy */}
            <div className="space-y-8 lg:col-span-7">
              <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3.5 py-1.5 text-xs font-semibold text-primary backdrop-blur-md">
                <Sparkles className="h-3.5 w-3.5 animate-pulse" />
                <span>Nowa Generacja Trackera Mangi w Polsce</span>
              </div>

              <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl lg:text-6xl">
                Twoja Kolekcja Mangi.{' '}
                <span className="gradient-text block mt-1">Zawsze pod ręką i wyceniona.</span>
              </h1>

              <p className="text-base text-muted-foreground sm:text-lg max-w-2xl leading-relaxed">
                MangOwO to nowoczesna aplikacja PWA dedykowana polskiemu rynkowi mangi.
                Śledź posiadane tomy, monitoruj wydatki w PLN, sprawdzaj historię cen w sklepach i
                synchronizuj dane z AniList w mgnieniu oka.
              </p>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-4 pt-2">
                <Link href="/register">
                  <Button size="lg" className="h-12 px-6 text-sm font-semibold shadow-lg shadow-primary/20">
                    Rozpocznij za darmo
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>

                <Button
                  variant="outline"
                  size="lg"
                  onClick={handleDemoLogin}
                  disabled={demoLoading}
                  className="h-12 px-6 text-sm font-semibold glass-panel hover:bg-muted/80"
                >
                  <Sparkles className="mr-2 h-4 w-4 text-primary" />
                  {demoLoading ? 'Logowanie...' : 'Wypróbuj Wersję Demo'}
                </Button>
              </div>

              {/* Trust Badges */}
              <div className="grid grid-cols-3 gap-4 pt-4 border-t max-w-lg">
                <div>
                  <p className="text-2xl font-bold">100%</p>
                  <p className="text-xs text-muted-foreground">Polskie Wydawnictwa</p>
                </div>
                <div>
                  <p className="text-2xl font-bold">0 ms</p>
                  <p className="text-xs text-muted-foreground">Optimistic UI</p>
                </div>
                <div>
                  <p className="text-2xl font-bold">PWA</p>
                  <p className="text-xs text-muted-foreground">Działa Offline</p>
                </div>
              </div>
            </div>

            {/* Right Interactive Shelf Mockup */}
            <div className="lg:col-span-5">
              <div className="relative mx-auto max-w-md rounded-2xl glass-panel p-5 shadow-2xl manga-glow">
                <div className="flex items-center justify-between pb-4 mb-4 border-b">
                  <div className="flex items-center gap-2">
                    <div className="h-3 w-3 rounded-full bg-red-500/80" />
                    <div className="h-3 w-3 rounded-full bg-yellow-500/80" />
                    <div className="h-3 w-3 rounded-full bg-green-500/80" />
                    <span className="text-xs font-medium text-muted-foreground ml-2">Moja Półka (Podgląd)</span>
                  </div>
                  <Badge variant="secondary" className="text-[10px]">
                    Kliknij tom, by przełączyć stan
                  </Badge>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  {showcaseVolumes.map((vol) => (
                    <div
                      key={vol.id}
                      onClick={() => toggleDemoVolume(vol.id)}
                      className="group relative cursor-pointer overflow-hidden rounded-xl border bg-background/50 p-2.5 transition-all duration-300 hover:scale-[1.03] hover:shadow-lg"
                    >
                      <div className="relative aspect-[2/3] w-full overflow-hidden rounded-lg bg-muted">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={vol.cover}
                          alt={vol.title}
                          className={`h-full w-full object-cover transition-all duration-300 ${
                            !vol.isOwned ? 'grayscale opacity-40' : 'scale-100'
                          }`}
                        />
                        <div
                          className={`absolute top-1.5 right-1.5 flex h-6 w-6 items-center justify-center rounded-full transition-colors ${
                            vol.isOwned ? 'bg-green-500 text-white' : 'bg-background/80 text-muted-foreground'
                          }`}
                        >
                          {vol.isOwned ? <Check className="h-3.5 w-3.5" /> : <BookMarked className="h-3.5 w-3.5" />}
                        </div>
                        <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/80 to-transparent p-1.5 text-center">
                          <span className="text-[10px] font-bold text-white">Tom {vol.volumeNumber}</span>
                        </div>
                      </div>

                      <div className="mt-2 space-y-0.5">
                        <p className="text-xs font-semibold line-clamp-1">{vol.title}</p>
                        <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                          <span>{vol.publisher}</span>
                          <span className={vol.isOwned ? 'font-bold text-green-600' : 'text-muted-foreground'}>
                            {vol.price.toFixed(2)} zł
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-4 rounded-lg bg-muted/60 p-3 text-xs flex items-center justify-between text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <Zap className="h-4 w-4 text-primary" />
                    <span>
                      Posiadasz:{' '}
                      <strong className="text-foreground">
                        {showcaseVolumes.filter((v) => v.isOwned).length} / {showcaseVolumes.length}
                      </strong>{' '}
                      tomów
                    </span>
                  </div>
                  <span className="font-semibold text-foreground">
                    {showcaseVolumes
                      .filter((v) => v.isOwned)
                      .reduce((sum, v) => sum + v.price, 0)
                      .toFixed(2)}{' '}
                    PLN
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ================= FEATURES GRID ================= */}
      <section id="features" className="py-20 border-t bg-muted/20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center space-y-4 max-w-3xl mx-auto mb-16">
            <Badge variant="outline" className="px-3 py-1 text-xs font-medium">
              Kluczowe Możliwości
            </Badge>
            <h2 className="text-3xl font-extrabold sm:text-4xl">
              Zaprojektowany specjalnie dla fanów mangi w Polsce
            </h2>
            <p className="text-muted-foreground">
              Koniec z ręcznym prowadzeniem arkuszy kalkulacyjnych. Zyskaj jedno, spójne centrum dowodzenia swoją biblioteczką.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {/* Feature 1 */}
            <Card className="glass-panel border-muted hover:border-primary/40 transition-all hover:shadow-lg">
              <CardContent className="p-6 space-y-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Zap className="h-6 w-6" />
                </div>
                <h3 className="text-lg font-bold">Zero-Latency Optimistic UI</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Zaznaczaj kupione tomy natychmiastowo. Interfejs reaguje w ułamku milisekundy, synchronizując dane z serwerem w tle.
                </p>
              </CardContent>
            </Card>

            {/* Feature 2 */}
            <Card className="glass-panel border-muted hover:border-primary/40 transition-all hover:shadow-lg">
              <CardContent className="p-6 space-y-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <BookOpen className="h-6 w-6" />
                </div>
                <h3 className="text-lg font-bold">Polski Rynek Wydawniczy</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Dedykowane wsparcie dla polskich wydawnictw: Waneko, Studio JG, J.P.F, Kotori, Dango, Hanami. Numery ISBN i ceny w PLN.
                </p>
              </CardContent>
            </Card>

            {/* Feature 3 */}
            <Card className="glass-panel border-muted hover:border-primary/40 transition-all hover:shadow-lg">
              <CardContent className="p-6 space-y-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <DollarSign className="h-6 w-6" />
                </div>
                <h3 className="text-lg font-bold">Finanse & Wycena Kolekcji</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Zapisuj realne ceny zakupu. Sprawdzaj, ile wydałeś, jaka jest wartość rynkowa Twojej kolekcji i ile zaoszczędziłeś na promocjach.
                </p>
              </CardContent>
            </Card>

            {/* Feature 4 */}
            <Card className="glass-panel border-muted hover:border-primary/40 transition-all hover:shadow-lg">
              <CardContent className="p-6 space-y-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Search className="h-6 w-6" />
                </div>
                <h3 className="text-lg font-bold">AniList API & Custom Covers</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Wyszukuj serie bezpośrednio w globalnej bazie AniList, a dla polskich tomów wgrywaj własne zdjęcia unikalnych okładek.
                </p>
              </CardContent>
            </Card>

            {/* Feature 5 */}
            <Card className="glass-panel border-muted hover:border-primary/40 transition-all hover:shadow-lg">
              <CardContent className="p-6 space-y-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Smartphone className="h-6 w-6" />
                </div>
                <h3 className="text-lg font-bold">Aplikacja PWA & Offline</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Zainstaluj na smartfonie z systemem Android lub iOS. Sprawdź swoją kolekcję w księgarni nawet wtedy, gdy nie masz zasięgu.
                </p>
              </CardContent>
            </Card>

            {/* Feature 6 */}
            <Card className="glass-panel border-muted hover:border-primary/40 transition-all hover:shadow-lg">
              <CardContent className="p-6 space-y-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Users className="h-6 w-6" />
                </div>
                <h3 className="text-lg font-bold">Społeczność & Znajomi</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Udostępniaj swój profil publiczny, dodawaj znajomych kolekcjonerów i przeglądaj feed z najnowszymi zdarzeniami społeczności.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* ================= POLISH MARKET SECTION ================= */}
      <section id="publishers" className="py-20 border-t">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
            <div className="space-y-6">
              <Badge variant="outline">Polski Rynek Manga</Badge>
              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
                Koniec problemów z tomami wydawanymi w Polsce
              </h2>
              <p className="text-muted-foreground leading-relaxed">
                Większość anglojęzycznych serwisów (MAL, AniList) nie uwzględnia polskich wydań, podwójnych tomów
                (2w1), cen katalogowych w PLN oraz lokalnych dat premier. Manga Shelf Tracker łączy dane z AniList z
                rzeczywistymi polskimi edycjami.
              </p>

              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                  <span className="text-sm">Polskie tytuły, numery tomów i kody ISBN</span>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                  <span className="text-sm">Obsługa wydawców: Waneko, Studio JG, J.P.Fantastica, Kotori, Dango, Hanami</span>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                  <span className="text-sm">Możliwość szybkiego masowego generowania serii (np. tomy 1-25)</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {['Waneko', 'Studio JG', 'J.P.Fantastica', 'Kotori', 'Dango', 'Hanami'].map((pub) => (
                <div
                  key={pub}
                  className="flex items-center justify-between rounded-xl glass-panel p-4 hover:border-primary/40 transition-colors"
                >
                  <span className="font-semibold text-sm">{pub}</span>
                  <Badge variant="secondary" className="text-[10px]">
                    Oficjalne wydania
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ================= FINANCES & STATS SHOWCASE ================= */}
      <section id="finances" className="py-20 border-t bg-muted/20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center space-y-4 max-w-3xl mx-auto mb-16">
            <Badge variant="outline">Analityka & Budżet</Badge>
            <h2 className="text-3xl font-extrabold sm:text-4xl">Wycena kolekcji i kontrola wydatków</h2>
            <p className="text-muted-foreground">
              Wiesz dokładnie, ile kosztowała Twoja biblioteczka i ile zaoszczędziłeś na okazyjnych zakupach.
            </p>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            <Card className="glass-panel">
              <CardContent className="p-6 space-y-2">
                <span className="text-xs text-muted-foreground font-medium">Liczba tomów</span>
                <p className="text-3xl font-bold">148 tomów</p>
                <p className="text-xs text-green-500">+12 w tym miesiącu</p>
              </CardContent>
            </Card>

            <Card className="glass-panel">
              <CardContent className="p-6 space-y-2">
                <span className="text-xs text-muted-foreground font-medium">Suma wydatków</span>
                <p className="text-3xl font-bold">3 420.50 PLN</p>
                <p className="text-xs text-muted-foreground">Śr. 23.11 zł / tom</p>
              </CardContent>
            </Card>

            <Card className="glass-panel">
              <CardContent className="p-6 space-y-2">
                <span className="text-xs text-muted-foreground font-medium">Wartość katalogowa</span>
                <p className="text-3xl font-bold">4 280.00 PLN</p>
                <p className="text-xs text-muted-foreground">Ceny rynkowe wydawców</p>
              </CardContent>
            </Card>

            <Card className="glass-panel">
              <CardContent className="p-6 space-y-2">
                <span className="text-xs text-muted-foreground font-medium">Twoje oszczędności</span>
                <p className="text-3xl font-bold text-green-600">859.50 PLN</p>
                <p className="text-xs text-green-600 font-medium">20.1% taniej niż w cennikach</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* ================= COMPARISON TABLE ================= */}
      <section className="py-20 border-t">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <div className="text-center space-y-4 mb-12">
            <Badge variant="outline">Porównanie</Badge>
            <h2 className="text-3xl font-bold">Dlaczego Manga Shelf?</h2>
          </div>

          <div className="overflow-x-auto rounded-2xl glass-panel border">
            <table className="w-full text-left text-sm">
              <thead className="border-b bg-muted/50 text-xs font-semibold uppercase text-muted-foreground">
                <tr>
                  <th className="p-4">Funkcja</th>
                  <th className="p-4 text-primary font-bold">Manga Shelf Tracker</th>
                  <th className="p-4">MyAnimeList / AniList</th>
                  <th className="p-4">Arkusz Excel</th>
                </tr>
              </thead>
              <tbody className="divide-y text-muted-foreground">
                <tr>
                  <td className="p-4 font-medium text-foreground">Polskie wydawnictwa & ISBN</td>
                  <td className="p-4 text-green-600 font-bold">✓ Pełne wsparcie</td>
                  <td className="p-4 text-destructive">✗ Tylko wydania JP/EN</td>
                  <td className="p-4">Ręczne wpisywanie</td>
                </tr>
                <tr>
                  <td className="p-4 font-medium text-foreground">Optimistic UI (0 ms opóźnień)</td>
                  <td className="p-4 text-green-600 font-bold">✓ Błyskawiczne</td>
                  <td className="p-4 text-destructive">✗ Przeładowania</td>
                  <td className="p-4">Brak</td>
                </tr>
                <tr>
                  <td className="p-4 font-medium text-foreground">Wycena w PLN & oszczędności</td>
                  <td className="p-4 text-green-600 font-bold">✓ Automatyczna</td>
                  <td className="p-4 text-destructive">✗ Brak</td>
                  <td className="p-4">Ręczne formuły</td>
                </tr>
                <tr>
                  <td className="p-4 font-medium text-foreground">Instalacja PWA & Tryb Offline</td>
                  <td className="p-4 text-green-600 font-bold">✓ Działa offline</td>
                  <td className="p-4 text-destructive">✗ Wymaga sieci</td>
                  <td className="p-4">Niewygodne na mobile</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* ================= FINAL CTA ================= */}
      <section className="py-20 border-t bg-gradient-to-b from-background to-muted/40">
        <div className="mx-auto max-w-4xl px-4 text-center space-y-8 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-extrabold sm:text-4xl">
            Gotowy, by uporządkować swoją mangową półkę?
          </h2>
          <p className="text-muted-foreground max-w-xl mx-auto">
            Załóż bezpłatne konto w kilkanaście sekund lub wypróbuj wersję demo, aby przekonać się, jak wygodne może być zarządzanie kolekcją.
          </p>

          <div className="flex flex-wrap justify-center gap-4">
            <Link href="/register">
              <Button size="lg" className="h-12 px-8 font-semibold shadow-lg shadow-primary/20">
                Zarejestruj się bezpłatnie
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
            <Button
              variant="outline"
              size="lg"
              onClick={handleDemoLogin}
              disabled={demoLoading}
              className="h-12 px-8 font-semibold glass-panel"
            >
              <Sparkles className="mr-2 h-4 w-4 text-primary" />
              {demoLoading ? 'Logowanie...' : 'Wypróbuj Demo'}
            </Button>
          </div>
        </div>
      </section>

      {/* ================= FOOTER ================= */}
      <footer className="border-t bg-muted/30 py-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <BookOpen className="h-4 w-4" />
            </div>
            <span className="font-bold text-sm">MangOwO</span>
          </div>

          <div className="flex flex-wrap gap-6 text-xs text-muted-foreground">
            <Link href="/about" className="hover:text-foreground transition-colors">
              O projekcie (/about)
            </Link>
            <Link href="/login" className="hover:text-foreground transition-colors">
              Logowanie
            </Link>
            <Link href="/register" className="hover:text-foreground transition-colors">
              Rejestracja
            </Link>
            <a href="#features" className="hover:text-foreground transition-colors">
              Funkcje
            </a>
          </div>

          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} MangOwO. Stworzone dla polskich kolekcjonerów.
          </p>
        </div>
      </footer>
    </div>
  )
}
