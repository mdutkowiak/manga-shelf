'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Home,
  BookOpen,
  CalendarDays,
  ShoppingBag,
  Search,
  User,
  Users,
  UserPlus,
  BarChart3,
  Shield,
  Info,
  LogOut,
  Crown,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useSession, signOut } from 'next-auth/react'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'

const mainNavItems = [
  { href: '/', label: 'Główna', icon: Home },
  { href: '/collection', label: 'Moja Półka', icon: BookOpen },
  { href: '/calendar', label: 'Kalendarz Premier', icon: CalendarDays },
  { href: '/checklist', label: 'Lista Zakupów (Konwenty)', icon: ShoppingBag },
  { href: '/search', label: 'Szukaj w AniList', icon: Search },
  { href: '/stats', label: 'Wycena & Budżet', icon: BarChart3 },
  { href: '/friends', label: 'Znajomi', icon: UserPlus },
  { href: '/users', label: 'Kolekcjonerzy', icon: Users },
  { href: '/profile', label: 'Mój Profil', icon: User },
]

export function DesktopSidebar() {
  const pathname = usePathname()
  const { data: session } = useSession()

  return (
    <aside className="hidden w-64 flex-col border-r border-border/70 bg-sidebar/95 backdrop-blur-xl md:flex">
      {/* Brand Header */}
      <div className="flex h-16 items-center border-b border-border/70 px-5">
        <Link href="/" className="flex items-center gap-3 group">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-primary to-cyan-400 text-primary-foreground shadow-lg shadow-primary/30 transition-transform group-hover:scale-105">
            <BookOpen className="h-5 w-5" />
          </div>
          <div className="flex flex-col">
            <span className="font-extrabold tracking-tight text-base gradient-text">MangOwO</span>
            <span className="text-[9px] uppercase font-bold tracking-widest text-cyan-400 -mt-0.5">
              Tracker & Rynek PL
            </span>
          </div>
        </Link>
      </div>

      {/* Navigation items */}
      <nav className="flex-1 space-y-1.5 p-3.5 overflow-y-auto">
        <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground/80">
          Nawigacja
        </div>

        {mainNavItems.map((item) => {
          const Icon = item.icon
          const isActive = pathname === item.href
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium transition-all duration-200',
                isActive
                  ? 'bg-primary text-primary-foreground font-bold shadow-lg shadow-primary/30 ring-1 ring-primary/60'
                  : 'text-muted-foreground hover:bg-muted/70 hover:text-foreground'
              )}
            >
              <Icon
                className={cn(
                  'h-4 w-4 transition-colors',
                  isActive ? 'text-primary-foreground stroke-[2.5]' : 'text-muted-foreground'
                )}
              />
              <span>{item.label}</span>
            </Link>
          )
        })}

        <Separator className="my-3 opacity-50" />

        <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground/80">
          Informacje
        </div>

        <Link
          href="/about"
          className={cn(
            'flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium transition-all duration-200',
            pathname === '/about'
              ? 'bg-primary text-primary-foreground font-bold shadow-md shadow-primary/25'
              : 'text-muted-foreground hover:bg-muted/70 hover:text-foreground'
          )}
        >
          <Info className="h-4 w-4" />
          <span>O projekcie (/about)</span>
        </Link>

        {session?.user?.role === 'ADMIN' && (
          <>
            <Separator className="my-3 opacity-50" />
            <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground/80">
              Administracja
            </div>
            <Link
              href="/admin"
              className={cn(
                'flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium transition-all duration-200',
                pathname.startsWith('/admin')
                  ? 'bg-primary text-primary-foreground font-bold shadow-md'
                  : 'text-muted-foreground hover:bg-muted/70 hover:text-foreground'
              )}
            >
              <Shield className="h-4 w-4" />
              <span>Panel Admina</span>
            </Link>
          </>
        )}
      </nav>

      {/* User Collector Profile Card at Bottom */}
      <div className="border-t border-border/70 p-3 bg-muted/20">
        {session?.user ? (
          <div className="flex items-center justify-between gap-2 rounded-xl p-2 bg-background/60 border border-border/60 shadow-sm">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-tr from-primary to-cyan-500 text-primary-foreground font-bold text-xs uppercase shadow-md">
                {session.user.name?.[0] || 'U'}
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-xs font-bold truncate">
                  {session.user.name || session.user.email}
                </span>
                <span className="text-[10px] text-cyan-400 font-semibold flex items-center gap-1">
                  <Crown className="h-2.5 w-2.5 text-amber-400" />
                  LVL 14 Collector
                </span>
              </div>
            </div>

            <Button
              variant="ghost"
              size="icon"
              onClick={() => signOut()}
              title="Wyloguj się"
              className="h-8 w-8 text-muted-foreground hover:text-destructive shrink-0"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            <Link href="/login">
              <Button size="sm" className="w-full text-xs font-bold shadow-md shadow-primary/20">
                Zaloguj się
              </Button>
            </Link>
          </div>
        )}
      </div>
    </aside>
  )
}
