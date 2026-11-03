'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { Home, BookOpen, BarChart3, Search, User } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Logo } from '@/components/brand/logo'
import { AddSeriesButton } from '@/components/layout/add-series-button'
import { MoreMenu } from '@/components/layout/more-menu'

const tabletNavItems = [
  { href: '/', label: 'Główna', icon: Home },
  { href: '/collection', label: 'Półka', icon: BookOpen },
  { href: '/stats', label: 'Wykresy', icon: BarChart3 },
  { href: '/search', label: 'Szukaj', icon: Search },
  { href: '/profile', label: 'Profil', icon: User },
]

export function TabletSidebar() {
  const pathname = usePathname()
  const { data: session } = useSession()

  return (
    <aside className="hidden md:flex lg:hidden w-20 flex-col items-center justify-between border-r border-white/10 bg-surface-1/95 backdrop-blur-2xl py-5 z-40">
      {/* Top Logo */}
      <div className="flex flex-col items-center gap-6">
        <Link href="/" className="group">
          <Logo markOnly markClassName="h-11 w-11" />
        </Link>

        {/* Navigation icons */}
        <nav className="flex flex-col items-center gap-5">
          {tabletNavItems.map((item) => {
            const Icon = item.icon
            const isActive = pathname === item.href
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex flex-col items-center gap-1 rounded-xl p-2.5 transition-all duration-200',
                  isActive
                    ? 'bg-primary/10 text-primary'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                )}
              >
                <Icon className={cn('h-5 w-5', isActive && 'text-primary stroke-[2.5]')} />
                <span className="text-[11px] font-semibold">{item.label}</span>
              </Link>
            )
          })}
          <MoreMenu variant="stacked" side="right" />
        </nav>

        <AddSeriesButton variant="stacked" />
      </div>

      {/* Bottom Glowing Avatar */}
      <Link href="/profile" className="relative group">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-tr from-cyan-400 to-primary p-0.5 shadow-lg shadow-cyan-500/25">
          <div className="flex h-full w-full items-center justify-center rounded-full bg-surface-2 text-xs font-bold text-white">
            {session?.user?.name?.[0] || 'U'}
          </div>
        </div>
        <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-emerald-500 ring-2 ring-surface-1" />
      </Link>
    </aside>
  )
}
