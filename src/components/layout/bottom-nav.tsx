'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { BookOpen, Compass, Users, User } from 'lucide-react'
import { cn } from '@/lib/utils'

const mobileNavItems = [
  { href: '/', label: 'Półka', icon: BookOpen },
  { href: '/search', label: 'Odkrywaj', icon: Compass },
  { href: '/friends', label: 'Społeczność', icon: Users },
  { href: '/profile', label: 'Profil', icon: User },
]

export function BottomNav() {
  const pathname = usePathname()

  return (
    <div className="fixed bottom-4 inset-x-0 z-50 px-6 md:hidden pointer-events-none">
      <nav className="mx-auto max-w-xs rounded-3xl border border-white/15 bg-[#0D1220]/95 px-3 py-2.5 backdrop-blur-2xl pointer-events-auto shadow-2xl shadow-black/80">
        <div className="flex items-center justify-around">
          {mobileNavItems.map((item) => {
            const Icon = item.icon
            const isActive = pathname === item.href
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex flex-col items-center gap-1 rounded-2xl px-3.5 py-1.5 transition-all duration-300',
                  isActive
                    ? 'border border-purple-500/60 bg-purple-950/50 text-purple-300 shadow-lg shadow-purple-500/25 ring-1 ring-purple-500/40'
                    : 'text-muted-foreground hover:text-white'
                )}
              >
                <Icon className={cn('h-5 w-5', isActive ? 'text-purple-300 stroke-[2.2]' : 'text-muted-foreground')} />
                <span className="text-[10px] font-bold">{item.label}</span>
              </Link>
            )
          })}
        </div>
      </nav>
    </div>
  )
}
