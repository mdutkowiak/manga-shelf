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
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useSession, signOut } from 'next-auth/react'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { NotificationBell } from '@/components/layout/notification-bell'

const navItems = [
  { href: '/', label: 'Główna', icon: Home },
  { href: '/collection', label: 'Moja Kolekcja', icon: BookOpen },
  { href: '/calendar', label: 'Kalendarz Premier', icon: CalendarDays },
  { href: '/checklist', label: 'Lista Zakupów (Konwenty)', icon: ShoppingBag },
  { href: '/search', label: 'Szukaj Mangi', icon: Search },
  { href: '/stats', label: 'Statystyki & Finanse', icon: BarChart3 },
  { href: '/friends', label: 'Znajomi', icon: UserPlus },
  { href: '/users', label: 'Użytkownicy', icon: Users },
  { href: '/profile', label: 'Mój Profil', icon: User },
]

interface MobileNavProps {
  onNavigate?: () => void
}

export function MobileNav({ onNavigate }: MobileNavProps) {
  const pathname = usePathname()
  const { data: session } = useSession()

  return (
    <div className="flex h-full flex-col bg-background">
      <div className="flex h-16 items-center justify-between border-b px-5">
        <Link href="/" className="flex items-center gap-2 font-bold text-lg" onClick={onNavigate}>
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <BookOpen className="h-4 w-4" />
          </div>
          <span className="gradient-text font-extrabold">MangOwO</span>
        </Link>
        <NotificationBell />
      </div>


      <nav className="flex-1 space-y-1 p-4 overflow-y-auto">
        <div className="px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          Menu główne
        </div>

        {navItems.map((item) => {
          const Icon = item.icon
          const isActive = pathname === item.href
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              className={cn(
                'flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-primary text-primary-foreground font-semibold shadow-sm'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              )}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </Link>
          )
        })}

        <Separator className="my-3 opacity-60" />

        <div className="px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          O aplikacji
        </div>

        <Link
          href="/about"
          onClick={onNavigate}
          className={cn(
            'flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium transition-colors',
            pathname === '/about'
              ? 'bg-primary text-primary-foreground font-semibold shadow-sm'
              : 'text-muted-foreground hover:bg-muted hover:text-foreground'
          )}
        >
          <Info className="h-4 w-4" />
          O projekcie (/about)
        </Link>

        {session?.user?.role === 'ADMIN' && (
          <>
            <Separator className="my-3 opacity-60" />
            <div className="px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Administracja
            </div>
            <Link
              href="/admin"
              onClick={onNavigate}
              className={cn(
                'flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium transition-colors',
                pathname.startsWith('/admin')
                  ? 'bg-primary text-primary-foreground font-semibold shadow-sm'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              )}
            >
              <Shield className="h-4 w-4" />
              Panel Admina
            </Link>
          </>
        )}
      </nav>

      {/* User info at bottom */}
      <div className="border-t p-4 bg-muted/20">
        {session?.user ? (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5 min-w-0">
              {session.user.image || session.user.avatar ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={(session.user.image || session.user.avatar) as string}
                  alt="Avatar"
                  referrerPolicy="no-referrer"
                  className="h-8 w-8 rounded-full object-cover border border-white/20 shrink-0"
                />
              ) : (
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/20 text-primary font-bold text-xs shrink-0">
                  {session.user.name?.[0] || 'U'}
                </div>
              )}
              <div className="flex flex-col min-w-0">
                <span className="text-sm font-semibold truncate text-white">
                  {session.user.name || session.user.email}
                </span>
                <span className="text-xs text-muted-foreground">{session.user.role || 'Użytkownik'}</span>
              </div>
            </div>
            <Button variant="ghost" size="icon" onClick={() => signOut()} className="h-8 w-8 shrink-0">
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          <div className="flex gap-2">
            <Link href="/login" className="w-full" onClick={onNavigate}>
              <Button size="sm" className="w-full text-xs">
                Zaloguj się
              </Button>
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}
