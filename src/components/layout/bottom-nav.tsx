'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, BookOpen, Search, Users, User } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useFeature } from '@/components/ui-settings-provider'

const mobileNavItems = [
  { href: '/', label: 'Pulpit', icon: LayoutDashboard },
  { href: '/collection', label: 'Półka', icon: BookOpen },
  { href: '/search', label: 'Szukaj', icon: Search },
  { href: '/friends', label: 'Znajomi', icon: Users },
  { href: '/profile', label: 'Profil', icon: User },
]

export function BottomNav() {
  const pathname = usePathname()
  const communityEnabled = useFeature('community')
  const items = mobileNavItems.filter((item) => item.href !== '/friends' || communityEnabled)

  return (
    <div className="fixed bottom-3 inset-x-0 z-40 px-3 md:hidden pointer-events-none pb-[env(safe-area-inset-bottom,0px)]">
      <nav className="mx-auto max-w-sm rounded-2xl border border-white/15 bg-surface-2/95 px-1.5 py-1.5 backdrop-blur-2xl pointer-events-auto shadow-2xl shadow-black/90">
        <div className="grid items-center" style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` }}>
          {items.map((item) => {
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
                    ? 'bg-primary/10 text-primary'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                <Icon
                  className={cn(
                    'h-5 w-5',
                    isActive ? 'text-primary stroke-[2.3]' : 'text-muted-foreground'
                  )}
                />
                <span className="text-[11px] font-semibold truncate w-full text-center">
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
