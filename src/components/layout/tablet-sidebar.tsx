'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { Home, BookOpen, BarChart3, Search, User } from 'lucide-react'
import { cn } from '@/lib/utils'

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
    <aside className="hidden md:flex lg:hidden w-20 flex-col items-center justify-between border-r border-white/10 bg-[#090D16]/95 backdrop-blur-2xl py-5 z-40">
      {/* Top Logo */}
      <div className="flex flex-col items-center gap-6">
        <Link href="/" className="group">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-tr from-cyan-400 to-primary text-black font-extrabold shadow-lg shadow-primary/30">
            <BookOpen className="h-6 w-6" />
          </div>
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
                    ? 'bg-primary/20 text-primary ring-1 ring-primary/50 shadow-md shadow-primary/30'
                    : 'text-muted-foreground hover:bg-white/5 hover:text-white'
                )}
              >
                <Icon className={cn('h-5 w-5', isActive && 'text-primary stroke-[2.5]')} />
                <span className="text-[10px] font-medium">{item.label}</span>
              </Link>
            )
          })}
        </nav>
      </div>

      {/* Bottom Glowing Avatar */}
      <Link href="/profile" className="relative group">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-tr from-cyan-400 to-primary p-0.5 shadow-lg shadow-cyan-500/25">
          <div className="flex h-full w-full items-center justify-center rounded-full bg-[#0D121F] text-xs font-bold text-white">
            {session?.user?.name?.[0] || 'U'}
          </div>
        </div>
        <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-emerald-500 ring-2 ring-[#090D16]" />
      </Link>
    </aside>
  )
}
