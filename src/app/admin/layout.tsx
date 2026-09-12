'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, BookOpen, Calendar, Settings, Users, ArrowLeft } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Separator } from '@/components/ui/separator'

const adminNavItems = [
  { href: '/admin', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/admin/manga', label: 'Manga', icon: BookOpen },
  { href: '/admin/releases', label: 'Kalendarz Premier', icon: Calendar },
  { href: '/admin/publishers', label: 'Wydawcy', icon: Settings },
  { href: '/admin/users', label: 'Użytkownicy', icon: Users },
]

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Link
            href="/"
            className="mb-2 inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="mr-1 h-4 w-4" />
            Powrót
          </Link>
          <h1 className="text-2xl font-bold">Panel Administracyjny</h1>
        </div>
      </div>

      <div className="flex flex-col gap-6 md:flex-row">
        <nav className="flex gap-2 overflow-x-auto md:w-64 md:flex-col">
          {adminNavItems.map((item) => {
            const Icon = item.icon
            const isActive = pathname === item.href
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium whitespace-nowrap transition-colors',
                  isActive
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                )}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            )
          })}
        </nav>

        <Separator className="md:hidden" />

        <main className="flex-1">{children}</main>
      </div>
    </div>
  )
}
