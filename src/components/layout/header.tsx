'use client'

import Link from 'next/link'
import { Menu } from 'lucide-react'
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet'
import { useState } from 'react'
import { MobileNav } from './mobile-nav'
import { Logo } from '@/components/brand/logo'

export function Header() {
  const [open, setOpen] = useState(false)

  return (
    <header className="sticky top-0 z-40 flex h-14 items-center border-b bg-background px-4 md:hidden">
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger className="mr-2 inline-flex h-9 w-9 items-center justify-center rounded-md hover:bg-muted">
          <Menu className="h-5 w-5" />
        </SheetTrigger>
        <SheetContent side="left" className="w-72 p-0">
          <MobileNav onNavigate={() => setOpen(false)} />
        </SheetContent>
      </Sheet>

      <Link href="/" aria-label="MangaHub.pl — strona główna">
        <Logo markClassName="h-8 w-8" textClassName="text-base" />
      </Link>
    </header>
  )
}
