'use client'

import Link from 'next/link'
import { Search } from 'lucide-react'
import { Logo } from '@/components/brand/logo'
import { NotificationBell } from '@/components/layout/notification-bell'

/** Pasek górny dla telefonów i tabletów: logo, szybkie wyszukiwanie i powiadomienia. Na lg+ działa DesktopTopNav. */
export function MobileTopBar() {
  return (
    <header className="sticky top-0 z-40 flex items-center justify-between gap-3 border-b border-border bg-surface-1/95 px-4 py-2.5 backdrop-blur-xl md:hidden">
      <Link href="/" aria-label="MangaHub.pl — strona główna">
        <Logo markClassName="h-8 w-8" textClassName="text-lg" />
      </Link>
      <div className="flex items-center gap-1">
        <Link
          href="/search"
          aria-label="Szukaj mangi"
          className="flex h-11 w-11 items-center justify-center rounded-full text-foreground hover:bg-muted"
        >
          <Search className="h-5 w-5" />
        </Link>
        <NotificationBell />
      </div>
    </header>
  )
}
