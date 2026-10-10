'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, BookOpen, Search, Users, User } from 'lucide-react'
import { cn } from '@/lib/utils'

const mobileNavItems = [
  { href: '/', label: 'Pulpit', icon: LayoutDashboard },
  { href: '/collection', label: 'Półka', icon: BookOpen },
  { href: '/search', label: 'Szukaj', icon: Search },
  { href: '/friends', label: 'Społeczność', icon: Users },
  { href: '/profile', label: 'Profil', icon: User },
]

export function BottomNav() {
  const pathname = usePathname()

  return (
    <div className="fixed bottom-3 inset-x-0 z-40 px-3 md:hidden pointer-events-none pb-[env(safe-area-inset-bottom,0px)]">
      <nav className="mx-auto max-w-sm rounded-2xl border border-white/15 bg-[#0D1220]/95 px-1.5 py-1.5 backdrop-blur-2xl pointer-events-auto shadow-2xl shadow-black/90">
        <div className="grid grid-cols-5 items-center">
          {mobileNavItems.map((item) => {
            const Icon = item.icon
            const isActive =
              item.href === '/'
                ? pathname === '/'
                : pathname.startsWith(item.href)

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex flex-col items-center justify-center gap-0.5 rounded-xl py-1.5 px-1 transition-all duration-200',
                  isActive
                    ? 'border border-purple-500/50 bg-purple-950/60 text-purple-300 shadow-md shadow-purple-500/20 ring-1 ring-purple-500/30'
                    : 'text-muted-foreground hover:text-white'
                )}
              >
                <Icon
                  className={cn(
                    'h-4 w-4',
                    isActive ? 'text-purple-300 stroke-[2.3]' : 'text-muted-foreground'
                  )}
                />
                <span className="text-[9px] font-bold tracking-tight truncate w-full text-center">
                  {item.label}
                </span>
              </Link>
            )
          })}
        </div>
      </nav>
    </div>
  )
}
